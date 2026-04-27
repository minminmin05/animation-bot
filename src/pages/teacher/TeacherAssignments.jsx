import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const TeacherAssignments = () => {
  const { profileData } = useAuth()
  const [classes, setClasses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    class_id: '',
    due_date: '',
    total_points: 100,
    assignment_type: 'homework'
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      // Fetch classes
      const { data: classesData } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', profileData?.id)

      if (classesData) setClasses(classesData)

      // Fetch assignments
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('*, classes (name)')
        .eq('teacher_id', profileData?.id)
        .order('due_date', { ascending: false })

      if (assignmentsData) setAssignments(assignmentsData)
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const { error } = await supabase
        .from('assignments')
        .insert({
          ...formData,
          teacher_id: profileData?.id
        })

      if (error) throw error

      // Refresh assignments
      const { data } = await supabase
        .from('assignments')
        .select('*, classes (name)')
        .eq('teacher_id', profileData?.id)
        .order('due_date', { ascending: false })

      if (data) setAssignments(data)

      setShowModal(false)
      setFormData({
        title: '',
        description: '',
        class_id: '',
        due_date: '',
        total_points: 100,
        assignment_type: 'homework'
      })
    } catch (error) {
      console.error('Error creating assignment:', error)
      alert('Failed to create assignment')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAssignments(assignments.filter(a => a.id !== id))
    } catch (error) {
      console.error('Error deleting assignment:', error)
      alert('Failed to delete assignment')
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Assignments</h1>
          <p className="text-gray-500 dark:text-gray-400">Create and manage assignments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + New Assignment
        </button>
      </div>

      {/* Assignments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assignments.length === 0 ? (
          <div className="col-span-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12 text-center">
            <div className="text-4xl mb-4">📝</div>
            <p className="text-gray-500 dark:text-gray-400">No assignments yet. Create your first assignment!</p>
          </div>
        ) : (
          assignments.map((assignment) => {
            const dueDate = new Date(assignment.due_date)
            const isOverdue = dueDate < new Date()
            const isUrgent = !isOverdue && dueDate - new Date() < 3 * 24 * 60 * 60 * 1000

            return (
              <div
                key={assignment.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${
                    assignment.assignment_type === 'exam'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : assignment.assignment_type === 'quiz'
                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  }`}>
                    {assignment.assignment_type}
                  </span>
                  <button
                    onClick={() => handleDelete(assignment.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{assignment.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
                  {assignment.description || 'No description provided'}
                </p>

                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${
                    isOverdue
                      ? 'text-red-600 dark:text-red-400'
                      : isUrgent
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    Due: {dueDate.toLocaleDateString()}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {assignment.total_points} pts
                  </span>
                </div>

                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                  {assignment.classes?.name || 'Class'}
                </p>
              </div>
            )
          })
        )}
      </div>

      {/* Create Assignment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Assignment</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field"
                  placeholder="Assignment title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Assignment description"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Class
                </label>
                <select
                  required
                  value={formData.class_id}
                  onChange={(e) => setFormData({ ...formData, class_id: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select a class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={formData.due_date}
                  onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  className="input-field"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Total Points
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.total_points}
                    onChange={(e) => setFormData({ ...formData, total_points: parseInt(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={formData.assignment_type}
                    onChange={(e) => setFormData({ ...formData, assignment_type: e.target.value })}
                    className="input-field"
                  >
                    <option value="homework">Homework</option>
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="project">Project</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 btn-primary">Create Assignment</button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeacherAssignments
