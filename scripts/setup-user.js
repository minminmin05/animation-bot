// Script to create user in database
// Run with: node scripts/setup-user.js <email> <role>

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import 'dotenv/config'

// Read .env file
const envContent = readFileSync('.env', 'utf-8')
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found in .env file')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupUser(email, role = 'admin') {
  console.log(`🔧 Setting up user: ${email} as ${role}...`)

  try {
    // Step 1: Get user from auth
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      console.error('❌ Error fetching users from auth:', authError.message)
      return
    }

    const targetUser = users.find(u => u.email === email)

    if (!targetUser) {
      console.error(`❌ User with email "${email}" not found in auth.`)
      console.log('💡 Please sign up first at: http://localhost:5173/signup')
      return
    }

    console.log(`✅ Found user in auth: ${targetUser.id}`)

    // Step 2: Check if user exists in users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', targetUser.id)

    if (existingUser && existingUser.length > 0) {
      console.log(`⚠️  User already exists in users table.`)
      console.log(`   Current role: ${existingUser[0].role}`)

      // Update role if needed
      if (existingUser[0].role !== role) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ role })
          .eq('id', targetUser.id)

        if (updateError) {
          console.error('❌ Error updating role:', updateError.message)
        } else {
          console.log(`✅ Role updated to: ${role}`)
        }
      }
    } else {
      // Step 3: Insert into users table
      const fullName = targetUser.user_metadata?.full_name || email.split('@')[0]
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          id: targetUser.id,
          email: targetUser.email,
          role: role,
          full_name: fullName
        })

      if (insertError) {
        // Try direct SQL approach
        console.error('❌ Error inserting user:', insertError.message)
        console.log('\n💡 You need to run this SQL in Supabase SQL Editor:')
        console.log(`
INSERT INTO users (id, email, role, full_name)
VALUES ('${targetUser.id}', '${email}', '${role}', '${fullName}');
        `)
        return
      }

      console.log(`✅ User added to users table with role: ${role}`)
    }

    // Step 4: Create role-specific profile if needed
    if (role === 'student') {
      const { data: existingStudent } = await supabase
        .from('students')
        .select('*')
        .eq('user_id', targetUser.id)

      if (!existingStudent || existingStudent.length === 0) {
        const { error: studentError } = await supabase
          .from('students')
          .insert({
            user_id: targetUser.id,
            name: fullName,
            class: '10A',
            grade_level: 10
          })

        if (studentError) {
          console.log('⚠️  Could not create student profile. Run SQL:')
          console.log(`INSERT INTO students (user_id, name, class, grade_level) VALUES ('${targetUser.id}', '${fullName}', '10A', 10);`)
        } else {
          console.log('✅ Student profile created')
        }
      }
    } else if (role === 'teacher') {
      const { data: existingTeacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('user_id', targetUser.id)

      if (!existingTeacher || existingTeacher.length === 0) {
        const { error: teacherError } = await supabase
          .from('teachers')
          .insert({
            user_id: targetUser.id,
            name: fullName,
            subject: 'Mathematics'
          })

        if (teacherError) {
          console.log('⚠️  Could not create teacher profile. Run SQL:')
          console.log(`INSERT INTO teachers (user_id, name, subject) VALUES ('${targetUser.id}', '${fullName}', 'Mathematics');`)
        } else {
          console.log('✅ Teacher profile created')
        }
      }
    }

    console.log('\n🎉 Setup complete! Refresh your browser to see changes.')

  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Get email and role from command line
const email = process.argv[2]
const role = process.argv[3] || 'admin'

if (!email) {
  console.log('Usage: node scripts/setup-user.js <email> [role]')
  console.log('Example: node scripts/setup-user.js admin@school.com admin')
  console.log('\nAvailable roles: admin, student, teacher, parent')
  process.exit(1)
}

setupUser(email, role)
