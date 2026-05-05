import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { LayoutDashboard, BarChart2, Calendar, FileText, User, BookOpen, Edit3, CheckCircle, Bell, Settings, LogOut, Menu, X } from 'lucide-react'

const sidebarLinks = {
  student: [
    { path: '/student/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/student/grades', label: 'My Grades', icon: BarChart2 },
    { path: '/student/schedule', label: 'Schedule', icon: Calendar },
    { path: '/student/report-card', label: 'Report Card', icon: FileText },
    { path: '/student/profile', label: 'Profile', icon: User }
  ],
  teacher: [
    { path: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/teacher/classes', label: 'My Classes', icon: BookOpen },
    { path: '/teacher/grades', label: 'Manage Grades', icon: BarChart2 },
    { path: '/teacher/assignments', label: 'Assignments', icon: Edit3 },
    { path: '/teacher/profile', label: 'Profile', icon: User }
  ],
  parent: [
    { path: '/parent/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/parent/child-grades', label: 'Child Grades', icon: BarChart2 },
    { path: '/parent/attendance', label: 'Attendance', icon: CheckCircle },
    { path: '/parent/profile', label: 'Profile', icon: User }
  ]
}

const DashboardLayout = () => {
  const { user, userRole, profileData, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true)
    }
  }, [])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const links = sidebarLinks[userRole] || []

  const roleLabels = {
    student: 'Student Portal',
    teacher: 'Teacher Portal',
    parent: 'Parent Portal'
  }

  return (
    <div className="min-h-screen bg-cream bg-dots">
      {/* Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-navy/10 z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-4 left-0 z-50 h-[calc(100vh-2rem)] transition-all duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
        } lg:translate-x-0 lg:w-72`}
      >
        <div className="h-full flex flex-col">
          {/* Clean Sidebar - No Glassmorphism */}
          <div className="flex-1 bg-white rounded-2xl shadow-soft border border-cream-dark overflow-hidden flex flex-col">
            {/* Logo Section */}
            <Link
              to={`/${userRole}/dashboard`}
              className="flex items-center gap-3 p-6 border-b border-cream-dark hover:bg-cream/30 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="w-11 h-11 bg-navy rounded-xl flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <div>
                <h1 className="text-base font-display font-bold text-navy">Lumaid</h1>
                <p className="text-xs text-text-muted">{roleLabels[userRole]}</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto custom-scrollbar">
              {links.map((link, index) => {
                const isActive = location.pathname === link.path
                const Icon = link.icon
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-cream text-navy font-medium'
                        : 'text-text-secondary hover:bg-cream/50 hover:text-navy'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon size={18} strokeWidth={2} className={isActive ? 'text-navy' : ''} />
                    <span>{link.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-cream-dark">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-cream rounded-xl flex items-center justify-center">
                  <span className="text-sm font-semibold text-navy">
                    {profileData?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy truncate">
                    {profileData?.name || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-text-muted truncate capitalize">{userRole}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72 lg:pl-4' : ''}`}>
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-30 bg-white border-b border-cream-dark">
          <div className="flex items-center justify-between px-4 lg:px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-cream transition-colors"
              >
                {sidebarOpen ? <X size={20} className="text-navy" /> : <Menu size={20} className="text-navy" />}
              </button>

              {/* Page Title */}
              <div>
                <h2 className="text-lg font-display font-semibold text-navy">
                  {links.find(l => l.path === location.pathname)?.label || 'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Notifications */}
              <button className="relative p-2 rounded-lg hover:bg-cream transition-colors">
                <Bell size={18} className="text-text-secondary" />
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-cream transition-colors"
                >
                  <div className="w-8 h-8 bg-cream rounded-lg flex items-center justify-center">
                    <span className="text-sm font-medium text-navy">
                      {profileData?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-medium border border-cream-dark py-1 animate-scale-in origin-top-right">
                    <Link
                      to={`/${userRole}/profile`}
                      className="flex items-center gap-3 px-3 py-2 text-sm text-navy hover:bg-cream transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <User size={16} />
                      Profile
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        // Navigate to settings if needed
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-navy hover:bg-cream transition-colors"
                    >
                      <Settings size={16} />
                      Settings
                    </button>
                    <hr className="my-1 border-cream-dark" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <LogOut size={16} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-4 lg:p-6">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
