import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../config/supabaseClient'

const StudentProfile = () => {
  const { user, profileData, refreshProfile } = useAuth()
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: profileData?.name || '',
    phone: profileData?.phone || '',
    address: profileData?.address || '',
    date_of_birth: profileData?.date_of_birth || ''
  })
  const [message, setMessage] = useState({ type: '', text: '' })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })

    try {
      const { error } = await supabase
        .from('students')
        .update({
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          date_of_birth: formData.date_of_birth
        })
        .eq('user_id', user.id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
      setEditing(false)
      refreshProfile()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Profile</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your personal information</p>
      </div>

      {/* Message */}
      {message.text && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profileData?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{profileData?.name || 'Student'}</h2>
              <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="btn-secondary"
            >
              Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Account Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Account Information</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input-field bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value="Student"
                  disabled
                  className="input-field bg-gray-50 dark:bg-gray-700 cursor-not-allowed capitalize"
                />
              </div>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Personal Information</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  name="name"
                  type="text"
                  value={editing ? formData.name : (profileData?.name || '')}
                  onChange={handleChange}
                  disabled={!editing}
                  className={`input-field ${!editing ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Class
                  </label>
                  <input
                    type="text"
                    value={profileData?.class || 'N/A'}
                    disabled
                    className="input-field bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Grade Level
                  </label>
                  <input
                    type="text"
                    value={profileData?.grade_level || 'N/A'}
                    disabled
                    className="input-field bg-gray-50 dark:bg-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date of Birth
                </label>
                <input
                  name="date_of_birth"
                  type="date"
                  value={editing ? formData.date_of_birth : (profileData?.date_of_birth || '')}
                  onChange={handleChange}
                  disabled={!editing}
                  className={`input-field ${!editing ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  name="phone"
                  type="tel"
                  value={editing ? formData.phone : (profileData?.phone || 'N/A')}
                  onChange={handleChange}
                  disabled={!editing}
                  className={`input-field ${!editing ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Address
                </label>
                <textarea
                  name="address"
                  value={editing ? formData.address : (profileData?.address || 'N/A')}
                  onChange={handleChange}
                  disabled={!editing}
                  rows={3}
                  className={`input-field resize-none ${!editing ? 'bg-gray-50 dark:bg-gray-700' : ''}`}
                  placeholder="Your address"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          {editing && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                type="submit"
                disabled={loading}
                className="btn-primary disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false)
                  setFormData({
                    name: profileData?.name || '',
                    phone: profileData?.phone || '',
                    address: profileData?.address || '',
                    date_of_birth: profileData?.date_of_birth || ''
                  })
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
        <h3 className="text-lg font-medium text-red-600 dark:text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Once you delete your account, there is no going back. Please be certain.
        </p>
        <button className="btn-danger">Delete Account</button>
      </div>
    </div>
  )
}

export default StudentProfile
