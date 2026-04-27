import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const TeacherClasses = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          student_enrollments (
            id,
            students (*)
          )
        `)
        .eq('teacher_id', profileData?.id)

      if (error) throw error
      setClasses(data || [])
      if (data?.length > 0) {
        setSelectedClass(data[0])
        fetchStudents(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async (classId) => {
    try {
      const { data, error } = await supabase
        .from('student_enrollments')
        .select('students(*)')
        .eq('class_id', classId)
        .eq('status', 'active')

      if (error) throw error
      setStudents(data?.map(se => se.students).filter(Boolean) || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const handleClassSelect = (cls) => {
    setSelectedClass(cls)
    fetchStudents(cls.id)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Classes</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your classes and students</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Classes</h2>
            </div>
            <div className="p-2">
              {classes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No classes found</p>
              ) : (
                <div className="space-y-1">
                  {classes.map((cls) => (
                    <button
                      key={cls.id}
                      onClick={() => handleClassSelect(cls)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        selectedClass?.id === cls.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <p className="font-medium text-gray-900 dark:text-white">{cls.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Grade {cls.grade_level} • {cls.section || 'N/A'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Class Details */}
        <div className="lg:col-span-2 space-y-6">
          {selectedClass ? (
            <>
              {/* Class Info */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedClass.name}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                      {selectedClass.subject} • Grade {selectedClass.grade_level}
                      {selectedClass.section && ` - Section ${selectedClass.section}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-sm">
                      {selectedClass.student_enrollments?.length || 0} students
                    </span>
                  </div>
                </div>

                {selectedClass.schedule && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Schedule</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{selectedClass.schedule}</p>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span>📍 Room {selectedClass.room_number || 'TBD'}</span>
                  <span>📅 {selectedClass.academic_year}</span>
                </div>
              </div>

              {/* Students List */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Enrolled Students</h3>
                  <button className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400">
                    + Add Student
                  </button>
                </div>
                <div className="p-4">
                  {students.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">No students enrolled</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="text-left text-sm text-gray-500 dark:text-gray-400">
                            <th className="pb-3 font-medium">Name</th>
                            <th className="pb-3 font-medium">ID</th>
                            <th className="pb-3 font-medium">Email</th>
                            <th className="pb-3 font-medium text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((student) => (
                            <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700">
                              <td className="py-3">
                                <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Class {student.class}</p>
                              </td>
                              <td className="py-3 text-gray-600 dark:text-gray-400 text-sm">
                                {student.id.slice(0, 8)}...
                              </td>
                              <td className="py-3 text-gray-600 dark:text-gray-400 text-sm">
                                {student.email || 'N/A'}
                              </td>
                              <td className="py-3 text-right">
                                <button className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm">
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 dark:text-gray-400">Select a class to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherClasses
