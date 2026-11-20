# 2019 개정 누리과정 RAG

원본 PDF는 `data/nuri_pdfs/`에 보관하며 Git에서는 제외한다. 인덱스도 `data/rag_store/`에만 생성된다.

## 실행

```powershell
cd C:\Users\mbc\Desktop\PIKIPICK
.\backend\.venv\Scripts\python.exe -m uvicorn backend.main:app --reload --port 8000
```

`backend/.env`에 아래 경로를 설정한다. 실제 API 키는 `.env`에만 둔다.

```env
RAG_PDF_DIR=../data/nuri_pdfs
RAG_VECTOR_STORE_DIR=../data/rag_store
RAG_INDEX_ENABLED=1
```

승인된 개발 환경에서만 `POST /api/rag/index`로 색인한다. 일반 실행에서는 `RAG_INDEX_ENABLED=0`을 유지한다.

## API

- `GET /api/rag/health`: PDF 4종, manifest, 인덱스 상태
- `POST /api/rag/index`: 원본 PDF 추출·청크·FAISS 색인
- `POST /api/rag/search`: 문서 유형·쪽·발췌문이 포함된 실제 벡터 검색
- `POST /api/rag/analyze-play`: 관찰 문장과 실제 검색 근거를 분리해 반환

현재 기본 임베딩은 `local-hash-embedding-v1`이다. 이는 로컬 검색 검증용이며, 승인된 임베딩 API가 제공되면 `EMBEDDING_PROVIDER`, `EMBEDDING_MODEL`, `EMBEDDING_API_KEY` 설정과 전용 어댑터를 추가한 뒤 반드시 재색인해야 한다. LLM 설정이 없으면 `analyze-play`은 생성형 해석을 만들지 않는다.

## 실제 색인 결과

2026-11-20 기준 원본 PDF 4종, 총 573 PDF 페이지를 확인했고 598개 청크를 만들었다. manifest에는 각 원본의 SHA-256, 페이지 수, 텍스트 누락·추출 불가 페이지를 기록한다. 인쇄 페이지 번호는 PDF만으로 확인되지 않아 `printed_page_label`을 임의로 채우지 않는다.
