import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import {
  Users,
  GraduationCap,
  UserCheck,
  Users2,
  BookOpen,
  UserPlus,
  Shield,
  CheckCircle2,
  ChevronRight,
  Database,
} from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-sage/10', text: 'text-sage', iconBg: 'bg-sage/20' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className={`stat-card ${colors.bg} border-navy/10`}>
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
          <Icon size={22} className={colors.text} strokeWidth={2} />
        </div>
      </div>
      <p className="text-sm font-medium text-text-muted mt-4">{title}</p>
      <p className="text-3xl font-display font-bold text-navy mt-1">{value}</p>
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
      const { data: users } = await supabase
        .from('users')
        .select('role')

      if (users) {
        setStats({
          totalUsers: users.length,
          totalStudents: users.filter(u => u.role === 'student').length,
          totalTeachers: users.filter(u => u.role === 'teacher').length,
          totalParents: users.filter(u => u.role === 'parent').length,
          totalClasses: 0
        })
      }

      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      setStats(prev => ({ ...prev, totalClasses: classesCount || 0 }))

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

  const quickActions = [
    { icon: UserPlus, label: 'Add User', desc: 'Create new account', color: 'text-blue-600', bg: 'bg-blue-50' },
    { icon: GraduationCap, label: 'Add Student', desc: 'Enroll student', color: 'text-sage', bg: 'bg-sage/10' },
    { icon: UserCheck, label: 'Add Teacher', desc: 'Hire teacher', color: 'text-purple-600', bg: 'bg-purple-50' },
    { icon: BookOpen, label: 'Create Class', desc: 'Setup new class', color: 'text-orange-600', bg: 'bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <header className="animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center">
            <Shield size={24} strokeWidth={2} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
              Admin Dashboard
            </h1>
            <p className="text-text-secondary mt-1">Manage your school's data and users</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard title="Total Users" value={stats.totalUsers} icon={Users} color="blue" />
        <StatCard title="Students" value={stats.totalStudents} icon={GraduationCap} color="green" />
        <StatCard title="Teachers" value={stats.totalTeachers} icon={UserCheck} color="purple" />
        <StatCard title="Parents" value={stats.totalParents} icon={Users2} color="orange" />
        <StatCard title="Classes" value={stats.totalClasses} icon={BookOpen} color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="card card-hover animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="p-5 border-b border-cream-dark flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-navy">Recent Users</h2>
            <button className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="p-5">
            {recentUsers.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Users size={24} strokeWidth={2} className="text-text-muted" />
                </div>
                <p className="text-text-secondary text-sm">No users yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-xl">
                    <div>
                      <p className="font-medium text-navy text-sm">{user.email}</p>
                      <p className="text-xs text-text-muted">
                        Joined {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize border-2 ${
                      user.role === 'admin' ? 'border-coral text-coral bg-coral/10' :
                      user.role === 'teacher' ? 'border-purple-500 text-purple-600 bg-purple-50' :
                      user.role === 'student' ? 'border-blue-500 text-blue-600 bg-blue-50' :
                      'border-sage text-sage bg-sage/10'
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
        <div className="card animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="p-5 border-b border-cream-dark">
            <h2 className="text-base font-display font-semibold text-navy">Quick Actions</h2>
          </div>
          <div className="p-4 grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className={`${action.bg} p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform text-left`}
              >
                <action.icon size={24} strokeWidth={2} className={action.color} />
                <div>
                  <p className="font-medium text-navy text-sm">{action.label}</p>
                  <p className="text-xs text-text-muted">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* System Overview */}
      <div className="card animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="p-5 border-b border-cream-dark">
          <h2 className="text-base font-display font-semibold text-navy">System Overview</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { name: 'Database', status: 'Connected', icon: Database },
              { name: 'Authentication', status: 'Active', icon: Shield },
              { name: 'Row Level Security', status: 'Enabled', icon: CheckCircle2 },
            ].map((item) => (
              <div key={item.name} className="flex items-center gap-4 p-4 bg-cream/50 rounded-xl">
                <div className="w-12 h-12 bg-sage/20 rounded-xl flex items-center justify-center">
                  <item.icon size={24} strokeWidth={2} className="text-sage" />
                </div>
                <div>
                  <p className="font-medium text-navy text-sm">{item.name}</p>
                  <p className="text-sm text-sage">{item.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
