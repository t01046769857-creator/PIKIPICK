import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LxpAdventurePreview } from './preview/LxpAdventurePreview';
import './preview/LxpAdventurePreview.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode><LxpAdventurePreview /></StrictMode>,
);
