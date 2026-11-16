import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App, { phaseForPlayPath } from './App';
import { TeacherChildAccessBlocked, TeacherDashboard, TeacherLogin } from './components/TeacherPortal';
import { TeacherDemoDashboard } from './components/TeacherDemoDashboard';
import './styles.css';

const pathname = window.location.pathname;
const page = pathname === '/teacher/login' ? <TeacherLogin />
  : pathname === '/teacher/dashboard' ? <TeacherDashboard />
  : pathname === '/teacher/demo/child' ? <TeacherDemoDashboard />
  : pathname.startsWith('/teacher/children/') ? <TeacherChildAccessBlocked />
  : <App initialPhase={phaseForPlayPath(pathname)} />;

createRoot(document.getElementById('root')!).render(<StrictMode>{page}</StrictMode>);
