import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Clear localStorage for a specific system and sign out
 * @param client Supabase client for the system
 * @param prefix localStorage prefix (e.g., 'teacher_', 'academic_', 'hr_', 'registration_')
 */
export async function clearSystemSession(
  client: SupabaseClient,
  prefix: string
): Promise<void> {
  try {
    // Clear all localStorage items with the system prefix
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))

    // Sign out from Supabase
    await client.auth.signOut()
  } catch (error) {
    console.error(`Error during ${prefix} logout:`, error)
    // Continue even if signOut fails - user should be able to logout
  }
}

/**
 * Teacher system logout helper
 */
export async function teacherLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'teacher_')
}

/**
 * Academic system logout helper
 */
export async function academicLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'academic_')
}

/**
 * HR system logout helper
 */
export async function hrLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'hr_')
}

/**
 * Registration system logout helper
 */
export async function registrationLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'registration_')
}

/**
 * Central system logout helper
 */
export async function centralLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'central_')
}

/**
 * Student system logout helper
 */
export async function studentLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'student_')
}

/**
 * Curriculum system logout helper
 */
export async function curriculumLogout(client: SupabaseClient): Promise<void> {
  await clearSystemSession(client, 'curriculum_')
}
