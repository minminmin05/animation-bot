import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useState, useEffect } from 'react'

const sidebarLinks = {
  student: [
    { path: '/student/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/student/grades', label: 'My Grades', icon: 'bar-chart-2' },
    { path: '/student/schedule', label: 'Schedule', icon: 'calendar' },
    { path: '/student/report-card', label: 'Report Card', icon: 'file-text' },
    { path: '/student/profile', label: 'Profile', icon: 'user' }
  ],
  teacher: [
    { path: '/teacher/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/teacher/classes', label: 'My Classes', icon: 'book-open' },
    { path: '/teacher/grades', label: 'Manage Grades', icon: 'bar-chart-2' },
    { path: '/teacher/assignments', label: 'Assignments', icon: 'edit-3' },
    { path: '/teacher/profile', label: 'Profile', icon: 'user' }
  ],
  parent: [
    { path: '/parent/dashboard', label: 'Dashboard', icon: 'layout-dashboard' },
    { path: '/parent/child-grades', label: 'Child Grades', icon: 'bar-chart-2' },
    { path: '/parent/attendance', label: 'Attendance', icon: 'check-circle' },
    { path: '/parent/profile', label: 'Profile', icon: 'user' }
  ]
}

const iconMap = {
  'layout-dashboard': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1H5a1 1 0 01-1-1v-3zM14 16a1 1 0 011-1h4a1 1 0 011 1v3a1 1 0 01-1 1h-4a1 1 0 01-1-1v-3z" />,
  'bar-chart-2': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  'calendar': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
  'file-text': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
  'user': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
  'book-open': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />,
  'edit-3': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />,
  'check-circle': <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
}

const Icon = ({ name, size = 20 }) => (
  <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    {iconMap[name] || iconMap['layout-dashboard']}
  </svg>
)

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
          className="fixed inset-0 bg-navy/20 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen transition-all duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0 w-72' : '-translate-x-full w-72'
        } lg:translate-x-0 lg:w-72`}
      >
        <div className="h-full flex flex-col">
          {/* Glassmorphism Sidebar */}
          <div className="flex-1 m-4 bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-soft overflow-hidden">
            {/* Logo Section */}
            <Link
              to={`/${userRole}/dashboard`}
              className="flex items-center gap-3 p-6 border-b border-navy/5 hover:bg-white/50 transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-navy to-primary rounded-xl flex items-center justify-center shadow-glow">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-accent rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-lg font-display font-bold text-navy">Lumaid</h1>
                <p className="text-xs text-text-muted">{roleLabels[userRole]}</p>
              </div>
            </Link>

            {/* Navigation */}
            <nav className="p-4 space-y-1 custom-scrollbar overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
              {links.map((link, index) => {
                const isActive = location.pathname === link.path
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    className={`sidebar-link ${isActive ? 'active' : ''} animate-slide-in`}
                    style={{ animationDelay: `${index * 50}ms` }}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon name={link.icon} size={20} />
                    <span className="font-medium">{link.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent animate-pulse"></div>
                    )}
                  </Link>
                )
              })}
            </nav>

            {/* User Profile Section */}
            <div className="p-4 border-t border-navy/5 bg-navy/5">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-accent to-coral rounded-xl flex items-center justify-center shadow-glow">
                    <span className="text-white font-semibold text-sm">
                      {profileData?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">
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
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-72' : ''}`}>
        {/* Top Navigation Bar */}
        <nav className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-navy/5">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2.5 rounded-xl hover:bg-navy/5 transition-colors"
              >
                <svg className="w-5 h-5 text-navy" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Breadcrumb/Title */}
              <div>
                <h2 className="text-lg font-display font-semibold text-navy">
                  {links.find(l => l.path === location.pathname)?.label || 'Dashboard'}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Notifications */}
              <button className="relative p-2.5 rounded-xl hover:bg-navy/5 transition-colors group">
                <svg className="w-5 h-5 text-navy group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse"></span>
              </button>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-2 pr-4 rounded-xl hover:bg-navy/5 transition-colors"
                >
                  <div className="w-9 h-9 bg-gradient-to-br from-accent to-coral rounded-xl flex items-center justify-center shadow-glow">
                    <span className="text-white font-semibold text-sm">
                      {profileData?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <svg className={`w-4 h-4 text-navy transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-strong border border-navy/5 py-2 animate-scale-in origin-top-right">
                    <Link
                      to={`/${userRole}/profile`}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-navy hover:bg-navy/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      className="flex items-center gap-3 px-4 py-3 text-sm text-navy hover:bg-navy/5 transition-colors"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <hr className="my-2 border-navy/5" />
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* Page Content */}
        <main className="p-6 lg:p-8">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
