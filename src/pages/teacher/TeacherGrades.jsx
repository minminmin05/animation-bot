import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const TeacherGrades = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [assignments, setAssignments] = useState([])
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('student') // 'student' or 'assignment'

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profileData?.id)

      if (error) throw error
      setClasses(data || [])
      if (data?.length > 0) {
        setSelectedClass(data[0])
        fetchClassData(data[0].id)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassData = async (classId) => {
    try {
      // Fetch students
      const { data: studentsData } = await supabase
        .from('student_enrollments')
        .select('students(*)')
        .eq('class_id', classId)
        .eq('status', 'active')

      if (studentsData) {
        setStudents(studentsData.map(se => se.students).filter(Boolean))
      }

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*')
        .eq('class_id', classId)
        .order('due_date', { ascending: false })

      if (assignmentsData) setAssignments(assignmentsData)

      // Fetch grades
      const { data: gradesData } = await supabase
        .from('grades')
        .select('*')
        .eq('class_id', classId)

      if (gradesData) setGrades(gradesData)
    } catch (error) {
      console.error('Error fetching class data:', error)
    }
  }

  const handleClassSelect = (cls) => {
    setSelectedClass(cls)
    fetchClassData(cls.id)
  }

  const handleGradeChange = async (studentId, assignmentId, newGrade) => {
    try {
      // Check if grade exists
      const existingGrade = grades.find(
        g => g.student_id === studentId && g.assignment_id === assignmentId
      )

      if (existingGrade) {
        // Update existing grade
        const { error } = await supabase
          .from('grades')
          .update({ grade: parseFloat(newGrade) })
          .eq('id', existingGrade.id)

        if (error) throw error
      } else {
        // Create new grade
        const { error } = await supabase
          .from('grades')
          .insert({
            student_id: studentId,
            assignment_id: assignmentId,
            class_id: selectedClass.id,
            teacher_id: profileData.id,
            grade: parseFloat(newGrade),
            term: 'Current'
          })

        if (error) throw error
      }

      // Refresh grades
      const { data: updatedGrades } = await supabase
        .from('grades')
        .select('*')
        .eq('class_id', selectedClass.id)

      if (updatedGrades) setGrades(updatedGrades)
    } catch (error) {
      console.error('Error saving grade:', error)
      alert('Failed to save grade')
    }
  }

  const getStudentGrade = (studentId, assignmentId) => {
    const grade = grades.find(
      g => g.student_id === studentId && g.assignment_id === assignmentId
    )
    return grade?.grade || ''
  }

  const getStudentAverage = (studentId) => {
    const studentGrades = grades.filter(g => g.student_id === studentId)
    if (studentGrades.length === 0) return 'N/A'
    const avg = studentGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / studentGrades.length
    return avg.toFixed(1)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Manage Grades</h1>
          <p className="text-gray-500 dark:text-gray-400">Enter and manage student grades</p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="input-field w-auto"
          >
            <option value="student">By Student</option>
            <option value="assignment">By Assignment</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Classes Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Select Class</h2>
            </div>
            <div className="p-2">
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
                  <p className="text-sm text-gray-500 dark:text-gray-400">Grade {cls.grade_level}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grades Grid */}
        <div className="lg:col-span-3">
          {selectedClass && students.length > 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-white">{selectedClass.name}</h2>
              </div>

              {viewMode === 'student' ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Student</th>
                        {assignments.slice(0, 5).map((assignment) => (
                          <th key={assignment.id} className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">
                            <div className="max-w-24 truncate" title={assignment.title}>
                              {assignment.title}
                            </div>
                          </th>
                        ))}
                        <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => (
                        <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700">
                          <td className="p-4">
                            <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                          </td>
                          {assignments.slice(0, 5).map((assignment) => (
                            <td key={assignment.id} className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={getStudentGrade(student.id, assignment.id)}
                                onChange={(e) => handleGradeChange(student.id, assignment.id, e.target.value)}
                                className="w-16 text-center input-field py-1"
                                placeholder="-"
                              />
                            </td>
                          ))}
                          <td className="p-4 text-center">
                            <span className={`px-2 py-1 rounded-full text-sm font-medium ${
                              parseFloat(getStudentAverage(student.id)) >= 80
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : parseFloat(getStudentAverage(student.id)) >= 60
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            }`}>
                              {getStudentAverage(student.id)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-6">
                  <p className="text-gray-500 dark:text-gray-400 text-center">
                    Assignment view coming soon...
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="text-4xl mb-4">📊</div>
              <p className="text-gray-500 dark:text-gray-400">
                {selectedClass ? 'No students enrolled in this class' : 'Select a class to view grades'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TeacherGrades
