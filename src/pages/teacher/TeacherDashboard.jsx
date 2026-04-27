import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const TeacherDashboard = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch teacher's classes
      const { data: classesData } = await supabase
        .from('classes')
        .select(`
          *,
          student_enrollments (
            students (*)
          )
        `)
        .eq('teacher_id', profileData?.id)

      if (classesData) {
        setClasses(classesData)
        // Collect all students
        const allStudents = classesData.flatMap(c =>
          c.student_enrollments?.map(se => se.students).filter(Boolean) || []
        )
        setStudents(allStudents)
      }

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('teacher_id', profileData?.id)
        .order('due_date', { ascending: true })

      if (assignmentsData) setAssignments(assignmentsData)
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

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {profileData?.name || 'Teacher'}! 👋</h1>
        <p className="text-purple-100 mt-1">{profileData?.subject || 'Teacher'} • {profileData?.department || 'Department'}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Classes</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{classes.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center text-2xl">
              📚
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{students.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center text-2xl">
              👥
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{assignments.length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center text-2xl">
              📝
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Submissions Pending</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">12</p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center text-2xl">
              ⏳
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* My Classes */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">My Classes</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View All →
            </button>
          </div>
          <div className="p-4">
            {classes.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No classes assigned</p>
            ) : (
              <div className="space-y-3">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Grade {cls.grade_level} • {cls.section || 'N/A'} • {cls.student_enrollments?.length || 0} students
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm">
                      {cls.room_number || 'TBD'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Upcoming Assignments */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upcoming Deadlines</h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View All →
            </button>
          </div>
          <div className="p-4">
            {assignments.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No upcoming assignments</p>
            ) : (
              <div className="space-y-3">
                {assignments.slice(0, 5).map((assignment) => {
                  const dueDate = new Date(assignment.due_date)
                  const isOverdue = dueDate < new Date()
                  return (
                    <div key={assignment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{assignment.title}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{classes.find(c => c.id === assignment.class_id)?.name || 'Class'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        isOverdue
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
            <div className="text-2xl mb-2">📝</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Create Assignment</p>
          </button>
          <button className="p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Enter Grades</p>
          </button>
          <button className="p-4 bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors">
            <div className="text-2xl mb-2">✅</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Take Attendance</p>
          </button>
          <button className="p-4 bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 rounded-lg transition-colors">
            <div className="text-2xl mb-2">📧</div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Send Message</p>
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeacherDashboard
