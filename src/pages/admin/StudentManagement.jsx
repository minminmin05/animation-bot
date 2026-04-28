import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { Spinner } from '../../components/Spinner'

/**
 * Student Management Page - Admin
 *
 * Displays all students with their associated user data (email, name)
 * Uses proper Supabase foreign key join syntax
 */
const StudentManagement = () => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
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

  /**
   * Fetch students with associated user data
   *
   * CORRECT SUPABASE JOIN SYNTAX:
   * - user:users = alias 'user' for the joined 'users' table
   * - The alias matches the foreign key column (user_id)
   * - No !inner = LEFT JOIN (shows all students, even without user)
   * - With !inner = INNER JOIN (only students with matching users)
   *
   * Format: foreign_key_name:table_name (columns to select)
   */
  const fetchStudents = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log('🔍 Fetching students...')

      const { data, error: fetchError, status, statusText } = await supabase
        .from('students')
        .select(`
          id,
          user_id,
          name,
          class,
          grade_level,
          phone,
          address,
          date_of_birth,
          enrollment_date,
          created_at,
          updated_at,
          user:users (
            id,
            email,
            full_name,
            role
          )
        `)
        .order('created_at', { ascending: false })

      // Detailed error logging for debugging
      if (fetchError) {
        console.error('❌ Supabase Error Details:', {
          message: fetchError.message,
          details: fetchError.details,
          hint: fetchError.hint,
          code: fetchError.code,
          status,
          statusText
        })

        // Check for common RLS issues
        if (fetchError.message.includes('permission denied') ||
            fetchError.message.includes('policy')) {
          throw new Error(
            'RLS Policy Issue: The students table has Row Level Security enabled ' +
            'but no policy allows reading. See RLS fix section.'
          )
        }

        throw fetchError
      }

      console.log('✅ Students fetched:', data?.length || 0)
      console.log('📊 Sample data:', data?.[0])

      setStudents(data || [])

      // Show helpful message if no students exist
      if (!data || data.length === 0) {
        console.warn('⚠️ No students found in database')
      }
    } catch (err) {
      console.error('❌ Error fetching students:', err)
      setError(err.message || 'Failed to fetch students')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle delete student
   */
  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return

    try {
      const { error: deleteError } = await supabase
        .from('students')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      // Update local state
      setStudents(prev => prev.filter(s => s.id !== id))
      console.log('✅ Student deleted successfully')
    } catch (err) {
      console.error('❌ Error deleting student:', err)
      alert('Failed to delete student: ' + err.message)
    }
  }

  /**
   * Handle form submit (placeholder for now)
   */
  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      alert('To add a student, please use the signup page or contact Supabase to create a user first.\n\nThen you can link the student profile here.')
      setShowModal(false)
    } catch (error) {
      console.error('Error creating student:', error)
    }
  }

  // ==================== LOADING STATE ====================
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Spinner size="large" />
        <p className="text-gray-500 dark:text-gray-400">Loading students...</p>
      </div>
    )
  }

  // ==================== ERROR STATE ====================
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="text-red-500 dark:text-red-400">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800 dark:text-red-400">Error Loading Students</h3>
            <p className="text-sm text-red-600 dark:text-red-500 mt-1">{error}</p>
            <div className="mt-4 text-sm text-red-700 dark:text-red-600">
              <p className="font-medium">Debugging Steps:</p>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Open Supabase SQL Editor and run: <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">SELECT COUNT(*) FROM students;</code></li>
                <li>Check if RLS is enabled: <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">SELECT * FROM pg_policies WHERE tablename = 'students';</code></li>
                <li>Verify the foreign key: <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">SELECT column_name, foreign_column_name FROM information_schema.table_constraints WHERE table_name = 'students';</code></li>
              </ol>
            </div>
          </div>
          <button
            onClick={fetchStudents}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // ==================== EMPTY STATE ====================
  if (students.length === 0) {
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

        {/* Empty State */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Students Found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
              There are no students in the system yet. Students will appear here after they sign up or are added by an administrator.
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-md">
              <p className="text-sm text-blue-800 dark:text-blue-400">
                <strong>To verify data exists:</strong> Run <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded">SELECT COUNT(*) FROM students;</code> in Supabase SQL Editor.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ==================== DATA DISPLAY ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {students.length} {students.length === 1 ? 'student' : 'students'} in the system
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          + Add Student
        </button>
      </div>

      {/* Debug Info - Remove in production */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 text-xs">
          <p><strong>Debug:</strong> Found {students.length} students</p>
          <p className="text-gray-500">Check browser console for detailed query logs</p>
        </div>
      )}

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
              {students.map((student) => (
                <tr key={student.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                        {student.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {student.name || 'Unnamed Student'}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {student.user?.email || student.user?.full_name || 'No user linked'}
                        </p>
                        {student.user?.role && (
                          <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                            {student.user.role}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {student.class || <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {student.grade_level ? `Grade ${student.grade_level}` : <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400 text-sm">
                    {student.phone || <span className="text-gray-400">N/A</span>}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-gray-400">
                    {new Date(student.enrollment_date || student.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(student.id)}
                      className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm font-medium hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
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
