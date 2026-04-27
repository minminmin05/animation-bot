import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const ChildGrades = () => {
  const { profileData } = useAuth()
  const [children, setChildren] = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [grades, setGrades] = useState([])
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
        fetchGrades(childrenData[0].id)
      }
    } catch (error) {
      console.error('Error fetching children:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchGrades = async (childId) => {
    try {
      const { data, error } = await supabase
        .from('grades')
        .select('*, classes (subject, name), assignments (title, assignment_type)')
        .eq('student_id', childId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGrades(data || [])
    } catch (error) {
      console.error('Error fetching grades:', error)
    }
  }

  const handleChildSelect = (child) => {
    setSelectedChild(child)
    fetchGrades(child.id)
  }

  // Calculate stats
  const averageGrade = grades.length > 0
    ? (grades.reduce((sum, g) => sum + (g.grade || 0), 0) / grades.length).toFixed(1)
    : 0

  const passingGrades = grades.filter(g => g.grade >= 60).length

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Child's Grades</h1>
        <p className="text-gray-500 dark:text-gray-400">View academic performance and progress</p>
      </div>

      {/* Child Selector */}
      {children.length > 0 && (
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Viewing grades for:</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Average Grade</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{averageGrade}%</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Assignments</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{grades.length}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">Passing</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{passingGrades}/{grades.length}</p>
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
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Grade</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Term</th>
                    <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                        No grades recorded yet
                      </td>
                    </tr>
                  ) : (
                    grades.map((grade) => (
                      <tr key={grade.id} className="border-t border-gray-100 dark:border-gray-700">
                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                          {grade.assignments?.title || 'Assignment'}
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

export default ChildGrades
