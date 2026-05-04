import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentGrades = () => {
  const { profileData } = useAuth()
  const [grades, setGrades] = useState([])
  const [enrolledClasses, setEnrolledClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState('all')
  const [expandedSubject, setExpandedSubject] = useState(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const studentId = profileData?.id

      // Fetch enrolled classes with credits
      const { data: enrollmentsData, error: enrollmentsError } = await supabase
        .from('student_enrollments')
        .select(`
          class_id,
          status,
          classes (
            id,
            name,
            subject,
            credits,
            grade_level,
            teacher_id,
            teachers (name)
          )
        `)
        .eq('student_id', studentId)
        .eq('status', 'active')

      if (enrollmentsError) throw enrollmentsError

      const classes = enrollmentsData
        ?.map(e => e.classes)
        .filter(Boolean) || []

      setEnrolledClasses(classes)

      // Fetch grades with assignments and classes
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          assignments (title, total_points, assignment_type, max_points),
          classes (id, name, subject, credits)
        `)
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGrades(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGrades = selectedTerm === 'all'
    ? grades
    : grades.filter(g => g.term === selectedTerm)

  const terms = [...new Set(grades.map(g => g.term))]

  // Group grades by subject/class
  const gradesBySubject = enrolledClasses.map(cls => {
    const subjectGrades = filteredGrades.filter(g => g.class_id === cls.id)
    const avgGrade = subjectGrades.length > 0
      ? subjectGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / subjectGrades.length
      : 0

    return {
      ...cls,
      grades: subjectGrades,
      average: avgGrade,
      averageDisplay: avgGrade > 0 ? avgGrade.toFixed(1) : 'N/A'
    }
  }).filter(subject => subject.grades.length > 0)

  // Calculate overall GPA
  const totalCredits = gradesBySubject.reduce((sum, s) => sum + (s.credits || 1), 0)
  const weightedSum = gradesBySubject.reduce((sum, s) => {
    const gradePoints = getGradePoints(s.average)
    return sum + (gradePoints * (s.credits || 1))
  }, 0)
  const overallGPA = totalCredits > 0 ? (weightedSum / totalCredits).toFixed(2) : '0.00'

  const overallAverage = gradesBySubject.length > 0
    ? (gradesBySubject.reduce((sum, s) => sum + s.average, 0) / gradesBySubject.length).toFixed(1)
    : '0.0'

  function getGradePoints(percentage) {
    if (percentage >= 90) return 4.0
    if (percentage >= 85) return 3.7
    if (percentage >= 80) return 3.3
    if (percentage >= 75) return 3.0
    if (percentage >= 70) return 2.7
    if (percentage >= 65) return 2.3
    if (percentage >= 60) return 2.0
    if (percentage >= 55) return 1.7
    if (percentage >= 50) return 1.3
    return 1.0
  }

  function getLetterGrade(percentage) {
    if (percentage >= 90) return 'A'
    if (percentage >= 85) return 'A-'
    if (percentage >= 80) return 'B+'
    if (percentage >= 75) return 'B'
    if (percentage >= 70) return 'B-'
    if (percentage >= 65) return 'C+'
    if (percentage >= 60) return 'C'
    if (percentage >= 55) return 'C-'
    if (percentage >= 50) return 'D'
    return 'F'
  }

  function getGradeColor(letter) {
    if (letter.startsWith('A')) return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (letter.startsWith('B')) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
    if (letter.startsWith('C')) return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (letter.startsWith('D')) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
    return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
  }

  const toggleSubject = (subjectId) => {
    setExpandedSubject(expandedSubject === subjectId ? null : subjectId)
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Grades</h1>
          <p className="text-gray-500 dark:text-gray-400">View your grades by subject and overall performance</p>
        </div>

        {/* Term Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400">Term:</label>
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Terms</option>
            {terms.map(term => (
              <option key={term} value={term}>{term}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overall Grade Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <p className="text-sm text-blue-100">Overall GPA</p>
          <p className="text-4xl font-bold mt-2">{overallGPA}</p>
          <p className="text-xs text-blue-200 mt-1">on 4.0 scale</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm p-6 text-white">
          <p className="text-sm text-purple-100">Overall Average</p>
          <p className="text-4xl font-bold mt-2">{overallAverage}%</p>
          <p className="text-xs text-purple-200 mt-1">across all subjects</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-sm p-6 text-white">
          <p className="text-sm text-green-100">Total Assignments</p>
          <p className="text-4xl font-bold mt-2">{filteredGrades.length}</p>
          <p className="text-xs text-green-200 mt-1">completed</p>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-sm p-6 text-white">
          <p className="text-sm text-amber-100">Passing Rate</p>
          <p className="text-4xl font-bold mt-2">
            {filteredGrades.length > 0
              ? Math.round((filteredGrades.filter(g => g.grade >= 60).length / filteredGrades.length) * 100)
              : 0}%
          </p>
          <p className="text-xs text-amber-200 mt-1">of assignments passed</p>
        </div>
      </div>

      {/* Subject-based Grade Cards */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Grades by Subject</h2>

        {gradesBySubject.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="text-4xl mb-4">📚</div>
            <p className="text-gray-500 dark:text-gray-400">
              {selectedTerm === 'all'
                ? 'No grades available yet. Complete some assignments to see your grades here!'
                : `No grades found for ${selectedTerm} term.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {gradesBySubject.map((subject) => {
              const letterGrade = subject.average > 0 ? getLetterGrade(subject.average) : 'N/A'
              const gradeColor = subject.average > 0 ? getGradeColor(letterGrade) : 'bg-gray-100 text-gray-600'

              return (
                <div
                  key={subject.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
                >
                  {/* Subject Header - Always Visible */}
                  <div
                    onClick={() => toggleSubject(subject.id)}
                    className="p-5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${gradeColor}`}>
                          {letterGrade}
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                            {subject.subject || subject.name}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {subject.teachers?.name ? `Teacher: ${subject.teachers.name}` : ''} • {subject.credits || 1} Credit{subject.credits !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Average</p>
                          <p className={`text-2xl font-bold ${
                            subject.average >= 80 ? 'text-green-600 dark:text-green-400' :
                            subject.average >= 60 ? 'text-yellow-600 dark:text-yellow-400' :
                            'text-red-600 dark:text-red-400'
                          }`}>
                            {subject.averageDisplay}%
                          </p>
                        </div>
                        <div className="text-gray-400">
                          <svg
                            className={`w-6 h-6 transition-transform ${expandedSubject === subject.id ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Detail View */}
                  {expandedSubject === subject.id && (
                    <div className="border-t border-gray-100 dark:border-gray-700 p-5 bg-gray-50 dark:bg-gray-700/20">
                      <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Assignment Details</h4>

                      {subject.grades.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-4">No assignments graded yet</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-600">
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Assignment</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Type</th>
                                <th className="text-center py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Score</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Term</th>
                                <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400">Date</th>
                              </tr>
                            </thead>
                            <tbody>
                              {subject.grades.map((grade) => (
                                <tr key={grade.id} className="border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                                  <td className="py-3 px-3">
                                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                                      {grade.assignments?.title || 'Assignment'}
                                    </p>
                                  </td>
                                  <td className="py-3 px-3">
                                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-xs capitalize">
                                      {grade.assignments?.assignment_type || 'homework'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-center">
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                      grade.grade >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                      grade.grade >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    }`}>
                                      {grade.grade || 0}%
                                    </span>
                                  </td>
                                  <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">{grade.term}</td>
                                  <td className="py-3 px-3 text-sm text-gray-600 dark:text-gray-400">
                                    {new Date(grade.created_at).toLocaleDateString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Subject Summary Stats */}
                      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Assignments</p>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">{subject.grades.length}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Passed</p>
                          <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                            {subject.grades.filter(g => g.grade >= 60).length}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Highest</p>
                          <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                            {subject.grades.length > 0 ? Math.max(...subject.grades.map(g => g.grade || 0)) : 0}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Grade Scale Reference */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
        <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Grade Scale Reference</h3>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 flex items-center justify-center font-bold">A</span>
            <span className="text-gray-600 dark:text-gray-400">90-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 flex items-center justify-center font-bold">B</span>
            <span className="text-gray-600 dark:text-gray-400">75-89%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center justify-center font-bold">C</span>
            <span className="text-gray-600 dark:text-gray-400">60-74%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center font-bold">D</span>
            <span className="text-gray-600 dark:text-gray-400">50-59%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 flex items-center justify-center font-bold">F</span>
            <span className="text-gray-600 dark:text-gray-400">0-49%</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StudentGrades
