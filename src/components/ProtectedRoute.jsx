import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Spinner } from './Spinner'

const roleRoutes = {
  student: '/student/dashboard',
  teacher: '/teacher/dashboard',
  parent: '/parent/dashboard',
  admin: '/admin/dashboard'
}

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner size="large" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If roles are specified, check if user's role is allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = roleRoutes[userRole] || '/login'
    return <Navigate to={redirectPath} replace />
  }

  return children
}

export const PublicRoute = ({ children }) => {
  const { user, userRole, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner size="large" />
      </div>
    )
  }

  if (user) {
    // Redirect to appropriate dashboard based on role
    const redirectPath = roleRoutes[userRole] || '/login'
    return <Navigate to={redirectPath} replace />
  }

  return children
}
