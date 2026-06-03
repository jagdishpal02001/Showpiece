import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import ProtectedRoute from './components/ProtectedRoute'
import Spinner from './components/Spinner'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import ProductForm from './pages/ProductForm'
import PublicProduct from './pages/PublicProduct'
import PublicProducts from './pages/PublicProducts'
import NotFound from './pages/NotFound'

// "/" sends the owner to the dashboard when logged in, otherwise to /login.
function Index() {
  const { session, loading } = useAuth()
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  return <Navigate to={session ? '/dashboard' : '/login'} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/new"
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/product/:id/edit"
          element={
            <ProtectedRoute>
              <ProductForm />
            </ProtectedRoute>
          }
        />

        {/* Public, no auth */}
        <Route path="/products" element={<PublicProducts />} />
        <Route path="/p" element={<Navigate to="/products" replace />} />
        <Route path="/p/:id" element={<PublicProduct />} />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  )
}
