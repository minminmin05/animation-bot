import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import DashboardLayout from './layouts/DashboardLayout'
import CentralLayout from './layouts/CentralLayout'

// Auth Pages
import LoginPage from './pages/auth/LoginPage'
import SignupPage from './pages/auth/SignupPage'

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard'
import StudentGrades from './pages/student/StudentGrades'
import StudentSchedule from './pages/student/StudentSchedule'
import StudentProfile from './pages/student/StudentProfile'

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard'
import TeacherClasses from './pages/teacher/TeacherClasses'
import TeacherGrades from './pages/teacher/TeacherGrades'
import TeacherAssignments from './pages/teacher/TeacherAssignments'
import TeacherProfile from './pages/teacher/TeacherProfile'

// Parent Pages
import ParentDashboard from './pages/parent/ParentDashboard'
import ChildGrades from './pages/parent/ChildGrades'
import Attendance from './pages/parent/Attendance'
import ParentProfile from './pages/parent/ParentProfile'

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard'
import UserManagement from './pages/admin/UserManagement'
import StudentManagement from './pages/admin/StudentManagement'
import ClassManagement from './pages/admin/ClassManagement'

// Central System Pages
import CentralDashboard from './pages/central/CentralDashboard'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/signup"
            element={
              <PublicRoute>
                <SignupPage />
              </PublicRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/*"
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StudentDashboard />} />
            <Route path="grades" element={<StudentGrades />} />
            <Route path="schedule" element={<StudentSchedule />} />
            <Route path="profile" element={<StudentProfile />} />
            <Route path="" element={<Navigate to="/student/dashboard" replace />} />
          </Route>

          {/* Teacher Routes */}
          <Route
            path="/teacher/*"
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<TeacherDashboard />} />
            <Route path="classes" element={<TeacherClasses />} />
            <Route path="grades" element={<TeacherGrades />} />
            <Route path="assignments" element={<TeacherAssignments />} />
            <Route path="profile" element={<TeacherProfile />} />
            <Route path="" element={<Navigate to="/teacher/dashboard" replace />} />
          </Route>

          {/* Parent Routes */}
          <Route
            path="/parent/*"
            element={
              <ProtectedRoute allowedRoles={['parent']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<ParentDashboard />} />
            <Route path="child-grades" element={<ChildGrades />} />
            <Route path="attendance" element={<Attendance />} />
            <Route path="profile" element={<ParentProfile />} />
            <Route path="" element={<Navigate to="/parent/dashboard" replace />} />
          </Route>

          {/* Admin Routes with Central Layout */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'owner']}>
                <CentralLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="central" element={<CentralDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="students" element={<StudentManagement />} />
            <Route path="classes" element={<ClassManagement />} />
            <Route path="teachers" element={<div className="p-6"><h1 className="text-2xl font-bold">Teacher Management - Coming Soon</h1></div>} />
            <Route path="academic" element={<div className="p-6"><h1 className="text-2xl font-bold">Academic Settings - Coming Soon</h1></div>} />
            <Route path="grading" element={<div className="p-6"><h1 className="text-2xl font-bold">Grading Settings - Coming Soon</h1></div>} />
            <Route path="facilities" element={<div className="p-6"><h1 className="text-2xl font-bold">School Facilities - Coming Soon</h1></div>} />
            <Route path="links" element={<div className="p-6"><h1 className="text-2xl font-bold">System Links - Coming Soon</h1></div>} />
            <Route path="settings" element={<div className="p-6"><h1 className="text-2xl font-bold">Admin Settings - Coming Soon</h1></div>} />
            <Route path="system" element={<div className="p-6"><h1 className="text-2xl font-bold">System Settings - Coming Soon</h1></div>} />
            <Route path="" element={<Navigate to="/admin/dashboard" replace />} />
          </Route>

          {/* Default Route */}
          <Route path="/" element={<Navigate to="/login" replace />} />

          {/* Catch All Route */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
