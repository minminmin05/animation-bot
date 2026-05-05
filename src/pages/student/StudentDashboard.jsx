import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StatCard = ({ title, value, icon, color = 'blue', trend, delay = 0 }) => {
  const colorClasses = {
    blue: { bg: 'from-blue-500/20 to-blue-600/10', text: 'text-blue-600', dot: 'bg-blue-500', border: 'border-blue-100' },
    green: { bg: 'from-green-500/20 to-green-600/10', text: 'text-green-600', dot: 'bg-green-500', border: 'border-green-100' },
    purple: { bg: 'from-purple-500/20 to-purple-600/10', text: 'text-purple-600', dot: 'bg-purple-500', border: 'border-purple-100' },
    orange: { bg: 'from-orange-500/20 to-orange-600/10', text: 'text-orange-600', dot: 'bg-orange-500', border: 'border-orange-100' },
    coral: { bg: 'from-coral/20 to-red-500/10', text: 'text-coral', dot: 'bg-coral', border: 'border-coral/20' },
    sage: { bg: 'from-sage/20 to-green-600/10', text: 'text-sage', dot: 'bg-sage', border: 'border-sage/20' },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div
      className={`stat-card bg-gradient-to-br ${colors.bg} border ${colors.border}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colors.bg} flex items-center justify-center mb-4`}>
          <span className="text-2xl">{icon}</span>
        </div>

        {/* Content */}
        <p className="text-sm font-medium text-text-muted mb-1">{title}</p>
        <p className="text-3xl font-display font-bold text-navy">{value}</p>

        {/* Trend */}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 ${colors.text} text-sm font-medium`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={trend > 0 ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} />
            </svg>
            <span>{Math.abs(trend)}%</span>
          </div>
        )}

        {/* Decorative Dot */}
        <div className={`absolute top-0 right-0 w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></div>
      </div>
    </div>
  )
}

const GradeBadge = ({ grade }) => {
  const getGradeColor = (g) => {
    if (g >= 80) return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' }
    if (g >= 60) return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' }
    return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' }
  }

  const colors = getGradeColor(grade)

  return (
    <div className="flex items-center gap-2">
      <span className={`w-2 h-2 rounded-full ${colors.dot} animate-pulse`}></span>
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
        {grade}%
      </span>
    </div>
  )
}

const StudentDashboard = () => {
  const { profileData, user } = useAuth()
  const [grades, setGrades] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendance, setAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: gradesData } = await supabase
        .from('grades')
        .select(`*, assignments (title, due_date), classes (name, subject)`)
        .eq('student_id', profileData?.id)

      if (gradesData) setGrades(gradesData)

      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`*, classes (name, subject)`)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5)

      if (assignmentsData) setAssignments(assignmentsData)

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', profileData?.id)
        .order('date', { ascending: false })
        .limit(10)

      if (attendanceData) setAttendance(attendanceData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-navy/10 rounded-full"></div>
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    )
  }

  const averageGrade = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length).toFixed(1)
    : 'N/A'

  const presentDays = attendance.filter(a => a.status === 'present').length
  const attendanceRate = attendance.length > 0
    ? Math.round((presentDays / attendance.length) * 100)
    : 0

  const formatDate = (dateStr) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffTime = date - now
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays < 0 && diffDays > -7) return `${Math.abs(diffDays)} days ago`
    if (diffDays > 0 && diffDays < 7) return `In ${diffDays} days`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status) => {
    const colors = {
      present: { bg: 'bg-green-100', text: 'text-green-700', icon: '✓' },
      absent: { bg: 'bg-red-100', text: 'text-red-700', icon: '✗' },
      late: { bg: 'bg-amber-100', text: 'text-amber-700', icon: '○' },
      excused: { bg: 'bg-blue-100', text: 'text-blue-700', icon: '◐' },
    }
    return colors[status] || colors.present
  }

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-navy via-primary to-navy-light rounded-3xl p-8 lg:p-10 text-white shadow-glow animate-fade-in">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-accent rounded-full filter blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-coral rounded-full filter blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-grid opacity-10"></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-accent-light text-sm font-medium mb-2">Good to see you!</p>
              <h1 className="text-3xl lg:text-4xl font-display font-bold mb-2">
                Welcome back, {profileData?.name?.split(' ')[0] || 'Student'}! 👋
              </h1>
              <p className="text-white/70">
                Class {profileData?.class || 'N/A'} • Grade {profileData?.grade_level || 'N/A'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="flex items-center gap-4 lg:gap-6">
              <div className="text-center">
                <p className="text-3xl font-display font-bold">{averageGrade}</p>
                <p className="text-white/60 text-sm">Avg Grade</p>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center">
                <p className="text-3xl font-display font-bold">{attendanceRate}%</p>
                <p className="text-white/60 text-sm">Attendance</p>
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 60" fill="none">
          <path d="M0 60L60 55C120 50 240 40 360 35C480 30 600 30 720 32.5C840 35 960 40 1080 42.5C1200 45 1320 45 1380 45L1440 45V60H1380C1320 60 1200 60 1080 60C960 60 840 60 720 60C600 60 480 60 360 60C240 60 120 60 60 60H0Z" className="fill-cream/20"/>
        </svg>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Average Grade"
          value={averageGrade}
          icon="📊"
          color="blue"
          trend={5}
          delay={100}
        />
        <StatCard
          title="Attendance Rate"
          value={`${attendanceRate}%`}
          icon="✅"
          color="green"
          trend={2}
          delay={200}
        />
        <StatCard
          title="Pending Tasks"
          value={assignments.length}
          icon="📝"
          color="coral"
          delay={300}
        />
        <StatCard
          title="Active Courses"
          value="4"
          icon="📚"
          color="sage"
          delay={400}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <div className="card card-hover animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="p-6 border-b border-navy/5 flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-navy">Recent Grades</h2>
            <Link to="/student/grades" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
              View All →
            </Link>
          </div>
          <div className="p-6">
            {grades.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-navy/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-text-muted">No grades recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {grades.slice(0, 5).map((grade, index) => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-4 bg-cream/50 rounded-xl hover:bg-cream transition-all duration-300 group"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-soft transition-shadow">
                        <span className="text-lg">📝</span>
                      </div>
                      <div>
                        <p className="font-semibold text-navy">{grade.assignments?.title || 'Assignment'}</p>
                        <p className="text-sm text-text-muted">{grade.classes?.subject || 'N/A'}</p>
                      </div>
                    </div>
                    <GradeBadge grade={grade.grade || 0} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="card card-hover animate-fade-in" style={{ animationDelay: '300ms' }}>
          <div className="p-6 border-b border-navy/5 flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-navy">Upcoming Assignments</h2>
            <Link to="/student/schedule" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
              View All →
            </Link>
          </div>
          <div className="p-6">
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-navy/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-text-muted">No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment, index) => {
                  const dueDate = new Date(assignment.due_date)
                  const isUrgent = dueDate - new Date() < 3 * 24 * 60 * 60 * 1000
                  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))

                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 bg-cream/50 rounded-xl hover:bg-cream transition-all duration-300 group"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-soft transition-shadow ${isUrgent ? 'bg-coral/10' : 'bg-white'}`}>
                          <span className="text-lg">📚</span>
                        </div>
                        <div>
                          <p className="font-semibold text-navy">{assignment.title}</p>
                          <p className="text-sm text-text-muted">{assignment.classes?.subject || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isUrgent ? 'text-coral' : 'text-accent'}`}>
                          {formatDate(assignment.due_date)}
                        </p>
                        {daysLeft > 0 && (
                          <p className="text-xs text-text-muted">{daysLeft} days left</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Attendance */}
      <div className="card card-hover animate-fade-in" style={{ animationDelay: '400ms' }}>
        <div className="p-6 border-b border-navy/5 flex items-center justify-between">
          <h2 className="text-lg font-display font-semibold text-navy">Recent Attendance</h2>
          <Link to="/student/schedule" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
            View Calendar →
          </Link>
        </div>
        <div className="p-6 overflow-x-auto">
          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-navy/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-navy/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-text-muted">No attendance records</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted">
                  <th className="pb-4 font-medium">Date</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record, index) => {
                  const colors = getStatusColor(record.status)
                  return (
                    <tr
                      key={record.id}
                      className="border-t border-navy/5 hover:bg-cream/30 transition-colors"
                      style={{ animationDelay: `${index * 30}ms` }}
                    >
                      <td className="py-4">
                        <span className="font-medium text-navy">{formatDate(record.date)}</span>
                      </td>
                      <td className="py-4">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${colors.bg} ${colors.text}`}>
                          <span>{colors.icon}</span>
                          <span className="capitalize">{record.status}</span>
                        </span>
                      </td>
                      <td className="py-4 text-sm text-text-muted">{record.notes || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
