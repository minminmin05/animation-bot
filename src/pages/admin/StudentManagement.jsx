import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    class: '',
    grade_level: '',
    date_of_birth: '',
    phone: '',
    address: ''
  })

  useEffect(() => {
    fetchStudents()
  }, [])

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*, users (email, role)')
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error('Error fetching students:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      // First, we need to create a user in auth (this would typically be done via an edge function)
      // For now, we'll just show a message
      alert('To add a student, please use the signup page or contact Supabase to create a user first.\n\nThen you can link the student profile here.')
      setShowModal(false)
    } catch (error) {
      console.error('Error creating student:', error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (error) throw error
      setStudents(students.filter(s => s.id !== id))
    } catch (error) {
      console.error('Error deleting student:', error)
      alert('Failed to delete student')
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage all students in the system</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + Add Student
        </button>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Student</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Class</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Grade</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Contact</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Enrolled</th>
                <th className="text-right p-4 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No students found
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                          {student.name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{student.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{student.users?.email || 'No email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.class || 'N/A'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">Grade {student.grade_level || 'N/A'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">{student.phone || 'N/A'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {new Date(student.enrollment_date || student.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(student.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add Student</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-yellow-800 dark:text-yellow-400">
                  <strong>Note:</strong> Students must first sign up via the registration page. After signup, their profile can be linked here.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Class
                    </label>
                    <input
                      type="text"
                      value={formData.class}
                      onChange={(e) => setFormData({ ...formData, class: e.target.value })}
                      className="input-field"
                      placeholder="10A"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Grade Level
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={formData.grade_level}
                      onChange={(e) => setFormData({ ...formData, grade_level: e.target.value })}
                      className="input-field"
                      placeholder="10"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="+1 234 567 8900"
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="submit" className="flex-1 btn-primary">Add Student</button>
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
        </div>
      )}
    </div>
  )
}

export default StudentManagement
