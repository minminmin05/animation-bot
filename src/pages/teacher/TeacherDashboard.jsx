import React, { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import {
  BookOpen,
  Users,
  FileText,
  Clock,
  ChevronRight,
  PlusCircle,
  BarChart3,
  CheckCircle,
  MessageSquare,
} from 'lucide-react'

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-sage/10', text: 'text-sage', iconBg: 'bg-sage/20' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
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

const TeacherDashboard = () => {
  const { profileData, user } = useAuth()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user?.id) {
      fetchData()
    }
  }, [user?.id, profileData?.id])

  const fetchData = async () => {
    let teacherId = profileData?.id

    if (!teacherId && user?.id) {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (teacherError) {
        console.error('Error fetching teacher:', teacherError)
      } else if (teacherData) {
        teacherId = teacherData.id
      }
    }

    if (!teacherId) {
      console.error('No teacher_id found. User may not be a teacher.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          student_enrollments (
            students (*)
          )
        `)
        .eq('teacher_id', teacherId)

      if (classesError) {
        console.error('Error fetching classes:', classesError)
      }

      if (classesData) {
        setClasses(classesData)
        const allStudents = classesData.flatMap(c =>
          c.student_enrollments?.map(se => se.students).filter(Boolean) || []
        )
        setStudents(allStudents)
      }

      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('due_date', { ascending: true })

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
      }

      if (assignmentsData) setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Spinner size="large" />
      </div>
    )
  }

  const firstName = profileData?.name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Teacher'

  return (
    <div className="space-y-6">
      {/* Welcome Header - Simplified */}
      <header className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
          Welcome back, {firstName}
        </h1>
        <p className="text-text-secondary mt-1 flex items-center gap-2">
          <BookOpen size={16} strokeWidth={2} />
          {profileData?.subject || 'Teacher'} {profileData?.department ? `• ${profileData.department}` : ''}
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Classes"
          value={classes.length}
          icon={BookOpen}
          color="blue"
        />
        <StatCard
          title="Students"
          value={students.length}
          icon={Users}
          color="green"
        />
        <StatCard
          title="Assignments"
          value={assignments.length}
          icon={FileText}
          color="purple"
        />
        <StatCard
          title="Pending"
          value="12"
          icon={Clock}
          color="orange"
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 card card-hover animate-fade-in" style={{ animationDelay: '150ms' }}>
          <div className="p-5 border-b border-cream-dark flex items-center justify-between">
            <h2 className="text-base font-display font-semibold text-navy flex items-center gap-2">
              <Clock size={18} strokeWidth={2} className="text-accent" />
              Upcoming Deadlines
            </h2>
            <button className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1">
              View all <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
          <div className="p-5">
            {assignments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-text-muted">
                <FileText size={40} strokeWidth={2} className="opacity-30 mb-3" />
                <p className="text-sm">No upcoming assignments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 5).map((assignment) => {
                  const dueDate = new Date(assignment.due_date)
                  const isOverdue = dueDate < new Date()
                  return (
                    <div
                      key={assignment.id}
                      className="flex items-center justify-between p-4 bg-cream/50 rounded-xl hover:bg-cream transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isOverdue ? 'bg-coral/10 text-coral' : 'bg-blue-50 text-blue-600'}`}>
                          <FileText size={18} strokeWidth={2} />
                        </div>
                        <div>
                          <p className="font-medium text-navy text-sm">{assignment.title}</p>
                          <p className="text-xs text-text-muted">{classes.find(c => c.id === assignment.class_id)?.name || 'Class'}</p>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                        isOverdue
                          ? 'bg-coral/10 text-coral border border-coral/20'
                          : 'bg-sage/10 text-sage border border-sage/20'
                      }`}>
                        {dueDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card animate-fade-in" style={{ animationDelay: '200ms' }}>
            <div className="p-5 border-b border-cream-dark">
              <h2 className="text-base font-display font-semibold text-navy">Quick Actions</h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              {[
                { icon: PlusCircle, label: 'New Task', color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: BarChart3, label: 'Grades', color: 'text-sage', bg: 'bg-sage/10' },
                { icon: CheckCircle, label: 'Attendance', color: 'text-purple-600', bg: 'bg-purple-50' },
                { icon: MessageSquare, label: 'Message', color: 'text-orange-600', bg: 'bg-orange-50' }
              ].map((action, idx) => (
                <button
                  key={idx}
                  className={`${action.bg} p-4 rounded-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-transform`}
                >
                  <action.icon size={20} strokeWidth={2} className={action.color} />
                  <span className="text-xs font-medium text-navy">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* My Classes */}
          <div className="card card-hover animate-fade-in" style={{ animationDelay: '250ms' }}>
            <div className="p-5 border-b border-cream-dark flex items-center justify-between">
              <h2 className="text-base font-display font-semibold text-navy">My Classes</h2>
              <ChevronRight size={16} strokeWidth={2} className="text-text-muted" />
            </div>
            <div className="p-4">
              {classes.length === 0 ? (
                <p className="text-text-muted text-center py-4 text-sm">No classes yet</p>
              ) : (
                <div className="space-y-2">
                  {classes.slice(0, 4).map((cls) => (
                    <div key={cls.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-cream/50 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-3">
                        <div className="w-1.5 h-10 rounded-full bg-accent"></div>
                        <div>
                          <p className="font-medium text-navy text-sm group-hover:text-accent transition-colors">{cls.name}</p>
                          <p className="text-xs text-text-muted">
                            {cls.student_enrollments?.length || 0} students
                          </p>
                        </div>
                      </div>
                      <ChevronRight size={14} strokeWidth={2} className="text-text-muted group-hover:text-accent transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
