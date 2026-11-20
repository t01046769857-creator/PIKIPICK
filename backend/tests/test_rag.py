import unittest

from backend.rag import NuriRagService


class NuriRagTests(unittest.TestCase):
    def test_nuri_rag_manifest_uses_four_local_source_pdfs(self):
        service = NuriRagService()
        manifest = service.health()["manifest"]
        self.assertIsNotNone(manifest)
        self.assertEqual(manifest["status"], "ready")
        self.assertEqual(len(manifest["documents"]), 4)
        self.assertEqual(sum(item["page_count"] for item in manifest["documents"]), 573)
        self.assertTrue(all(len(item["file_sha256"]) == 64 for item in manifest["documents"]))

    def test_nuri_rag_search_returns_real_chunk_metadata(self):
        result = NuriRagService().search("누리과정의 구성 방향", limit=3)
        self.assertTrue(result["results"])
        source = result["results"][0]
        self.assertIn(source["document_type"], {"notice", "explanation", "play_understanding", "play_implementation"})
        self.assertGreaterEqual(source["pdf_page_number"], 1)
        self.assertTrue(source["file_sha256"])
