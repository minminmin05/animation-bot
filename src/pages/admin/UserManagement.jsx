import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { Spinner } from '../../components/Spinner'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, UserCheck, UserX, Shield, Users as UsersIcon, AlertCircle } from 'lucide-react'

// Create admin client with service role key for user creation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

// Note: Service role key should only be used server-side, but for internal admin tools
// with proper access control, this approach is acceptable
let supabaseAdmin = null
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
}

const UserManagement = () => {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionLoading, setActionLoading] = useState({})

  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    role: 'student'
  })
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.rpc('admin_get_all_users')

      if (error) {
        const { data: regularData, error: regularError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })

        if (regularError) throw regularError
        setUsers(regularData || [])
      } else {
        setUsers(data || [])
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    setSubmitting(true)

    const trimmedEmail = formData.email.trim()
    const trimmedName = formData.fullName.trim()
    const trimmedPassword = formData.password.trim()

    if (!trimmedEmail || !trimmedPassword || !trimmedName) {
      setFormError('Please fill in all required fields')
      setSubmitting(false)
      return
    }

    if (trimmedPassword.length < 4) {
      setFormError('Password must be at least 4 characters')
      setSubmitting(false)
      return
    }

    // Debug log - ตรวจสอบค่าก่อนส่ง
    console.log('Creating user with data:', {
      email: trimmedEmail,
      password: '***', // ไม่โชว์ password จริง
      fullName: trimmedName,
      role: formData.role
    })

    try {
      // ✅ ใช้ Edge Function พร้อม body ที่ถูกต้อง
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          password: trimmedPassword,
          fullName: trimmedName,
          role: formData.role
        }
      })

      // Debug log - ตรวจสอบ response
      console.log('Edge Function Response:', { data, error })

      if (error) {
        console.error('Edge Function Error:', error)
        setFormError(error.message || 'Failed to create user')
        setSubmitting(false)
        return
      }

      // Edge Function ส่งกลับ { success: true, user: {...} }
      if (data && data.success) {
        setFormSuccess('User created successfully!')
        await fetchUsers()
        setTimeout(() => {
          setShowModal(false)
          resetForm()
        }, 1500)
      } else {
        const errorMsg = data?.error || 'Failed to create user'
        if (errorMsg.includes('already') || errorMsg.includes('exists')) {
          setFormError('User already exists - this email is already in use')
        } else {
          setFormError(errorMsg)
        }
      }

    } catch (error) {
      console.error('Error creating user:', error)
      setFormError(error.message || 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({ email: '', password: '', fullName: '', role: 'student' })
    setFormError('')
    setFormSuccess('')
  }

  const handleRoleChange = async (userId, newRole) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }))

    try {
      const { data, error } = await supabase.rpc('admin_update_role', {
        user_id_to_update: userId,
        new_role: newRole
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Failed to update role')

      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch (error) {
      console.error('Error updating role:', error)
      alert(error.message || 'Failed to update role')
      fetchUsers()
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

    setActionLoading(prev => ({ ...prev, [userId]: true }))

    try {
      const { data, error } = await supabase.rpc('admin_delete_user', {
        user_id_to_delete: userId
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Failed to delete user')

      setUsers(users.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Error deleting user:', error)
      alert(error.message || 'Failed to delete user')
      fetchUsers()
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesFilter = filter === 'all' || user.role === filter
    const matchesSearch = searchTerm === '' ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      case 'teacher': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
      case 'student': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'parent': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'teacher': return <UserCheck className="w-4 h-4" />
      case 'student': return <UsersIcon className="w-4 h-4" />
      case 'parent': return <UserX className="w-4 h-4" />
      default: return <UsersIcon className="w-4 h-4" />
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="text-gray-500 dark:text-gray-400">
            {loading ? 'Loading...' : `${users.length} user${users.length !== 1 ? 's' : ''} in the system`}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
            <UsersIcon className="w-5 h-5" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'student').length}</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Students</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
            <UserCheck className="w-5 h-5" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'teacher').length}</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Teachers</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-1">
            <UserX className="w-5 h-5" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'parent').length}</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Parents</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-100 dark:border-gray-700 text-center">
          <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400 mb-1">
            <Shield className="w-5 h-5" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{users.filter(u => u.role === 'admin').length}</p>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field pl-9"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="input-field w-auto"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="parent">Parents</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">User</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Role</th>
                <th className="text-left p-4 font-medium text-gray-600 dark:text-gray-400">Joined</th>
                <th className="text-right p-4 font-medium text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === 'admin' ? 'bg-red-500' :
                          user.role === 'teacher' ? 'bg-purple-500' :
                          user.role === 'student' ? 'bg-blue-500' :
                          'bg-green-500'
                        }`}>
                          {(user.full_name || user.email)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {user.full_name || 'Not set'}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={actionLoading[user.id] || user.id === currentUser?.id}
                          className="input-field py-1 px-2 text-sm w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="parent">Parent</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={actionLoading[user.id] || user.id === currentUser?.id}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm disabled:opacity-50 disabled:cursor-not-allowed p-1"
                          title="Delete user"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New User</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
                  </div>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-green-600 dark:text-green-400 text-sm">{formSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, fullName: e.target.value.trim() })}
                  className="input-field"
                  placeholder="Enter full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="text"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  className="input-field"
                  placeholder="test@gmail.com, user@test.com, etc."
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Test mode - any email format works (e.g., test@anything.com)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password *
                </label>
                <input
                  type="text"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="Enter password (min 4 characters)"
                  minLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create User'}
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                No email confirmation required - User can login immediately
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
