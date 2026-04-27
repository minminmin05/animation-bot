import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentGrades = () => {
  const { profileData } = useAuth()
  const [grades, setGrades] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTerm, setSelectedTerm] = useState('all')

  useEffect(() => {
    fetchGrades()
  }, [])

  const fetchGrades = async () => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select(`
          *,
          assignments (title, total_points, assignment_type),
          classes (name, subject)
        `)
        .eq('student_id', profileData?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGrades(data || [])
    } catch (error) {
      console.error('Error fetching grades:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredGrades = selectedTerm === 'all'
    ? grades
    : grades.filter(g => g.term === selectedTerm)

  const terms = [...new Set(grades.map(g => g.term))]

  // Calculate average
  const averageGrade = filteredGrades.length > 0
    ? (filteredGrades.reduce((sum, g) => sum + (g.grade || 0), 0) / filteredGrades.length).toFixed(1)
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Grades</h1>
          <p className="text-gray-500 dark:text-gray-400">View all your grades and performance</p>
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Average Grade</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{averageGrade}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Assignments</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{filteredGrades.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">Passed</p>
          <p className="text-3xl font-bold text-green-600 mt-2">
            {filteredGrades.filter(g => g.grade >= 60).length}
          </p>
        </div>
      </div>

      {/* Grades Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Assignment</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Subject</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Type</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Score</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Term</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredGrades.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No grades found
                  </td>
                </tr>
              ) : (
                filteredGrades.map((grade) => (
                  <tr key={grade.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {grade.assignments?.title || 'Assignment'}
                      </p>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {grade.classes?.subject || 'N/A'}
                    </td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs capitalize">
                        {grade.assignments?.assignment_type || 'homework'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        grade.grade >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        grade.grade >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {grade.grade || 0}%
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{grade.term}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {new Date(grade.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default StudentGrades
