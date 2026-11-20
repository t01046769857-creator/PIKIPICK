import { useState } from 'react';
import './TeacherRagPanel.css';

type Result = { curriculum_matches: { reason: string; sources: { document_title: string; document_type: string; pdf_page_number: number; snippet: string }[] }[]; limitations: string[]; evidence_insufficient: boolean };

export function TeacherRagPanel() {
  const [observation, setObservation] = useState('규칙 연습에서 피키의 손을 보고 다시 선택했어요.');
  const [result, setResult] = useState<Result | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'unavailable'>('idle');
  const analyze = async () => {
    setStatus('loading'); setResult(null);
    try {
      const response = await fetch('http://localhost:8000/api/rag/analyze-play', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ observation }) });
      if (!response.ok) throw new Error('unavailable');
      setResult(await response.json()); setStatus('idle');
    } catch { setStatus('unavailable'); }
  };
  return <section className="teacher-rag" aria-labelledby="teacher-rag-title"><div><span className="teacher-kicker">누리과정 근거 검색</span><h2 id="teacher-rag-title">관찰 기록과 연결해 보기</h2><p>실제 원본 PDF에서 검색된 근거와 교사 관찰을 분리해 보여 줍니다.</p></div><label>관찰 기록<textarea value={observation} onChange={event => setObservation(event.target.value)} maxLength={4000} /></label><button type="button" onClick={analyze} disabled={status === 'loading'}>{status === 'loading' ? '근거 찾는 중…' : '근거 찾기'}</button>{status === 'unavailable' && <p className="teacher-rag__error">RAG 서버 또는 인덱스를 확인할 수 없습니다. 근거가 없는 분석 결과를 대신 표시하지 않습니다.</p>}{result && <div className="teacher-rag__result">{result.evidence_insufficient ? <p>연결할 근거를 찾지 못했습니다.</p> : result.curriculum_matches.map((match, index) => <article key={index}><strong>{match.reason}</strong>{match.sources.map(source => <details key={`${source.document_title}-${source.pdf_page_number}`}><summary>{source.document_title} · PDF {source.pdf_page_number}쪽 · {source.document_type}</summary><p>{source.snippet}</p></details>)}</article>)}<p>{result.limitations[0]}</p></div>}</section>;
}
