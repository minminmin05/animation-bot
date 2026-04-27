import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StatCard = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-lg flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
    totalClasses: 0
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Fetch user counts by role
      const { data: users } = await supabase
        .from('users')
        .select('role')

      if (users) {
        setStats({
          totalUsers: users.length,
          totalStudents: users.filter(u => u.role === 'student').length,
          totalTeachers: users.filter(u => u.role === 'teacher').length,
          totalParents: users.filter(u => u.role === 'parent').length,
          totalClasses: 0 // Will be fetched separately
        })
      }

      // Fetch classes count
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      setStats(prev => ({ ...prev, totalClasses: classesCount || 0 }))

      // Fetch recent users
      const { data: recentData } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentData) setRecentUsers(recentData)
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Admin Dashboard 🛡️</h1>
        <p className="text-red-100 mt-1">Manage your school's data and users</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon="👥" color="blue" />
        <StatCard title="Students" value={stats.totalStudents} icon="🎓" color="green" />
        <StatCard title="Teachers" value={stats.totalTeachers} icon="👨‍🏫" color="purple" />
        <StatCard title="Parents" value={stats.totalParents} icon="👪" color="orange" />
        <StatCard title="Classes" value={stats.totalClasses} icon="📚" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Users</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View All →
            </button>
          </div>
          <div className="p-4">
            {recentUsers.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users yet</p>
            ) : (
              <div className="space-y-3">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{user.email}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Joined {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm capitalize ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      user.role === 'teacher' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' :
                      user.role === 'student' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }`}>
                      {user.role}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <button className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">👤</div>
              <p className="font-medium text-gray-900 dark:text-white">Add User</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create new account</p>
            </button>
            <button className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">🎓</div>
              <p className="font-medium text-gray-900 dark:text-white">Add Student</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enroll student</p>
            </button>
            <button className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">👨‍🏫</div>
              <p className="font-medium text-gray-900 dark:text-white">Add Teacher</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Hire teacher</p>
            </button>
            <button className="p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors text-left">
              <div className="text-2xl mb-2">📚</div>
              <p className="font-medium text-gray-900 dark:text-white">Create Class</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Setup new class</p>
            </button>
          </div>
        </div>
      </div>

      {/* System Health */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Database</p>
              <p className="text-sm text-green-600 dark:text-green-400">Connected</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Authentication</p>
              <p className="text-sm text-green-600 dark:text-green-400">Active</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Row Level Security</p>
              <p className="text-sm text-green-600 dark:text-green-400">Enabled</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
