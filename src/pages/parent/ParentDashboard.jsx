import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Baby, School, BarChart3, CheckCircle, FileText, ChevronRight } from 'lucide-react'

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="stat-card">
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 bg-cream rounded-xl flex items-center justify-center">
        <Icon size={18} className="text-text-muted" strokeWidth={2} />
      </div>
    </div>
    <p className="text-sm font-medium text-text-muted mt-4">{title}</p>
    <p className="text-2xl font-display font-bold text-navy mt-1">{value}</p>
  </div>
)

const ParentDashboard = () => {
  const { profileData } = useAuth()
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [childGrades, setChildGrades] = useState([])
  const [childAttendance, setChildAttendance] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchChildren()
  }, [])

  const fetchChildren = async () => {
    try {
      const { data, error } = await supabase
        .from('student_parent_relations')
        .select('students(*)')
        .eq('parent_id', profileData?.id)

      if (error) throw error

      const childrenData = data?.map(r => r.students).filter(Boolean) || []
      setChildren(childrenData)

      if (childrenData.length > 0) {
        setSelectedChild(childrenData[0])
        fetchChildData(childrenData[0].id)
      }
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchChildData = async (childId) => {
    try {
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*, classes (subject, name)')
        .eq('student_id', childId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (gradesData) setChildGrades(gradesData)

      const { data: attendanceData } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(10)

      if (attendanceData) setChildAttendance(attendanceData)
    } catch (error) {
      console.error('Error fetching child data:', error)
    }
  }

  const handleChildSelect = (child) => {
    setSelectedChild(child)
    fetchChildData(child.id)
  }

  const averageGrade = childGrades.length > 0
    ? (childGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / childGrades.length).toFixed(1)
    : 'N/A'

  const presentDays = childAttendance.filter(a => a.status === 'present').length
  const attendanceRate = childAttendance.length > 0
    ? Math.round((presentDays / childAttendance.length) * 100)
    : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  const firstName = profileData?.name?.split(' ')[0] || 'Parent'

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <header className="animate-fade-in">
        <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">
          Welcome, {firstName}
        </h1>
        <p className="text-text-secondary mt-1">
          Monitor your child's progress and stay updated
        </p>
      </header>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="card animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="p-4">
            <label className="block text-sm font-medium text-navy mb-3">
              Viewing progress for:
            </label>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChildSelect(child)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedChild?.id === child.id
                      ? 'bg-accent text-white'
                      : 'bg-cream text-navy hover:bg-cream-dark'
                  }`}
                >
                  {child.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedChild ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Class"
              value={selectedChild.class || 'N/A'}
              icon={School}
            />
            <StatCard
              title="Grade"
              value={selectedChild.grade_level || 'N/A'}
              icon={BarChart3}
            />
            <StatCard
              title="Average"
              value={`${averageGrade}%`}
              icon={FileText}
            />
            <StatCard
              title="Attendance"
              value={`${attendanceRate}%`}
              icon={CheckCircle}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Grades */}
            <div className="card card-hover animate-fade-in" style={{ animationDelay: '150ms' }}>
              <div className="p-5 border-b border-cream-dark flex items-center justify-between">
                <h2 className="text-base font-display font-semibold text-navy">Recent Grades</h2>
                <button className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1">
                  View all <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
              <div className="p-5">
                {childGrades.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-cream rounded-xl flex items-center justify-center mx-auto mb-3">
                      <FileText size={24} strokeWidth={2} className="text-text-muted" />
                    </div>
                    <p className="text-text-secondary text-sm">No grades recorded yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {childGrades.map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between p-3 bg-cream/50 rounded-xl">
                        <div>
                          <p className="font-medium text-navy text-sm">{grade.classes?.subject || 'Subject'}</p>
                          <p className="text-xs text-text-muted">{grade.term}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${
                          grade.grade >= 80 ? 'border-sage text-sage bg-sage/10' :
                          grade.grade >= 60 ? 'border-gold text-gold bg-gold/10' :
                          'border-coral text-coral bg-coral/10'
                        }`}>
                          {grade.grade || 'N/A'}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Attendance Record */}
            <div className="card card-hover animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="p-5 border-b border-cream-dark flex items-center justify-between">
                <h2 className="text-base font-display font-semibold text-navy">Attendance</h2>
                <button className="text-sm font-medium text-accent hover:text-accent-hover flex items-center gap-1">
                  View all <ChevronRight size={16} strokeWidth={2} />
                </button>
              </div>
              <div className="p-5">
                {childAttendance.length === 0 ? (
                  <div className="text-center py-12">
                    <CheckCircle size={40} strokeWidth={2} className="text-text-muted mx-auto mb-3 opacity-50" />
                    <p className="text-text-secondary text-sm">No attendance records</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-text-muted border-b border-cream-dark">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childAttendance.slice(0, 5).map((record) => (
                          <tr key={record.id} className="border-b border-cream-dark/50">
                            <td className="py-3 text-navy text-sm">
                              {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="py-3">
                              <span className={`px-2.5 py-1 rounded-lg text-xs font-medium border-2 ${
                                record.status === 'present' ? 'border-sage text-sage bg-sage/10' :
                                record.status === 'absent' ? 'border-coral text-coral bg-coral/10' :
                                record.status === 'late' ? 'border-gold text-gold bg-gold/10' :
                                'border-cream-dark text-text-muted bg-cream/50'
                              }`}>
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center p-12 animate-fade-in">
          <div className="w-16 h-16 bg-cream rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Baby size={32} strokeWidth={2} className="text-text-muted" />
          </div>
          <p className="text-text-secondary font-medium">No children linked to your account</p>
          <p className="text-text-muted text-sm mt-2">Please contact the school administrator to link your child's account.</p>
        </div>
      )}
    </div>
  )
}

export default ParentDashboard
