import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentGradesAdmin = () => {
  const [classes, setClasses] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [students, setStudents] = useState([])
  const [subjectGrades, setSubjectGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingClass, setLoadingClass] = useState(false)
  const [saving, setSaving] = useState(false)
  const [academicYear, setAcademicYear] = useState(new Date().getFullYear().toString())
  const [term, setTerm] = useState('Current')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [studentModalData, setStudentModalData] = useState(null)
  const [loadingStudentData, setLoadingStudentData] = useState(false)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          id,
          name,
          subject,
          grade_level,
          teachers (id, name),
          credits
        `)
        .order('subject, name')

      if (error) throw error
      setClasses(data || [])

      if (data?.length > 0) {
        setSelectedClass(data[0])
        await fetchClassData(data[0].id)
      }
    } catch (error) {
      console.error('Error fetching classes:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchClassData = async (classId) => {
    setLoadingClass(true)
    try {
      // Fetch enrolled students
      const { data: enrollmentsData } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          status,
          students (id, name, class)
        `)
        .eq('class_id', classId)
        .eq('status', 'active')

      const studentsList = enrollmentsData
        ?.map(e => e.students)
        .filter(Boolean) || []

      setStudents(studentsList)

      // Fetch subject grades for this class
      const { data: gradesData } = await supabase
        .from('student_subject_grades')
        .select('*')
        .eq('class_id', classId)
        .eq('academic_year', academicYear)
        .eq('term', term)

      setSubjectGrades(gradesData || [])
    } catch (error) {
      console.error('Error fetching class data:', error)
    } finally {
      setLoadingClass(false)
    }
  }

  const handleClassChange = async (cls) => {
    if (selectedClass?.id === cls.id) return
    setSelectedClass(cls)
    await fetchClassData(cls.id)
  }

  const handleYearOrTermChange = async () => {
    if (selectedClass) {
      await fetchClassData(selectedClass.id)
    }
  }

  const getStudentId = (student) => {
    return student.id || student.user_id
  }

  const getSubjectGrade = (studentId) => {
    const grade = subjectGrades.find(g => g.student_id === studentId)
    return grade
  }

  const handleGradeChange = async (student, value) => {
    const studentId = getStudentId(student)
    const numericValue = value === '' ? null : parseFloat(value)

    if (value !== '' && isNaN(numericValue)) return

    setSaving(true)
    try {
      const existingGrade = getSubjectGrade(studentId)

      if (existingGrade) {
        // Update existing grade
        const { error } = await supabase
          .from('student_subject_grades')
          .update({
            final_grade: numericValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGrade.id)

        if (error) throw error

        setSubjectGrades(subjectGrades.map(g =>
          g.id === existingGrade.id
            ? { ...g, final_grade: numericValue, letter_grade: getLetterGrade(numericValue), grade_points: getGradePoints(numericValue) }
            : g
        ))
      } else {
        // Create new grade
        const { data, error } = await supabase
          .from('student_subject_grades')
          .insert({
            student_id: studentId,
            class_id: selectedClass.id,
            academic_year: academicYear,
            term: term,
            final_grade: numericValue
          })
          .select()

        if (error) throw error
        if (data && data[0]) {
          setSubjectGrades([...subjectGrades, data[0]])
        }
      }
    } catch (error) {
      console.error('Error saving grade:', error)
      alert('Failed to save grade: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const openStudentModal = async (student) => {
    setSelectedStudent(student)
    setLoadingStudentData(true)
    setStudentModalData(null)

    try {
      const studentId = getStudentId(student)

      // Fetch all classes this student is enrolled in
      const { data: enrollmentsData } = await supabase
        .from('student_enrollments')
        .select(`
          class_id,
          status,
          classes (
            id,
            name,
            subject,
            credits,
            teachers (name)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')

      const enrolledClasses = enrollmentsData
        ?.map(e => e.classes)
        .filter(Boolean) || []

      // Fetch all subject grades for this student
      const { data: allGradesData } = await supabase
        .from('student_subject_grades')
        .select('*')
        .eq('student_id', studentId)

      // Combine classes with their grades
      const classGrades = enrolledClasses.map(cls => {
        const gradeRecord = allGradesData?.find(g => g.class_id === cls.id)
        return {
          ...cls,
          final_grade: gradeRecord?.final_grade,
          letter_grade: gradeRecord?.letter_grade || 'N/A',
          grade_points: gradeRecord?.grade_points,
          grade_id: gradeRecord?.id
        }
      })

      // Calculate GPAX (overall GPA weighted by credits)
      const gradedClasses = classGrades.filter(c => c.final_grade !== null && c.final_grade !== undefined)
      const totalCredits = gradedClasses.reduce((sum, c) => sum + (c.credits || 1), 0)
      const weightedSum = gradedClasses.reduce((sum, c) => {
        const points = c.grade_points || getGradePoints(c.final_grade)
        return sum + (points * (c.credits || 1))
      }, 0)

      const gpax = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : 'N/A'
      const average = gradedClasses.length > 0
        ? (gradedClasses.reduce((sum, c) => sum + (c.final_grade || 0), 0) / gradedClasses.length).toFixed(1)
        : 'N/A'

      // Count letter grades
      const gradeCounts = {
        A: gradedClasses.filter(c => c.letter_grade?.startsWith('A')).length,
        B: gradedClasses.filter(c => c.letter_grade?.startsWith('B')).length,
        C: gradedClasses.filter(c => c.letter_grade?.startsWith('C')).length,
        D: gradedClasses.filter(c => c.letter_grade?.startsWith('D')).length,
        F: gradedClasses.filter(c => c.letter_grade === 'F').length
      }

      setStudentModalData({
        student,
        classes: classGrades,
        gpax,
        average,
        totalCredits,
        gradedCount: gradedClasses.length,
        totalCount: enrolledClasses.length,
        gradeCounts
      })
    } catch (error) {
      console.error('Error fetching student data:', error)
    } finally {
      setLoadingStudentData(false)
    }
  }

  const closeStudentModal = () => {
    setSelectedStudent(null)
    setStudentModalData(null)
  }

  const handleModalGradeChange = async (cls, value) => {
    if (!selectedStudent || !studentModalData) return

    const studentId = getStudentId(selectedStudent)
    const numericValue = value === '' ? null : parseFloat(value)

    if (value !== '' && isNaN(numericValue)) return

    setSaving(true)
    try {
      const existingGrade = studentModalData.classes.find(c => c.id === cls.id)?.grade_id

      if (existingGrade && value !== '') {
        // Update existing grade
        const { error } = await supabase
          .from('student_subject_grades')
          .update({
            final_grade: numericValue,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingGrade)

        if (error) throw error
      } else if (!existingGrade && value !== '') {
        // Create new grade
        const { data, error } = await supabase
          .from('student_subject_grades')
          .insert({
            student_id: studentId,
            class_id: cls.id,
            academic_year: academicYear,
            term: term,
            final_grade: numericValue
          })
          .select()

        if (error) throw error
      } else if (value === '' && existingGrade) {
        // Delete grade
        await supabase.from('student_subject_grades').delete().eq('id', existingGrade)
      }

      // Refresh modal data
      await openStudentModal(selectedStudent)

      // Also refresh main table if same class
      if (selectedClass?.id === cls.id) {
        await fetchClassData(selectedClass.id)
      }
    } catch (error) {
      console.error('Error saving grade:', error)
      alert('Failed to save grade: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  const getLetterGrade = (percentage) => {
    if (percentage === null || percentage === undefined || percentage === '') return '-'
    const pct = parseFloat(percentage)
    if (pct >= 90) return 'A'
    if (pct >= 85) return 'A-'
    if (pct >= 80) return 'B+'
    if (pct >= 75) return 'B'
    if (pct >= 70) return 'B-'
    if (pct >= 65) return 'C+'
    if (pct >= 60) return 'C'
    if (pct >= 55) return 'C-'
    if (pct >= 50) return 'D'
    return 'F'
  }

  const getGradePoints = (percentage) => {
    if (percentage === null || percentage === undefined || percentage === '') return 0
    const pct = parseFloat(percentage)
    if (pct >= 90) return 4.0
    if (pct >= 85) return 3.7
    if (pct >= 80) return 3.3
    if (pct >= 75) return 3.0
    if (pct >= 70) return 2.7
    if (pct >= 65) return 2.3
    if (pct >= 60) return 2.0
    if (pct >= 55) return 1.7
    if (pct >= 50) return 1.3
    return 1.0
  }

  const getGradeColor = (letter) => {
    if (letter === '-') return 'bg-gray-100 text-gray-600'
    if (letter.startsWith('A')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (letter.startsWith('B')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    if (letter.startsWith('C')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (letter.startsWith('D')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  // Calculate class statistics
  const calculateClassStats = () => {
    const validGrades = subjectGrades.filter(g => g.final_grade !== null && g.final_grade !== undefined)
    if (validGrades.length === 0) return { average: 'N/A', highest: 'N/A', lowest: 'N/A', count: 0 }

    const grades = validGrades.map(g => g.final_grade)
    const average = (grades.reduce((sum, g) => sum + g, 0) / grades.length).toFixed(1)
    const highest = Math.max(...grades).toFixed(1)
    const lowest = Math.min(...grades).toFixed(1)

    return { average, highest, lowest, count: validGrades.length }
  }

  const stats = calculateClassStats()

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Grades</h1>
          <p className="text-gray-500 dark:text-gray-400">Enter final grades for each student by subject. Click on a student name to view all their grades and GPAX.</p>
        </div>

        {/* Year and Term Filter */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Year:</label>
            <input
              type="text"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              onBlur={handleYearOrTermChange}
              className="input-field w-24 py-1 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Term:</label>
            <select
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onBlur={handleYearOrTermChange}
              className="input-field w-32 py-1 text-sm"
            >
              <option value="Current">Current</option>
              <option value="1">Term 1</option>
              <option value="2">Term 2</option>
              <option value="Final">Final</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Classes Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-white">Select Subject</h2>
            </div>
            <div className="p-2 max-h-[500px] overflow-y-auto">
              {classes.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-sm p-2">No classes available</p>
              ) : (
                classes.map((cls) => (
                  <button
                    key={cls.id}
                    onClick={() => handleClassChange(cls)}
                    disabled={loadingClass}
                    className={`w-full text-left p-3 rounded-lg transition-colors mb-1 ${
                      selectedClass?.id === cls.id
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                    } ${loadingClass ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{cls.subject}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{cls.name} • Grade {cls.grade_level}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Grades Table */}
        <div className="lg:col-span-3">
          {selectedClass ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
              {/* Class Header */}
              <div className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-white">{selectedClass.subject}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {selectedClass.name} • {selectedClass.teachers?.name || 'No teacher assigned'}
                    </p>
                  </div>
                  {saving && (
                    <span className="text-sm text-blue-600 dark:text-blue-400">Saving...</span>
                  )}
                </div>

                {/* Class Statistics */}
                <div className="flex gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Average:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.average}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Highest:</span>
                    <span className="font-medium text-green-600 dark:text-green-400">{stats.highest}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Lowest:</span>
                    <span className="font-medium text-red-600 dark:text-red-400">{stats.lowest}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500 dark:text-gray-400">Graded:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{stats.count}/{students.length}</span>
                  </div>
                </div>
              </div>

              {loadingClass ? (
                <div className="p-12 flex items-center justify-center">
                  <Spinner size="medium" />
                  <span className="ml-3 text-gray-500 dark:text-gray-400">Loading...</span>
                </div>
              ) : students.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-4xl mb-4">🎓</div>
                  <p className="text-gray-500 dark:text-gray-400">No students enrolled in this class</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400 sticky left-0 bg-gray-50 dark:bg-gray-700/50 z-10">Student</th>
                        <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">Final Grade (%)</th>
                        <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">Letter Grade</th>
                        <th className="text-center p-4 font-medium text-gray-600 dark:text-gray-400">Grade Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map((student) => {
                        const studentId = getStudentId(student)
                        const gradeRecord = getSubjectGrade(studentId)
                        const finalGrade = gradeRecord?.final_grade
                        const letterGrade = finalGrade !== null && finalGrade !== undefined ? getLetterGrade(finalGrade) : '-'
                        const gradePoints = finalGrade !== null && finalGrade !== undefined ? getGradePoints(finalGrade).toFixed(2) : '-'

                        return (
                          <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                            <td className="p-4 sticky left-0 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/30 z-10">
                              <button
                                onClick={() => openStudentModal(student)}
                                className="font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-left"
                              >
                                {student.name}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="0.1"
                                value={finalGrade !== null && finalGrade !== undefined ? finalGrade : ''}
                                onChange={(e) => handleGradeChange(student, e.target.value)}
                                className="w-24 text-center input-field py-2 text-lg font-semibold focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter grade"
                              />
                            </td>
                            <td className="p-4 text-center">
                              <span className={`px-3 py-1 rounded-lg text-sm font-bold ${getGradeColor(letterGrade)}`}>
                                {letterGrade}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <span className="text-gray-900 dark:text-white font-medium">{gradePoints}</span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
              <div className="text-4xl mb-4">📚</div>
              <p className="text-gray-500 dark:text-gray-400">Select a subject to enter grades</p>
            </div>
          )}
        </div>
      </div>

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedStudent.name}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Class: {selectedStudent.class}</p>
              </div>
              <button
                onClick={closeStudentModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {loadingStudentData ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="medium" />
                  <span className="ml-3 text-gray-500 dark:text-gray-400">Loading student data...</span>
                </div>
              ) : studentModalData ? (
                <div className="space-y-6">
                  {/* GPAX and Summary */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                      <p className="text-sm text-blue-100">GPAX</p>
                      <p className="text-3xl font-bold mt-1">{studentModalData.gpax}</p>
                      <p className="text-xs text-blue-200 mt-1">Overall GPA</p>
                    </div>
                    <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                      <p className="text-sm text-purple-100">Average</p>
                      <p className="text-3xl font-bold mt-1">{studentModalData.average}%</p>
                      <p className="text-xs text-purple-200 mt-1">Across all subjects</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
                      <p className="text-sm text-green-100">Credits</p>
                      <p className="text-3xl font-bold mt-1">{studentModalData.totalCredits}</p>
                      <p className="text-xs text-green-200 mt-1">Total credits</p>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
                      <p className="text-sm text-amber-100">Completed</p>
                      <p className="text-3xl font-bold mt-1">{studentModalData.gradedCount}/{studentModalData.totalCount}</p>
                      <p className="text-xs text-amber-200 mt-1">Subjects graded</p>
                    </div>
                  </div>

                  {/* Grade Distribution */}
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Grade Distribution</h3>
                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded font-bold">A</span>
                        <span className="text-gray-600 dark:text-gray-400">{studentModalData.gradeCounts.A}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded font-bold">B</span>
                        <span className="text-gray-600 dark:text-gray-400">{studentModalData.gradeCounts.B}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded font-bold">C</span>
                        <span className="text-gray-600 dark:text-gray-400">{studentModalData.gradeCounts.C}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded font-bold">D</span>
                        <span className="text-gray-600 dark:text-gray-400">{studentModalData.gradeCounts.D}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 rounded font-bold">F</span>
                        <span className="text-gray-600 dark:text-gray-400">{studentModalData.gradeCounts.F}</span>
                      </div>
                    </div>
                  </div>

                  {/* Grades by Subject */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Grades by Subject</h3>

                    {studentModalData.classes.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">No subjects found</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50 dark:bg-gray-700/50">
                            <tr>
                              <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Subject</th>
                              <th className="text-left p-3 font-medium text-gray-600 dark:text-gray-400">Class</th>
                              <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Credits</th>
                              <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Grade (%)</th>
                              <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Letter</th>
                              <th className="text-center p-3 font-medium text-gray-600 dark:text-gray-400">Points</th>
                            </tr>
                          </thead>
                          <tbody>
                            {studentModalData.classes.map((cls) => (
                              <tr key={cls.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                <td className="p-3 text-gray-900 dark:text-white font-medium">{cls.subject}</td>
                                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{cls.name}</td>
                                <td className="p-3 text-center text-sm text-gray-600 dark:text-gray-400">{cls.credits || 1}</td>
                                <td className="p-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={cls.final_grade !== null && cls.final_grade !== undefined ? cls.final_grade : ''}
                                    onChange={(e) => handleModalGradeChange(cls, e.target.value)}
                                    className="w-20 text-center input-field py-1 text-sm focus:ring-2 focus:ring-blue-500"
                                    placeholder="-"
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-1 rounded text-sm font-bold ${getGradeColor(cls.letter_grade)}`}>
                                    {cls.letter_grade}
                                  </span>
                                </td>
                                <td className="p-3 text-center text-sm text-gray-600 dark:text-gray-400">
                                  {cls.grade_points !== null && cls.grade_points !== undefined ? cls.grade_points.toFixed(2) : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <button
                onClick={closeStudentModal}
                className="w-full px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Scale Reference */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Grade Scale Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded">
            <span className="font-bold text-green-700 dark:text-green-400">A</span>
            <span className="text-gray-600 dark:text-gray-400">90-100% (4.0)</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
            <span className="font-bold text-blue-700 dark:text-blue-400">B</span>
            <span className="text-gray-600 dark:text-gray-400">75-89% (3.0)</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded">
            <span className="font-bold text-yellow-700 dark:text-yellow-400">C</span>
            <span className="text-gray-600 dark:text-gray-400">60-74% (2.0)</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
            <span className="font-bold text-orange-700 dark:text-orange-400">D</span>
            <span className="text-gray-600 dark:text-gray-400">50-59% (1.3)</span>
          </div>
          <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/20 rounded">
            <span className="font-bold text-red-700 dark:text-red-400">F</span>
            <span className="text-gray-600 dark:text-gray-400">0-49% (1.0)</span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800">
        <h3 className="text-sm font-medium text-blue-900 dark:text-blue-400 mb-2">How to Use</h3>
        <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
          <li>• Select a subject from the left sidebar to enter grades for that class</li>
          <li>• <strong>Click on a student's name</strong> to view all their grades across all subjects and GPAX</li>
          <li>• Enter the final grade percentage (0-100) - Letter grade and points are calculated automatically</li>
          <li>• You can also edit grades from the student detail modal</li>
        </ul>
      </div>
    </div>
  )
}

export default StudentGradesAdmin
