import { FormEvent, useState } from 'react';
import './TeacherBookSearchPanel.css';

type Book = { title: string; authors?: string; publisher?: string; isbn?: string; cover_url?: string; source?: string };
type SearchResponse = { items?: Book[] };
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

export function TeacherBookSearchPanel() {
  const [keyword, setKeyword] = useState('규칙');
  const [items, setItems] = useState<Book[] | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  async function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = keyword.trim();
    if (!query) return;
    setStatus('loading'); setItems(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/books/search?keyword=${encodeURIComponent(query)}&age=5&limit=6`);
      if (!response.ok) throw new Error(`book-search-${response.status}`);
      const data = await response.json() as SearchResponse;
      setItems(Array.isArray(data.items) ? data.items : []); setStatus('idle');
    } catch { setStatus('error'); }
  }

  return <section className="teacher-book-search" aria-labelledby="teacher-book-search-title">
    <div className="teacher-book-search__heading"><div><span className="teacher-kicker">도서관 정보나루 실제 도서 조회</span><h2 id="teacher-book-search-title">놀이 주제로 도서 찾아보기</h2><p>누리과정 근거 검색과 별도로, 도서관 정보나루에서 제공하는 도서 정보를 조회합니다.</p></div></div>
    <form className="teacher-book-search__form" onSubmit={search}><label htmlFor="teacher-book-keyword">찾을 주제</label><input id="teacher-book-keyword" value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="예: 규칙, 수 세기" /><button type="submit" disabled={status === 'loading'}>{status === 'loading' ? '찾는 중…' : '도서 찾기'}</button></form>
    <p className="teacher-book-search__notice">조회된 도서는 정보나루 검색 결과이며, 교육적으로 검증된 추천도서를 뜻하지 않습니다.</p>
    {status === 'error' && <p className="teacher-book-search__state" role="alert">도서관 정보나루 조회에 실패했습니다. 누리과정 근거 검색은 계속 사용할 수 있습니다.</p>}
    {items !== null && items.length === 0 && <p className="teacher-book-search__state">검색 결과가 없습니다.</p>}
    {items && items.length > 0 && <ul className="teacher-book-search__results" aria-live="polite">{items.map((book, index) => <li key={`${book.isbn ?? book.title}-${index}`}>{book.cover_url && <img src={book.cover_url} alt="" onError={event => { event.currentTarget.hidden = true; }} />}<div><strong>{book.title}</strong><span>{[book.authors, book.publisher].filter(Boolean).join(' ? ') || '저자·출판사 정보 없음'}</span>{book.isbn && <small>ISBN {book.isbn}</small>}<small>{book.source ?? '도서관 정보나루'}</small></div></li>)}</ul>}
  </section>;
}
