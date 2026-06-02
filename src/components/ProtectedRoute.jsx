import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Spinner from './Spinner'

// Wraps protected routes. While the session is resolving we show a spinner;
// once resolved, unauthenticated users are redirected to /login.
export default function ProtectedRoute({ children }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label="Loading…" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}
