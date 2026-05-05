import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../config/supabaseClient'
import { BookOpen, Mail, Lock, User, GraduationCap } from 'lucide-react'

const roles = [
  { value: 'student', label: 'Student', description: 'Access grades, schedule, and assignments' },
  { value: 'teacher', label: 'Teacher', description: 'Manage classes, grades, and assignments' },
  { value: 'parent', label: 'Parent', description: 'Monitor child progress and attendance' },
  { value: 'admin', label: 'Admin', description: 'Full system access and user management' }
]

const SignupPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'student'
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: formData.role
          },
          emailRedirectTo: `${window.location.origin}/login`
        }
      })

      if (signUpError) {
        throw signUpError
      }

      navigate('/login', {
        state: {
          message: 'Account created successfully! Please sign in.',
          email: formData.email
        }
      })
    } catch (err) {
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Title */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-navy rounded-2xl mb-4">
            <BookOpen size={28} strokeWidth={2} className="text-white" />
          </div>
          <h1 className="text-3xl font-display font-bold text-navy">Create Account</h1>
          <p className="text-text-secondary mt-2">Join the School Management System</p>
        </div>

        {/* Signup Form */}
        <div className="card animate-fade-in" style={{ animationDelay: '100ms' }}>
          <div className="p-8">
            {error && (
              <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

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
                    placeholder="John Doe"
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
                    placeholder="you@example.com"
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

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-navy mb-2">
                  I am a...
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <GraduationCap size={18} strokeWidth={2} className="text-text-muted" />
                  </div>
                  <select
                    id="role"
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="input-field pl-11 appearance-none"
                  >
                    {roles.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="mt-1.5 text-xs text-text-muted">
                  {roles.find(r => r.value === formData.role)?.description}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 mt-6"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="spinner w-4 h-4"></div>
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-text-secondary">
                Already have an account?{' '}
                <Link to="/login" className="text-accent hover:text-accent-hover font-medium">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-center text-text-muted mt-4">
          No email confirmation required - account ready to use immediately
        </p>
      </div>
    </div>
  )
}

export default SignupPage
