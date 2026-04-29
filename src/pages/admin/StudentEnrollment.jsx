import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'
import { Users, UserPlus, UserMinus, Search, GraduationCap, BookOpen, ChevronLeft, ChevronRight, X, Check } from 'lucide-react'

const StudentEnrollment = () => {
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [classesResult, studentsResult, enrollmentsResult] = await Promise.all([
        supabase.rpc('admin_get_classes_with_teachers'),
        supabase.rpc('admin_get_students_with_users'),
        supabase.from('student_enrollments').select('*')
      ])

      if (classesResult.data) {
        setClasses(classesResult.data)
      }
      if (studentsResult.data) {
        setStudents(studentsResult.data)
      }
      if (enrollmentsResult.data) {
        setEnrollments(enrollmentsResult.data)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEnrolledStudents = (classId) => {
    const enrollmentIds = enrollments
      .filter(e => e.class_id === classId && e.status === 'active')
      .map(e => e.student_id)
    return students.filter(s => enrollmentIds.includes(s.id))
  }

  const getAvailableStudents = (classId) => {
    // Only exclude students with ACTIVE enrollments
    const activeEnrollmentIds = enrollments
      .filter(e => e.class_id === classId && e.status === 'active')
      .map(e => e.student_id)
    return students.filter(s => !activeEnrollmentIds.includes(s.id))
  }

  const handleAddStudents = async (studentIds) => {
    if (!selectedClass || studentIds.length === 0) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('admin_enroll_students', {
        p_class_id: selectedClass.id,
        p_student_ids: studentIds
      })

      if (error) throw error

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to enroll students')
      }

      await fetchData()
      setShowAddModal(false)
    } catch (error) {
      console.error('Error adding students:', error)
      alert(`Failed to add students: ${error.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  const handleRemoveStudent = async (studentId) => {
    if (!selectedClass) return

    try {
      const { error } = await supabase
        .from('student_enrollments')
        .delete()
        .eq('student_id', studentId)
        .eq('class_id', selectedClass.id)

      if (error) throw error

      await fetchData()
    } catch (error) {
      console.error('Error removing student:', error)
      alert('Failed to remove student')
    }
  }

  const enrolledStudents = selectedClass ? getEnrolledStudents(selectedClass.id) : []
  const availableStudents = selectedClass ? getAvailableStudents(selectedClass.id) : []

  // Filter students by search term
  const filteredEnrolled = enrolledStudents.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="large" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Enrollment</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage student enrollments for each class</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Classes List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Classes ({classes.length})
              </h2>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {classes.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  No classes found
                </div>
              ) : (
                classes.map((cls) => {
                  const studentCount = getEnrolledStudents(cls.id).length
                  return (
                    <button
                      key={cls.id}
                      onClick={() => setSelectedClass(cls)}
                      className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                        selectedClass?.id === cls.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{cls.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{cls.subject}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {cls.teacher_name || 'No teacher'}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2 flex flex-col items-end">
                          <span className={`text-sm font-medium ${
                            studentCount > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                          }`}>
                            {studentCount}
                          </span>
                          <span className="text-xs text-gray-400">students</span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </div>
        </div>

        {/* Enrolled Students */}
        <div className="lg:col-span-2">
          {selectedClass ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              {/* Class Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedClass.subject} • Grade {selectedClass.grade_level}
                      {selectedClass.section && ` - Section ${selectedClass.section}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-primary flex items-center gap-2"
                    disabled={availableStudents.length === 0}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Students
                  </button>
                </div>
              </div>

              {/* Search */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search enrolled students..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="input-field pl-9"
                  />
                </div>
              </div>

              {/* Students List */}
              <div className="max-h-[500px] overflow-y-auto">
                {filteredEnrolled.length === 0 ? (
                  <div className="p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                      {searchTerm ? 'No matching students found' : 'No students enrolled in this class'}
                    </p>
                    {!searchTerm && availableStudents.length > 0 && (
                      <button
                        onClick={() => setShowAddModal(true)}
                        className="mt-4 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      >
                        Add students now
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredEnrolled.map((student) => (
                      <div
                        key={student.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                            {(student.full_name || student.name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {student.full_name || student.name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveStudent(student.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Remove from class"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {filteredEnrolled.length} student{filteredEnrolled.length !== 1 ? 's' : ''} enrolled
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <GraduationCap className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Select a Class
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Choose a class from the list to view and manage enrolled students
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Add Students Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Students to Class</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{selectedClass?.name}</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <AddStudentsForm
              availableStudents={availableStudents}
              onSubmit={handleAddStudents}
              onCancel={() => setShowAddModal(false)}
              submitting={submitting}
            />
          </div>
        </div>
      )}
    </div>
  )
}

// Add Students Form Component
const AddStudentsForm = ({ availableStudents, onSubmit, onCancel, submitting }) => {
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [searchTerm, setSearchTerm] = useState('')

  const filteredStudents = availableStudents.filter(s =>
    s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const toggleStudent = (studentId) => {
    setSelectedStudentIds(prev =>
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    )
  }

  const toggleAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([])
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id))
    }
  }

  const handleSubmit = () => {
    onSubmit(selectedStudentIds)
  }

  return (
    <>
      {/* Search */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-9"
          />
        </div>
      </div>

      {/* Students List */}
      <div className="flex-1 overflow-y-auto max-h-[400px] p-4">
        {filteredStudents.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchTerm ? 'No matching students found' : 'All students are already enrolled'}
          </div>
        ) : (
          <div className="space-y-2">
            {/* Select All */}
            {filteredStudents.length > 1 && (
              <button
                onClick={toggleAll}
                className="w-full p-3 text-left bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedStudentIds.length === filteredStudents.length
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedStudentIds.length === filteredStudents.length && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All'}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({filteredStudents.length} students)
                  </span>
                </div>
              </button>
            )}

            {/* Student Items */}
            {filteredStudents.map((student) => (
              <button
                key={student.id}
                onClick={() => toggleStudent(student.id)}
                className={`w-full p-3 text-left rounded-lg border-2 transition-all ${
                  selectedStudentIds.includes(student.id)
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    selectedStudentIds.includes(student.id)
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {selectedStudentIds.includes(student.id) && (
                      <Check className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
                    {(student.full_name || student.name || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {student.full_name || student.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {student.email}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
          </span>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedStudentIds.length === 0}
            className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Spinner size="small" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

export default StudentEnrollment
