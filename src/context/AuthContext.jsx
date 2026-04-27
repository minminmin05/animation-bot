import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../config/supabaseClient'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileData, setProfileData] = useState(null)

  useEffect(() => {
    let mounted = true
    let isInitialLoad = true

    // Get initial session with timeout
    const getInitialSession = async () => {
      try {
        console.log('Fetching initial session...')

        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
        )

        const { data: { session }, error } = await Promise.race([
          supabase.auth.getSession(),
          timeoutPromise
        ])

        if (error) {
          console.error('Supabase session error:', error)
        }

        if (mounted) {
          if (session?.user) {
            console.log('Session found, user:', session.user.email)
            setUser(session.user)
            // Don't wait for role fetch - set loading to false immediately
            fetchUserRole(session.user.id).catch(err =>
              console.log('Role fetch failed (non-critical):', err.message)
            )
          } else {
            console.log('No session found')
          }

          // Always set loading to false, regardless of role fetch
          setLoading(false)
          isInitialLoad = false
        }
      } catch (error) {
        console.error('Error getting session:', error)
        if (mounted) {
          setLoading(false)
          isInitialLoad = false
        }
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event)
        if (mounted) {
          if (session?.user) {
            setUser(session.user)
            if (!isInitialLoad) {
              fetchUserRole(session.user.id).catch(err =>
                console.log('Role fetch failed:', err.message)
              )
            }
          } else {
            setUser(null)
            setUserRole(null)
            setProfileData(null)
          }
          if (isInitialLoad) {
            setLoading(false)
            isInitialLoad = false
          }
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const fetchUserRole = async (userId) => {
    try {
      console.log('Fetching user role for:', userId)
      const { data, error } = await supabase
        .from('users')
        .select('role, full_name, email')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user role:', error.message)
        // Set default role instead of throwing
        setUserRole('admin') // Default fallback
        return
      }

      console.log('User role found:', data?.role)
      setUserRole(data?.role || 'admin')

      // Fetch additional profile data based on role (non-critical)
      if (data?.role) {
        fetchProfileData(userId, data.role).catch(err =>
          console.log('Profile fetch failed (non-critical):', err.message)
        )
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error)
      setUserRole('admin') // Default fallback
    }
  }

  const fetchProfileData = async (userId, role) => {
    try {
      let table = ''
      if (role === 'student') table = 'students'
      else if (role === 'teacher') table = 'teachers'
      else if (role === 'parent') table = 'parents'
      else return

      console.log('Fetching profile data from table:', table)
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        console.log('No profile data found:', error.message)
      } else if (data) {
        console.log('Profile data found')
        setProfileData(data)
      }
    } catch (error) {
      console.error('Error fetching profile data:', error)
    }
  }

  const signUp = async (email, password, fullName, role) => {
    try {
      console.log('Signing up:', email)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role
          }
        }
      })

      if (error) throw error

      return { data, error: null }
    } catch (error) {
      console.error('Signup error:', error)
      return { data: null, error }
    }
  }

  const signIn = async (email, password) => {
    try {
      console.log('Signing in:', email)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) {
        console.error('Sign in error:', error)
        throw error
      }

      console.log('Sign in successful')
      return { data, error: null }
    } catch (error) {
      console.error('Sign in error:', error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setUser(null)
      setUserRole(null)
      setProfileData(null)
      return { error: null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    user,
    userRole,
    profileData,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile: () => user && fetchUserRole(user.id)
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
