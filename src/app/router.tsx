import { createBrowserRouter } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import InstructorDashboard from '../pages/InstructorDashboard'
import SessionsPage from '../pages/SessionsPage'
import CreateSessionPage from '../pages/CreateSessionPage'
import LiveDashboardPage from '../pages/LiveDashboardPage'
import StudentJoinPage from '../pages/StudentJoinPage'
import StudentAnswerPage from '../pages/StudentAnswerPage'
import IssueTrackerPage from '../pages/IssueTrackerPage'
import ImprovementTimelinePage from '../pages/ImprovementTimelinePage'
import EvidenceReportPage from '../pages/EvidenceReportPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <InstructorDashboard /> },
      { path: 'sessions', element: <SessionsPage /> },
      { path: 'sessions/new', element: <CreateSessionPage /> },
      { path: 'sessions/:sessionId/dashboard', element: <LiveDashboardPage /> },
      { path: 'issues', element: <IssueTrackerPage /> },
      { path: 'timeline', element: <ImprovementTimelinePage /> },
      { path: 'evidence', element: <EvidenceReportPage /> },
    ],
  },
  // Public routes (no shell)
  { path: '/join', element: <StudentJoinPage /> },
  { path: '/join/:code', element: <StudentAnswerPage /> },
])
