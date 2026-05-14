import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import { Shield, Mail, Lock, User, CheckCircle2, Settings, AlertCircle } from 'lucide-react'

const SetupPage = () => {
  const [formData, setFormData] = useState({
    email: 'admin@school.com',
    password: '',
    confirmPassword: '',
    fullName: 'Admin User'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const { count, error: countError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      if (countError) {
        throw new Error('Failed to check system status')
      }

      if (count && count > 0) {
        setError('System is already set up. Please use the login page.')
        setLoading(false)
        return
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'admin'
          }
        }
      })

      if (signUpError) {
        throw signUpError
      }

      setSuccess(true)

      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Admin account created! Please sign in.',
            email: formData.email
          }
        })
      }, 2000)

    } catch (err) {
      setError(err.message || 'Failed to create admin account')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center p-4">
        <div className="max-w-md w-full card text-center p-12 animate-scale-in">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-sage/20 rounded-2xl mb-4">
            <CheckCircle2 size={32} strokeWidth={2.5} className="text-sage" />
          </div>
          <h2 className="text-2xl font-display font-bold text-navy mb-2">Setup Complete!</h2>
          <p className="text-text-secondary">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-2xl mb-4">
            <Settings size={28} strokeWidth={2} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-navy">Initial Setup</h1>
          <p className="text-text-secondary mt-2">Create your admin account</p>
        </div>

        <div className="card animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6 p-4 bg-gold/10 border border-gold/30 rounded-xl flex gap-3">
              <AlertCircle size={20} strokeWidth={2} className="text-gold flex-shrink-0 mt-0.5" />
              <p className="text-navy text-sm">
                This is the initial setup for your School Management System. The account you create will have full admin privileges.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-navy mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <User size={18} strokeWidth={2} className="text-text-muted" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                    className="input-field pl-11"
                    placeholder="Admin User"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-navy mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail size={18} strokeWidth={2} className="text-text-muted" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="input-field pl-11"
                    placeholder="admin@school.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-navy mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} strokeWidth={2} className="text-text-muted" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="input-field pl-11"
                    placeholder="Minimum 6 characters"
                    autoComplete="new-password"
                    minLength={6}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock size={18} strokeWidth={2} className="text-text-muted" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    required
                    className="input-field pl-11"
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner w-4 h-4"></div>
                    Creating...
                  </span>
                ) : 'Create Admin Account'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-xs text-center text-text-muted mt-4">
          After setup, you can create additional users from the admin dashboard
        </p>
      </div>
    </div>
  )
}

export default SetupPage
