import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Link } from 'react-router-dom'
import { BarChart3, CheckCircle, FileText, Calendar, TrendingUp, TrendingDown, BookOpen, Clock } from 'lucide-react'
import { StatCardSkeleton, TableSkeleton } from '../../components/Skeleton'

const StatCard = ({ title, value, icon: Icon, color = 'blue', trend, delay = 0 }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-sage/10', text: 'text-sage', iconBg: 'bg-sage/20' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    coral: { bg: 'bg-coral/10', text: 'text-coral', iconBg: 'bg-coral/20' },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div
      className={`stat-card ${colors.bg} border-${color === 'green' ? 'sage' : color === 'coral' ? 'coral' : 'navy'}/10`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className={`w-12 h-12 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
          <Icon size={22} className={colors.text} strokeWidth={2} />
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-1 text-sm font-medium ${colors.text}`}>
            {trend > 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <p className="text-sm font-medium text-text-muted mt-4">{title}</p>
      <p className="text-3xl font-display font-bold text-navy mt-1">{value}</p>
    </div>
  )
}

const GradeBadge = ({ grade }) => {
  const getGradeStyle = (g) => {
    if (g >= 80) return { borderColor: 'border-sage', textColor: 'text-sage', bg: 'bg-sage/10' }
    if (g >= 60) return { borderColor: 'border-gold', textColor: 'text-gold', bg: 'bg-gold/10' }
    return { borderColor: 'border-coral', textColor: 'text-coral', bg: 'bg-coral/10' }
  }

  const style = getGradeStyle(grade)

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${style.borderColor} ${style.textColor} ${style.bg}`}>
      {grade}%
    </span>
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
      <div className="space-y-6">
        <div className="animate-fade-in">
          <div className="h-8 w-48 bg-cream-dark/30 rounded-lg mb-2"></div>
          <div className="h-4 w-32 bg-cream-dark/20 rounded"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-6">
            <TableSkeleton rows={3} />
          </div>
          <div className="card p-6">
            <TableSkeleton rows={3} />
          </div>
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

  const getStatusStyle = (status) => {
    const styles = {
      present: { bg: 'bg-sage/10', text: 'text-sage', border: 'border-sage', icon: CheckCircle },
      absent: { bg: 'bg-coral/10', text: 'text-coral', border: 'border-coral', icon: Clock },
      late: { bg: 'bg-gold/10', text: 'text-gold', border: 'border-gold', icon: Clock },
      excused: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', icon: Clock },
    }
    return styles[status] || styles.present
  }

  const firstName = profileData?.name?.split(' ')[0] || 'Student'

  return (
    <div className="space-y-6">
      {/* Welcome Header - Simplified */}
      <header className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
          Welcome back, {firstName}
        </h1>
        <p className="text-text-secondary mt-1">
          {profileData?.class ? `Class ${profileData.class}` : ''} {profileData?.grade_level ? `• Grade ${profileData.grade_level}` : ''}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Average Grade"
          value={averageGrade}
          icon={BarChart3}
          color="blue"
          trend={5}
          delay={100}
        />
        <StatCard
          title="Attendance"
          value={`${attendanceRate}%`}
          icon={CheckCircle}
          color="green"
          trend={2}
          delay={150}
        />
        <StatCard
          title="Pending"
          value={assignments.length}
          icon={FileText}
          color="coral"
          delay={200}
        />
        <StatCard
          title="Courses"
          value="4"
          icon={BookOpen}
          color="purple"
          delay={250}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <div className="card card-hover animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="p-5 border-b border-cream-dark flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-navy">Recent Grades</h2>
            <Link to="/student/grades" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
              View all →
            </Link>
          </div>
          <div className="p-5">
            {grades.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3">
                  <BarChart3 size={24} className="text-text-muted" strokeWidth={2} />
                </div>
                <p className="text-text-secondary text-sm">No grades recorded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {grades.slice(0, 5).map((grade) => (
                  <div
                    key={grade.id}
                    className="flex items-center justify-between p-3 bg-cream/50 rounded-xl hover:bg-cream transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <FileText size={16} className="text-text-muted" strokeWidth={2} />
                      </div>
                      <div>
                        <p className="font-medium text-navy text-sm">{grade.assignments?.title || 'Assignment'}</p>
                        <p className="text-xs text-text-muted">{grade.classes?.subject || 'N/A'}</p>
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
        <div className="card card-hover animate-fade-in" style={{ animationDelay: '200ms' }}>
          <div className="p-5 border-b border-cream-dark flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-navy">Upcoming</h2>
            <Link to="/student/schedule" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
              View all →
            </Link>
          </div>
          <div className="p-5">
            {assignments.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Calendar size={24} className="text-text-muted" strokeWidth={2} />
                </div>
                <p className="text-text-secondary text-sm">No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_date)
                  const isUrgent = dueDate - new Date() < 3 * 24 * 60 * 60 * 1000
                  const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24))

                  return (
                    <div
                      key={assignment.id}
                      className={`flex items-center justify-between p-3 rounded-xl hover:bg-cream transition-colors group ${isUrgent ? 'bg-coral/5' : 'bg-cream/50'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shadow-sm ${isUrgent ? 'bg-coral/10' : 'bg-white'}`}>
                          <BookOpen size={16} className={isUrgent ? 'text-coral' : 'text-text-muted'} strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-medium text-navy text-sm">{assignment.title}</p>
                          <p className="text-xs text-text-muted">{assignment.classes?.subject || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-semibold ${isUrgent ? 'text-coral' : 'text-text-secondary'}`}>
                          {formatDate(assignment.due_date)}
                        </p>
                        {daysLeft > 0 && (
                          <p className="text-xs text-text-muted">{daysLeft}d left</p>
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
      <div className="card card-hover animate-fade-in" style={{ animationDelay: '250ms' }}>
        <div className="p-5 border-b border-cream-dark flex items-center justify-between">
          <h2 className="text-base font-display font-semibold text-navy">Attendance History</h2>
          <Link to="/student/schedule" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
            Calendar →
          </Link>
        </div>
        <div className="p-5 overflow-x-auto">
          {attendance.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3">
                <Calendar size={24} className="text-text-muted" strokeWidth={2} />
              </div>
              <p className="text-text-secondary text-sm">No attendance records</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-text-muted border-b border-cream-dark">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => {
                  const style = getStatusStyle(record.status)
                  const Icon = style.icon
                  return (
                    <tr
                      key={record.id}
                      className="border-b border-cream-dark/50 hover:bg-cream/30 transition-colors"
                    >
                      <td className="py-3">
                        <span className="text-sm font-medium text-navy">{formatDate(record.date)}</span>
                      </td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border-2 ${style.bg} ${style.text} ${style.border}`}>
                          <Icon size={12} strokeWidth={2.5} />
                          <span className="capitalize">{record.status}</span>
                        </span>
                      </td>
                      <td className="py-3 text-sm text-text-muted">{record.notes || '-'}</td>
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
