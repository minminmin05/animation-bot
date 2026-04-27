import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StatCard = ({ title, value, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500'
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
      // Fetch grades
      const { data: gradesData } = await supabase
        .from('grades')
        .select(`
          *,
          assignments (title, due_date),
          classes (name, subject)
        `)
        .eq('student_id', profileData?.id)

      if (gradesData) setGrades(gradesData)

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          *,
          classes (name, subject)
        `)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5)

      if (assignmentsData) setAssignments(assignmentsData)

      // Fetch attendance
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
        <Spinner size="large" />
      </div>
    )
  }

  // Calculate average grade
  const averageGrade = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length).toFixed(1)
    : 'N/A'

  // Calculate attendance percentage
  const presentDays = attendance.filter(a => a.status === 'present').length
  const attendanceRate = attendance.length > 0
    ? Math.round((presentDays / attendance.length) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {profileData?.name || 'Student'}! 👋</h1>
        <p className="text-blue-100 mt-1">Class {profileData?.class || 'N/A'} • Grade {profileData?.grade_level || 'N/A'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Average Grade" value={averageGrade} icon="📊" color="blue" />
        <StatCard title="Attendance Rate" value={`${attendanceRate}%`} icon="✅" color="green" />
        <StatCard title="Total Assignments" value={assignments.length} icon="📝" color="purple" />
        <StatCard title="Classes Enrolled" value="3" icon="📚" color="orange" />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Grades */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Grades</h2>
          </div>
          <div className="p-4">
            {grades.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No grades recorded yet</p>
            ) : (
              <div className="space-y-3">
                {grades.slice(0, 5).map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{grade.assignments?.title || 'Assignment'}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{grade.classes?.subject || 'N/A'}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      grade.grade >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      grade.grade >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {grade.grade || 'N/A'}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Assignments</h2>
          </div>
          <div className="p-4">
            {assignments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No upcoming assignments</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((assignment) => {
                  const dueDate = new Date(assignment.due_date)
                  const isUrgent = dueDate - new Date() < 3 * 24 * 60 * 60 * 1000
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{assignment.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{assignment.classes?.subject || 'N/A'}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm ${
                        isUrgent ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {dueDate.toLocaleDateString()}
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Attendance</h2>
        </div>
        <div className="p-4">
          {attendance.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">No attendance records</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                    <th className="pb-3 font-medium">Date</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.map((record) => (
                    <tr key={record.id} className="border-t border-gray-100 dark:border-gray-700">
                      <td className="py-3 text-gray-900 dark:text-white">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          record.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          record.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                          record.status === 'late' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400 text-sm">{record.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default StudentDashboard
