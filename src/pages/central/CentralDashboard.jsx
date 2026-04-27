/**
 * Central Dashboard Page
 *
 * Main dashboard for central school management system.
 * Provides overview of all school systems and quick access.
 */

import { useState, useEffect } from 'react'

const CentralDashboard = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    totalClasses: 0,
    totalParents: 0,
    activeAcademicYear: '',
    currentTerm: '',
  })

  const [recentActivities, setRecentActivities] = useState([])

  useEffect(() => {
    // TODO: Fetch actual data from API
    setStats({
      totalStudents: 1234,
      totalTeachers: 87,
      totalClasses: 45,
      totalParents: 1100,
      activeAcademicYear: '2024-2025',
      currentTerm: 'Second Term',
    })

    setRecentActivities([
      { id: 1, type: 'student', message: 'New student enrolled: John Doe', time: '2 hours ago' },
      { id: 2, type: 'teacher', message: 'Teacher assigned to Math class', time: '4 hours ago' },
      { id: 3, type: 'class', message: 'Class 10-A schedule updated', time: 'Yesterday' },
      { id: 4, type: 'announcement', message: 'School holiday announced', time: '2 days ago' },
    ])
  }, [])

  const quickActions = [
    { title: 'Add Student', description: 'Enroll a new student', icon: '👤', link: '/admin/students' },
    { title: 'Add Teacher', description: 'Register a new teacher', icon: '👨‍🏫', link: '/admin/teachers' },
    { title: 'Create Class', description: 'Create a new class', icon: '🏫', link: '/admin/classes' },
    { title: 'Send Announcement', description: 'Broadcast a message', icon: '📢', link: '/admin/announcements' },
    { title: 'Manage Users', description: 'User management', icon: '👥', link: '/admin/users' },
    { title: 'System Settings', description: 'Configure system', icon: '⚙️', link: '/admin/settings' },
  ]

  const systemModules = [
    { name: 'Student Management', status: 'Active', users: 1234, icon: '👤', color: 'blue' },
    { name: 'Teacher Management', status: 'Active', users: 87, icon: '👨‍🏫', color: 'green' },
    { name: 'Parent Portal', status: 'Active', users: 1100, icon: '👨‍👩‍👧‍👦', color: 'purple' },
    { name: 'Class Management', status: 'Active', users: 45, icon: '🏫', color: 'orange' },
    { name: 'Attendance System', status: 'Active', users: '-', icon: '📋', color: 'teal' },
    { name: 'Grade Management', status: 'Active', users: '-', icon: '📊', color: 'red' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Central Dashboard</h1>
        <p className="text-gray-600">Overview of school management systems</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon="👤"
          color="blue"
          trend="+12%"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon="👨‍🏫"
          color="green"
          trend="+3%"
        />
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon="🏫"
          color="orange"
          trend="+5%"
        />
        <StatCard
          title="Registered Parents"
          value={stats.totalParents}
          icon="👨‍👩‍👧‍👦"
          color="purple"
          trend="+8%"
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {quickActions.map((action) => (
            <a
              key={action.title}
              href={action.link}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-colors group"
            >
              <span className="text-3xl mb-2">{action.icon}</span>
              <span className="text-sm font-medium text-gray-900 group-hover:text-blue-600 text-center">
                {action.title}
              </span>
            </a>
          ))}
        </div>
      </div>

      {/* System Modules */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {systemModules.map((module) => (
            <div
              key={module.name}
              className="flex items-center p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div
                className={`w-12 h-12 rounded-lg bg-${module.color}-100 flex items-center justify-center mr-4`}
              >
                <span className="text-2xl">{module.icon}</span>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{module.name}</h3>
                <p className="text-sm text-gray-500">
                  {module.status} • {module.users} users
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Academic Year Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Academic Year */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Year</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Current Year</span>
              <span className="font-semibold text-gray-900">{stats.activeAcademicYear}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Current Term</span>
              <span className="font-semibold text-gray-900">{stats.currentTerm}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">School Days This Term</span>
              <span className="font-semibold text-gray-900">87</span>
            </div>
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activities</h2>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center mr-3 flex-shrink-0">
                  {activity.type === 'student' && '👤'}
                  {activity.type === 'teacher' && '👨‍🏫'}
                  {activity.type === 'class' && '🏫'}
                  {activity.type === 'announcement' && '📢'}
                </div>
                <div>
                  <p className="text-sm text-gray-900">{activity.message}</p>
                  <p className="text-xs text-gray-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Stat Card Component
const StatCard = ({ title, value, icon, color, trend }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    purple: 'bg-purple-500',
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-green-600 mt-1">{trend} from last month</p>
        </div>
        <div className={`w-12 h-12 rounded-lg ${colorClasses[color]} flex items-center justify-center`}>
          <span className="text-xl">{icon}</span>
        </div>
      </div>
    </div>
  )
}

export default CentralDashboard
