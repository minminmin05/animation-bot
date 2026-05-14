import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

async function checkAva() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  console.log('Checking for Ava Martinez...')

  // Get the student
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .ilike('name', '%Ava%')
    .limit(5)

  console.log('Students with Ava in name:', student?.length || 0)
  if (student) {
    student.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (ID: ${s.id})`)
    })
  }

  if (student && student.length > 0) {
    const ava = student.find(s => s.name.includes('Ava'))
    if (ava) {
      console.log('\nFound:', ava.name)

      // Get grades
      const { data: grades } = await supabase
        .from('student_subject_grades')
        .select('final_grade, letter_grade, classes!inner(subject, name)')
        .eq('student_id', ava.id)

      console.log('Grades:', grades?.length || 0)
      grades?.forEach(g => {
        console.log(`  - ${g.classes.subject}: ${g.final_grade} (${g.letter_grade})`)
      })
    }
  }
}

checkAva().catch(console.error)
