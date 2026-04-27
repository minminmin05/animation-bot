import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

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
      // Fetch grades
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*, classes (subject, name)')
        .eq('student_id', childId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (gradesData) setChildGrades(gradesData)

      // Fetch attendance
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

  // Calculate average
  const averageGrade = childGrades.length > 0
    ? (childGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / childGrades.length).toFixed(1)
    : 'N/A'

  // Calculate attendance
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome, {profileData?.name || 'Parent'}! 👋</h1>
        <p className="text-green-100 mt-1">Monitor your child's progress and stay updated</p>
      </div>

      {/* Child Selector */}
      {children.length > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Child
          </label>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChild?.id === child.id
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {child.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedChild ? (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Class</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{selectedChild.class || 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Grade Level</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{selectedChild.grade_level || 'N/A'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Average Grade</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{averageGrade}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{attendanceRate}%</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Grades */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Grades</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View All →
                </button>
              </div>
              <div className="p-4">
                {childGrades.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No grades recorded yet</p>
                ) : (
                  <div className="space-y-3">
                    {childGrades.map((grade) => (
                      <div key={grade.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{grade.classes?.subject || 'Subject'}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{grade.term}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          grade.grade >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                          grade.grade >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        }`}>
                          {grade.grade || 'N/A'}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Attendance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Attendance Record</h2>
                <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                  View All →
                </button>
              </div>
              <div className="p-4">
                {childAttendance.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No attendance records</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                          <th className="pb-3 font-medium">Date</th>
                          <th className="pb-3 font-medium">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {childAttendance.slice(0, 5).map((record) => (
                          <tr key={record.id} className="border-t border-gray-100 dark:border-gray-700">
                            <td className="py-3 text-gray-900 dark:text-white">
                              {new Date(record.date).toLocaleDateString()}
                            </td>
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
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="text-4xl mb-4">👶</div>
          <p className="text-gray-500 dark:text-gray-400">No children linked to your account</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">Please contact the school administrator to link your child's account.</p>
        </div>
      )}
    </div>
  )
}

export default ParentDashboard
