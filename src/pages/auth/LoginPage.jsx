import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-cream">
      {/* Left Panel - Branding */}
      <div className="lg:w-1/2 bg-gradient-to-br from-navy via-primary to-navy-light relative overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-72 h-72 bg-accent rounded-full filter blur-3xl animate-float"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-coral rounded-full filter blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gold rounded-full filter blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Grid Pattern Overlay */}
        <div className="absolute inset-0 bg-grid opacity-10"></div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col justify-center items-center p-12 text-center">
          {/* Logo */}
          <div className="mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-white/10 backdrop-blur-sm rounded-3xl border border-white/20 mb-6">
              <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-5xl font-display font-bold text-white mb-3">Lumaid</h1>
            <p className="text-xl text-white/70 font-light">School Management Platform</p>
          </div>

          {/* Features */}
          <div className="mt-12 space-y-4 max-w-md">
            <div className="flex items-center gap-4 text-white/80 animate-fade-in delay-200">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-left">Streamlined academic management</span>
            </div>
            <div className="flex items-center gap-4 text-white/80 animate-fade-in delay-300">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-left">Real-time grade tracking</span>
            </div>
            <div className="flex items-center gap-4 text-white/80 animate-fade-in delay-400">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-left">Seamless parent-teacher communication</span>
            </div>
          </div>
        </div>

        {/* Bottom Wave */}
        <svg className="absolute bottom-0 left-0 w-full" viewBox="0 0 1440 120" fill="none">
          <path d="M0 120L60 105C120 90 240 60 360 45C480 30 600 30 720 37.5C840 45 960 60 1080 67.5C1200 75 1320 75 1380 75L1440 75V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" className="fill-cream"/>
        </svg>
      </div>

      {/* Right Panel - Login Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden text-center mb-8 animate-fade-in">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-navy to-primary rounded-2xl mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h1 className="text-3xl font-display font-bold text-navy">Lumaid</h1>
          </div>

          {/* Welcome Text */}
          <div className="mb-8 animate-fade-in">
            <h2 className="text-3xl font-display font-bold text-navy mb-2">Welcome back</h2>
            <p className="text-text-muted">Sign in to access your dashboard</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl animate-scale-in">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="animate-fade-in delay-100">
              <label htmlFor="email" className="block text-sm font-semibold text-navy mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="input-field pl-12"
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="animate-fade-in delay-200">
              <label htmlFor="password" className="block text-sm font-semibold text-navy mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input-field pl-12"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
            </div>

            <div className="flex items-center justify-between animate-fade-in delay-300">
              <label className="flex items-center cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 text-accent border-navy/20 rounded focus:ring-accent/50" />
                <span className="ml-2 text-sm text-text-secondary group-hover:text-navy transition-colors">Remember me</span>
              </label>
              <a href="#" className="text-sm font-medium text-accent hover:text-accent-hover transition-colors">
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full animate-fade-in delay-400 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="spinner w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-8 text-center animate-fade-in delay-500">
            <p className="text-text-muted">
              Don't have an account?{' '}
              <Link to="/signup" className="font-semibold text-accent hover:text-accent-hover transition-colors">
                Create one
              </Link>
            </p>
          </div>

          {/* Demo Accounts */}
          <div className="mt-8 p-5 bg-white rounded-2xl border border-navy/5 shadow-soft animate-fade-in">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold text-navy">Demo Accounts</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-text-muted">
                <span className="w-2 h-2 rounded-full bg-accent"></span>
                admin@school.com
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="w-2 h-2 rounded-full bg-sage"></span>
                teacher@school.com
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="w-2 h-2 rounded-full bg-coral"></span>
                student@school.com
              </div>
              <div className="flex items-center gap-2 text-text-muted">
                <span className="w-2 h-2 rounded-full bg-gold"></span>
                parent@school.com
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-navy/5 text-center">
              <p className="text-xs text-text-muted">Password: <span className="font-mono font-semibold text-navy">demo1234</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
