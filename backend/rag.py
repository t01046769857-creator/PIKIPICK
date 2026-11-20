"""2019 개정 누리과정 원본 PDF용 로컬 RAG 인덱스와 검색 서비스."""

from __future__ import annotations

from dataclasses import asdict, dataclass
import hashlib
import json
import os
from pathlib import Path
import re
from typing import Any

import faiss
import pymupdf
import numpy as np
from langchain_text_splitters import RecursiveCharacterTextSplitter

from .settings import Settings


class RagError(Exception):
    def __init__(self, code: str, detail: str):
        self.code = code
        self.detail = detail
        super().__init__(detail)


@dataclass(frozen=True)
class SourceDocument:
    document_id: str
    document_title: str
    document_type: str
    path: Path


DOCUMENTS = (
    SourceDocument("nuri-2019-notice", "2019 개정 누리과정 고시문", "notice", Path("2019 개정 누리과정 고시문-교육부-확인용.pdf")),
    SourceDocument("nuri-explanation", "누리과정 해설서", "explanation", Path("누리과정(해설서)-확인용 (1).pdf")),
    SourceDocument("nuri-play-understanding", "누리과정 놀이이해자료", "play_understanding", Path("누리과정(놀이이해자료)-저용량.pdf")),
    SourceDocument("nuri-play-implementation", "누리과정 놀이실행자료", "play_implementation", Path("누리과정(놀이실행자료)-저용량.pdf")),
)


def _tokens(text: str):
    return re.findall(r"[가-힣A-Za-z0-9]{2,}", text.casefold())


class LocalHashEmbeddings:
    """외부 API가 준비되기 전에도 실제 벡터 검색을 검증하기 위한 결정적 로컬 임베딩."""

    model_name = "local-hash-embedding-v1"
    dimension = 1024

    def embed(self, texts: list[str]) -> np.ndarray:
        vectors = np.zeros((len(texts), self.dimension), dtype="float32")
        for row, text in enumerate(texts):
            words = _tokens(text)
            for token in words:
                digest = hashlib.blake2b(token.encode("utf-8"), digest_size=8).digest()
                bucket = int.from_bytes(digest[:4], "little") % self.dimension
                vectors[row, bucket] += -1.0 if digest[4] & 1 else 1.0
        faiss.normalize_L2(vectors)
        return vectors


class NuriRagService:
    def __init__(self, settings: Settings | None = None):
        self.settings = settings or Settings.from_env()
        self.pdf_dir = Path(self.settings.rag_pdf_dir)
        self.store_dir = Path(self.settings.rag_vector_store_dir)
        self.embedder = LocalHashEmbeddings()
        self._index: faiss.Index | None = None
        self._chunks: list[dict[str, Any]] | None = None

    @property
    def manifest_path(self): return self.store_dir / "manifest.json"

    @property
    def index_path(self): return self.store_dir / "nuri.faiss"

    @property
    def chunks_path(self): return self.store_dir / "chunks.json"

    def health(self):
        files = []
        for document in DOCUMENTS:
            path = self.pdf_dir / document.path
            files.append({"document_id": document.document_id, "document_type": document.document_type,
                          "present": path.is_file(), "filename": document.path.name})
        manifest = self._read_manifest()
        return {"pdf_directory": str(self.pdf_dir), "vector_store_directory": str(self.store_dir),
                "documents": files, "document_count": sum(item["present"] for item in files),
                "indexed": bool(manifest and manifest.get("status") == "ready" and self.index_path.is_file() and self.chunks_path.is_file()), "manifest": manifest,
                "embedding_model": self.embedder.model_name,
                "llm_ready": bool(self.settings.llm_api_key and self.settings.llm_model)}

    def index_documents(self):
        missing = [item.path.name for item in DOCUMENTS if not (self.pdf_dir / item.path).is_file()]
        if missing:
            raise RagError("rag_pdf_missing", "Missing required Nuri curriculum PDFs: " + ", ".join(missing))
        splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=150,
                                                   separators=["\n\n", "\n", ". ", " ", ""])
        chunks: list[dict[str, Any]] = []
        documents = []
        for source in DOCUMENTS:
            path = self.pdf_dir / source.path
            sha256 = self._sha256(path)
            pdf = pymupdf.open(path)
            missing_pages = []
            unusable_text_pages = []
            for page_index, page in enumerate(pdf):
                text = "\n".join(line.strip() for line in page.get_text("text").splitlines() if line.strip())
                if not text:
                    missing_pages.append(page_index + 1)
                    continue
                if not self._has_usable_korean_text(text):
                    unusable_text_pages.append(page_index + 1)
                    continue
                for ordinal, part in enumerate(splitter.split_text(text)):
                    chunk_id = f"{source.document_id}:p{page_index + 1}:c{ordinal + 1}"
                    chunks.append({"chunk_id": chunk_id, "text": part, "document_id": source.document_id,
                                   "document_title": source.document_title, "document_type": source.document_type,
                                   "original_filename": source.path.name, "file_sha256": sha256,
                                   "pdf_page_index": page_index, "pdf_page_number": page_index + 1,
                                   "printed_page_label": None, "chapter": None, "section": None,
                                   "curriculum_area": None, "content_category": None, "content_item": None})
            documents.append({"document_id": source.document_id, "document_title": source.document_title,
                              "document_type": source.document_type, "original_filename": source.path.name,
                              "file_sha256": sha256, "page_count": len(pdf), "text_missing_pages": missing_pages,
                              "text_unusable_pages": unusable_text_pages})
            pdf.close()
        if not chunks:
            manifest = {"schema_version": 1, "status": "text_unusable", "embedding_model": self.embedder.model_name,
                        "chunk_count": 0, "documents": documents,
                        "message": "PDF text extraction did not produce usable Korean text; OCR or source PDF text restoration is required."}
            self.store_dir.mkdir(parents=True, exist_ok=True)
            self.manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
            raise RagError("rag_pdf_text_unusable", "PDF text extraction did not produce usable Korean text")
        vectors = self.embedder.embed([chunk["text"] for chunk in chunks])
        index = faiss.IndexFlatIP(self.embedder.dimension)
        index.add(vectors)
        self.store_dir.mkdir(parents=True, exist_ok=True)
        faiss.write_index(index, str(self.index_path))
        self.chunks_path.write_text(json.dumps(chunks, ensure_ascii=False), encoding="utf-8")
        manifest = {"schema_version": 1, "status": "ready", "embedding_model": self.embedder.model_name, "chunk_size": 1000,
                    "chunk_overlap": 150, "chunk_count": len(chunks), "documents": documents}
        self.manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
        self._index, self._chunks = index, chunks
        return manifest

    def search(self, query: str, limit: int = 5, document_type: str | None = None):
        index, chunks = self._load()
        vector = self.embedder.embed([query])
        distances, indexes = index.search(vector, min(max(limit * 4, limit), len(chunks)))
        results = []
        for score, row in zip(distances[0], indexes[0]):
            if row < 0: continue
            chunk = chunks[int(row)]
            if document_type and chunk["document_type"] != document_type: continue
            results.append({**chunk, "score": round(float(score), 4), "snippet": chunk["text"][:500]})
            if len(results) == limit: break
        return {"query": query, "results": results, "evidence_insufficient": not results}

    def analyze_play(self, observation: str):
        search = self.search(observation, limit=5)
        matches = [{"area": item["curriculum_area"], "content_category": item["content_category"],
                    "content_item": item["content_item"], "reason": "관찰 문장과 실제 검색된 누리과정 근거의 어휘가 연결됩니다.",
                    "sources": [{"document_title": item["document_title"], "document_type": item["document_type"],
                                 "pdf_page_number": item["pdf_page_number"], "printed_page_label": item["printed_page_label"],
                                 "snippet": item["snippet"]}]} for item in search["results"]]
        return {"observation": observation, "evidence_level": "observation", "curriculum_matches": matches,
                "teacher_interpretation": None, "interpretation_status": "llm_not_configured",
                "limitations": ["현재 생성형 AI API 설정이 없어 근거 검색 결과만 반환합니다.", "관찰되지 않은 행동이나 발달 수준을 추정하지 않습니다."],
                "evidence_insufficient": search["evidence_insufficient"]}

    def _load(self):
        manifest = self._read_manifest()
        if manifest and manifest.get("status") != "ready":
            raise RagError("rag_pdf_text_unusable", "PDF text extraction requires restoration before search")
        if self._index is None or self._chunks is None:
            if not self.index_path.is_file() or not self.chunks_path.is_file():
                raise RagError("rag_not_indexed", "Nuri curriculum PDFs have not been indexed")
            self._index = faiss.read_index(str(self.index_path))
            self._chunks = json.loads(self.chunks_path.read_text(encoding="utf-8"))
        return self._index, self._chunks

    def _read_manifest(self):
        return json.loads(self.manifest_path.read_text(encoding="utf-8")) if self.manifest_path.is_file() else None

    @staticmethod
    def _sha256(path: Path):
        digest = hashlib.sha256()
        with path.open("rb") as file:
            for block in iter(lambda: file.read(1024 * 1024), b""): digest.update(block)
        return digest.hexdigest()

    @staticmethod
    def _has_usable_korean_text(text: str):
        korean = sum("가" <= char <= "힣" for char in text)
        return korean >= 8 and korean / max(len(text), 1) >= 0.03
