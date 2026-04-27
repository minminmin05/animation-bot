import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const Attendance = () => {
  const { profileData } = useAuth()
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [attendance, setAttendance] = useState([])
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
        fetchAttendance(childrenData[0].id)
      }
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttendance = async (childId) => {
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, classes (subject, name)')
        .eq('student_id', childId)
        .order('date', { ascending: false })
        .limit(50)

      if (error) throw error
      setAttendance(data || [])
    } catch (error) {
      console.error('Error fetching attendance:', error)
    }
  }

  const handleChildSelect = (child) => {
    setSelectedChild(child)
    fetchAttendance(child.id)
  }

  // Calculate stats
  const presentDays = attendance.filter(a => a.status === 'present').length
  const absentDays = attendance.filter(a => a.status === 'absent').length
  const lateDays = attendance.filter(a => a.status === 'late').length
  const attendanceRate = attendance.length > 0
    ? Math.round((presentDays / attendance.length) * 100)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Attendance Record</h1>
        <p className="text-gray-500 dark:text-gray-400">Monitor your child's attendance</p>
      </div>

      {/* Child Selector */}
      {children.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Viewing attendance for:</span>
          <div className="flex flex-wrap gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedChild?.id === child.id
                    ? 'bg-green-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Attendance Rate</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{attendanceRate}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Present</p>
              <p className="text-3xl font-bold text-blue-600 mt-2">{presentDays}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Absent</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{absentDays}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Late</p>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{lateDays}</p>
            </div>
          </div>

          {/* Attendance Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Date</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Class</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Status</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendance.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No attendance records found
                      </td>
                    </tr>
                  ) : (
                    attendance.map((record) => (
                      <tr key={record.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="p-4 text-gray-900 dark:text-white">
                          {new Date(record.date).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400">
                          {record.classes?.name || 'N/A'}
                        </td>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            record.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            record.status === 'absent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            record.status === 'late' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
                          {record.notes || '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
          <div className="text-4xl mb-4">👶</div>
          <p className="text-gray-500 dark:text-gray-400">No children linked to your account</p>
        </div>
      )}
    </div>
  )
}

export default Attendance
