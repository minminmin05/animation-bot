/**
 * Central Sidebar Component
 *
 * Main navigation sidebar for central school management.
 * Adapted from lubit-nexus with school context.
 */

import { NavLink } from 'react-router-dom'
import {
  Home,
  Users,
  GraduationCap,
  School,
  Settings,
  BookOpen,
  Award,
  Building,
  UserCog,
  LogOut,
  UserPlus,
  Link,
} from 'lucide-react'

const navigationItems = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: Home,
    roles: ['admin', 'owner'],
  },
  {
    title: 'User Management',
    url: '/admin/users',
    icon: Users,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Student Management',
    url: '/admin/students',
    icon: UserPlus,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Class Management',
    url: '/admin/classes',
    icon: School,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Teacher Management',
    url: '/admin/teachers',
    icon: GraduationCap,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Academic Settings',
    url: '/admin/academic',
    icon: BookOpen,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Grading Settings',
    url: '/admin/grading',
    icon: Award,
    roles: ['admin', 'owner'],
  },
  {
    title: 'School Facilities',
    url: '/admin/facilities',
    icon: Building,
    roles: ['admin', 'owner'],
  },
  {
    title: 'System Links',
    url: '/admin/links',
    icon: Link,
    roles: ['admin', 'owner'],
  },
  {
    title: 'Admin Settings',
    url: '/admin/settings',
    icon: UserCog,
    roles: ['admin', 'owner'],
  },
  {
    title: 'System Settings',
    url: '/admin/system',
    icon: Settings,
    roles: ['admin', 'owner'],
  },
]

const CentralSidebar = ({ open, userRole, onSignOut, onClose }) => {
  const filteredItems = navigationItems.filter((item) =>
    item.roles.includes(userRole || 'admin')
  )

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${
          open ? 'w-64' : 'w-16'
        }`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-4 border-b border-gray-200">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <School className="w-5 h-5 text-white" />
          </div>
          {open && (
            <div className="ml-3">
              <h1 className="font-semibold text-gray-900">Central Admin</h1>
              <p className="text-xs text-gray-500">School Management</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    end
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    {open && <span className="ml-3">{item.title}</span>}
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onSignOut}
            className={`flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors ${
              !open ? 'justify-center' : ''
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {open && <span className="ml-3">Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close Button */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <School className="w-5 h-5 text-white" />
            </div>
            <span className="ml-3 font-semibold text-gray-900">Central Admin</span>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.url}>
                  <NavLink
                    to={item.url}
                    onClick={onClose}
                    end
                    className={({ isActive }) =>
                      `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`
                    }
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="ml-3">{item.title}</span>
                  </NavLink>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Sign Out */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={() => {
              onSignOut()
              onClose()
            }}
            className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="ml-3">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}

export default CentralSidebar
