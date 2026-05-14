/**
 * TEACHER MANAGEMENT DEBUG COMPONENT
 *
 * Use this component to diagnose why teachers aren't showing up.
 * Import and use alongside TeacherManagement in development.
 */

import { useEffect, useState } from 'react'
import { centralSupabase } from '@/integrations/supabase/central-client'

interface DebugInfo {
  step: string
  status: 'pending' | 'success' | 'error'
  message: string
  data?: any
  error?: any
}

export function TeacherManagementDebug() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([
    { step: 'Checking authentication...', status: 'pending', message: '' },
    { step: 'Fetching teachers (raw)...', status: 'pending', message: '' },
    { step: 'Checking users table...', status: 'pending', message: '' },
    { step: 'Testing teacher-users join...', status: 'pending', message: '' },
    { step: 'Checking RLS policies...', status: 'pending', message: '' },
  ])

  const runDiagnostics = async () => {
    const results: DebugInfo[] = []

    // 1. Check Authentication
    try {
      const { data: { session }, error } = await centralSupabase.auth.getSession()
      if (error) throw error
      results.push({
        step: '1. Authentication',
        status: session ? 'success' : 'error',
        message: session
          ? `Logged in as: ${session.user.email} (ID: ${session.user.id})`
          : 'No active session! Please log in.',
        data: session ? { id: session.user.id, email: session.user.email, role: session.user?.user_metadata?.role } : null
      })
    } catch (e: any) {
      results.push({
        step: '1. Authentication',
        status: 'error',
        message: e.message,
        error: e
      })
    }

    // 2. Check teachers table (raw count)
    try {
      const { count, error } = await centralSupabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })

      results.push({
        step: '2. Teachers table count',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${count} teacher(s) in database`,
        data: { count }
      })
    } catch (e: any) {
      results.push({
        step: '2. Teachers table count',
        status: 'error',
        message: e.message,
        error: e
      })
    }

    // 3. Check users table for teacher role
    try {
      const { count, error } = await centralSupabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'teacher')

      results.push({
        step: '3. Users with teacher role',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Found ${count} user(s) with role='teacher'`,
        data: { count }
      })
    } catch (e: any) {
      results.push({
        step: '3. Users with teacher role',
        status: 'error',
        message: e.message,
        error: e
      })
    }

    // 4. Test the actual query (with join)
    try {
      const { data, error } = await centralSupabase
        .from('teachers')
        .select('id, name, users (email, role)')

      results.push({
        step: '4. Teacher-Users join query',
        status: error ? 'error' : (data && data.length > 0 ? 'success' : 'error'),
        message: error
          ? error.message
          : `Query returned ${data?.length || 0} teacher(s)`,
        data: {
          count: data?.length || 0,
          teachers: data?.map((t: any) => ({
            id: t.id,
            name: t.name,
            hasUser: !!t.users,
            userEmail: t.users?.email || 'MISSING'
          }))
        }
      })
    } catch (e: any) {
      results.push({
        step: '4. Teacher-Users join query',
        status: 'error',
        message: e.message,
        error: e
      })
    }

    // 5. Check for orphaned teachers (via RPC - needs to be created)
    results.push({
      step: '5. Recommendation',
      status: 'pending',
      message: 'Run the SQL diagnostics in Supabase SQL Editor to check for orphaned records'
    })

    setDebugInfo(results)
  }

  useEffect(() => {
    runDiagnostics()
  }, [])

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-sm">🔍 Teacher Data Diagnostics</h3>
        <button
          onClick={runDiagnostics}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Re-run
        </button>
      </div>
      <div className="space-y-2">
        {debugInfo.map((info, idx) => (
          <div key={idx} className="text-xs border-b border-gray-100 dark:border-gray-700 pb-2 last:border-0">
            <div className="flex items-center gap-2">
              <span className="font-medium">{info.step}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                info.status === 'success' ? 'bg-green-100 text-green-700' :
                info.status === 'error' ? 'bg-red-100 text-red-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {info.status.toUpperCase()}
              </span>
            </div>
            <div className="text-gray-600 dark:text-gray-400 mt-1">{info.message}</div>
            {info.data && (
              <details className="mt-1">
                <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                  View data
                </summary>
                <pre className="text-[10px] bg-gray-50 dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                  {JSON.stringify(info.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
