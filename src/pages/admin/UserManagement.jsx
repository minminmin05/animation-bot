import { useEffect, useState } from 'react'
import { supabase } from '../../config/supabaseClient'
import { createClient } from '@supabase/supabase-js'
import { Spinner } from '../../components/Spinner'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, UserCheck, UserX, Shield, Users as UsersIcon, AlertCircle, Trash2, X, User } from 'lucide-react'

// Create admin client with service role key for user creation
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

let supabaseAdmin = null
if (supabaseServiceKey) {
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
}

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-sage/10', text: 'text-sage', iconBg: 'bg-sage/20' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' },
  }

  const colors = colorClasses[color] || colorClasses.blue

  return (
    <div className={`stat-card ${colors.bg} border-${color === 'green' ? 'sage' : color === 'red' ? 'red' : color === 'purple' ? 'purple' : 'navy'}/10`}>
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.iconBg} flex items-center justify-center`}>
          <Icon size={20} className={colors.text} strokeWidth={2} />
        </div>
      </div>
      <p className="text-2xl font-display font-bold text-navy">{value}</p>
      <p className="text-sm text-text-muted mt-1">{title}</p>
    </div>
  )
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

    console.log('Creating user with data:', {
      email: trimmedEmail,
      password: '***',
      fullName: trimmedName,
      role: formData.role
    })

    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          password: trimmedPassword,
          fullName: trimmedName,
          role: formData.role
        }
      })

      console.log('Edge Function Response:', { data, error })

      if (error) {
        console.error('Edge Function Error:', error)
        setFormError(error.message || 'Failed to create user')
        setSubmitting(false)
        return
      }

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
      case 'admin': return 'bg-coral/10 text-coral border-coral'
      case 'teacher': return 'bg-purple-50 text-purple-600 border-purple-200'
      case 'student': return 'bg-blue-50 text-blue-600 border-blue-200'
      case 'parent': return 'bg-sage/10 text-sage border-sage'
      default: return 'bg-cream text-text-muted border-cream-dark'
    }
  }

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <Shield className="w-4 h-4" />
      case 'teacher': return <UserCheck className="w-4 h-4" />
      case 'student': return <UsersIcon className="w-4 h-4" />
      case 'parent': return <UserX className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-bold text-navy">User Management</h1>
          <p className="text-text-secondary mt-1">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
        <StatCard
          title="Students"
          value={users.filter(u => u.role === 'student').length}
          icon={UsersIcon}
          color="blue"
        />
        <StatCard
          title="Teachers"
          value={users.filter(u => u.role === 'teacher').length}
          icon={UserCheck}
          color="purple"
        />
        <StatCard
          title="Parents"
          value={users.filter(u => u.role === 'parent').length}
          icon={UserX}
          color="green"
        />
        <StatCard
          title="Admins"
          value={users.filter(u => u.role === 'admin').length}
          icon={Shield}
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="card animate-fade-in" style={{ animationDelay: '150ms' }}>
        <div className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
              />
            </div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input-field w-auto sm:w-40"
            >
              <option value="all">All Roles</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="parent">Parents</option>
              <option value="admin">Admins</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card card-hover animate-fade-in" style={{ animationDelay: '200ms' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-cream-dark bg-cream/30">
                <th className="text-left p-4 text-sm font-medium text-text-muted">User</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Role</th>
                <th className="text-left p-4 text-sm font-medium text-text-muted">Joined</th>
                <th className="text-right p-4 text-sm font-medium text-text-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-text-muted">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-cream-dark/50 hover:bg-cream/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                          user.role === 'admin' ? 'bg-coral' :
                          user.role === 'teacher' ? 'bg-purple-500' :
                          user.role === 'student' ? 'bg-blue-500' :
                          'bg-sage'
                        }`}>
                          {(user.full_name || user.email)[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-navy">
                            {user.full_name || 'Not set'}
                          </p>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-text-muted">{user.email}</p>
                            {user.id === currentUser?.id && (
                              <span className="text-xs text-accent">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border-2 ${getRoleBadgeColor(user.role)}`}>
                        {getRoleIcon(user.role)}
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </td>
                    <td className="p-4 text-text-secondary">
                      {new Date(user.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="p-4">
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
                          className="text-coral hover:text-accent-hover text-sm disabled:opacity-50 disabled:cursor-not-allowed p-1 transition-colors"
                          title="Delete user"
                        >
                          <Trash2 size={16} strokeWidth={2} />
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
        <div className="fixed inset-0 bg-navy/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-strong max-w-md w-full max-h-[90vh] overflow-y-auto animate-scale-in">
            <div className="flex items-center justify-between p-6 border-b border-cream-dark">
              <h2 className="text-xl font-display font-semibold text-navy">Add New User</h2>
              <button
                onClick={() => {
                  setShowModal(false)
                  resetForm()
                }}
                className="text-text-muted hover:text-navy transition-colors"
              >
                <X size={24} strokeWidth={2} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-coral/10 border border-coral/30 rounded-xl animate-scale-in">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-coral mt-0.5 flex-shrink-0" />
                    <p className="text-coral text-sm">{formError}</p>
                  </div>
                </div>
              )}

              {formSuccess && (
                <div className="p-3 bg-sage/10 border border-sage/30 rounded-xl animate-scale-in">
                  <p className="text-sage text-sm">{formSuccess}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
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
                <label className="block text-sm font-medium text-navy mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  onBlur={(e) => setFormData({ ...formData, email: e.target.value.trim() })}
                  className="input-field"
                  placeholder="you@example.com"
                  required
                />
                <p className="text-xs text-text-muted mt-1.5">
                  Test mode - any valid email format works
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field"
                  placeholder="Enter password (min 4 characters)"
                  minLength={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-navy mb-2">
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
                  className="flex-1 btn-secondary"
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

              <p className="text-xs text-text-muted text-center">
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
