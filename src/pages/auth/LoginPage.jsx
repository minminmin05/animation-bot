import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { Mail, Lock, BookOpen, Check } from 'lucide-react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await signIn(email, password)

    if (signInError) {
      setError(signInError.message || 'Failed to sign in')
      setLoading(false)
      return
    }

    setLoading(false)
  }

  const demoAccounts = [
    { email: 'admin@school.com', role: 'Admin', color: 'bg-navy' },
    { email: 'teacher@school.com', role: 'Teacher', color: 'bg-sage' },
    { email: 'student@school.com', role: 'Student', color: 'bg-coral' },
    { email: 'parent@school.com', role: 'Parent', color: 'bg-gold' },
  ]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
      {/* Left Panel - Branding */}
      <div className="lg:w-1/2 bg-navy relative overflow-hidden">
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 bg-grid opacity-5"></div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center p-12 text-center">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-5">
              <BookOpen className="w-8 h-8 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-4xl font-display font-bold text-white mb-2">Lumaid</h1>
            <p className="text-white/60 text-sm">School Management Platform</p>
          </div>

          {/* Features */}
          <div className="mt-10 space-y-3 max-w-sm">
            {[
              'Streamlined academic management',
              'Real-time grade tracking',
              'Seamless parent-teacher communication',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-3 text-white/70 text-sm animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Check size={14} className="text-white" strokeWidth={2.5} />
                </div>
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom subtle wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 80" fill="none">
          <path d="M0 80L60 75C120 70 240 60 360 55C480 50 600 50 720 52.5C840 55 960 60 1080 62.5C1200 65 1320 65 1380 65L1440 65V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0Z" className="fill-cream"/>
        </svg>
      </div>

      {/* Right Panel - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-navy rounded-xl mb-3">
              <BookOpen className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <h1 className="text-2xl font-display font-bold text-navy">Lumaid</h1>
          </div>

          {/* Welcome Text */}
          <div className="mb-8 animate-fade-in" style={{ animationDelay: '100ms' }}>
            <h2 className="text-2xl font-display font-bold text-navy mb-1">Welcome back</h2>
            <p className="text-text-secondary text-sm">Sign in to access your dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 bg-red-50 border border-red-100 rounded-xl animate-scale-in">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="animate-fade-in" style={{ animationDelay: '150ms' }}>
              <label htmlFor="email" className="block text-sm font-medium text-navy mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail size={18} className="text-text-muted" strokeWidth={2} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-11"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <label htmlFor="password" className="block text-sm font-medium text-navy mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock size={18} className="text-text-muted" strokeWidth={2} />
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pl-11"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between animate-fade-in" style={{ animationDelay: '250ms' }}>
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-accent border-cream-dark rounded focus:ring-accent/50" />
                <span className="ml-2 text-sm text-text-secondary group-hover:text-navy transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full animate-fade-in disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              style={{ animationDelay: '300ms' }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="spinner w-4 h-4"></div>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center animate-fade-in" style={{ animationDelay: '350ms' }}>
            <p className="text-text-secondary text-sm">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-accent hover:text-accent-hover transition-colors">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 p-4 bg-white rounded-2xl border border-cream-dark shadow-soft animate-fade-in" style={{ animationDelay: '400ms' }}>
            <p className="text-sm font-semibold text-navy mb-3">Demo Accounts</p>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((account) => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword('demo1234')
                  }}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-cream transition-colors text-left"
                >
                  <div className={`w-2 h-2 rounded-full ${account.color}`}></div>
                  <span className="text-xs text-text-secondary truncate">{account.role}</span>
                </button>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-cream-dark text-center">
              <p className="text-xs text-text-muted">Password: <span className="font-mono font-medium text-navy">demo1234</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
