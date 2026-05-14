import { classifyIntentHybrid } from './rag/services/intent.service.js'
import dotenv from 'dotenv'
dotenv.config()

async function testFullFlow() {
  console.log('=== Full Flow Test for Statistics Questions ===\n')

  const question = 'มีนักเรียนกี่คน'

  console.log(`Question: "${question}"\n`)

  // Step 1: Intent classification
  const intentResult = await classifyIntentHybrid(question, { role: 'student' })
  console.log('Intent Classification:')
  console.log(`  Intent: ${intentResult.intent}`)
  console.log(`  Confidence: ${intentResult.confidence.toFixed(2)}`)
  console.log(`  Reasoning: ${intentResult.reasoning}`)
  console.log('')

  // Step 2: Check if statistics question
  const statsKeywords = /มี(กี่|ทั้งหมด|เท่าไร).*(นักเรียน|ครู|คน|นักเรียนทั้งหมด)|นักเรียน.*กี่คน|ครู.*กี่คน|จำนวน(นักเรียน|ครู|คน)|โรงเรียน.*มีกี่/
  const isStats = statsKeywords.test(question)
  console.log(`Statistics Pattern Match: ${isStats}`)
  console.log('')

  // Step 3: Try to get database stats
  if (isStats) {
    console.log('Attempting to fetch statistics from database...')
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_KEY!
      )

      const { count: studentCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      const { count: teacherCount } = await supabase
        .from('teachers')
        .select('*', { count: 'exact', head: true })

      const { count: classCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      console.log('Database Results:')
      console.log(`  Students: ${studentCount || 0}`)
      console.log(`  Teachers: ${teacherCount || 0}`)
      console.log(`  Classes: ${classCount || 0}`)

      const statisticsContext = `สถิติโรงเรียน:\n`
        + `- นักเรียนทั้งหมด: ${studentCount || 0} คน\n`
        + `- ครูทั้งหมด: ${teacherCount || 0} คน\n`
        + `- คลาสเรียนทั้งหมด: ${classCount || 0} คลาส`

      console.log('\nContext that would be sent to LLM:')
      console.log(statisticsContext)
    } catch (error: any) {
      console.log(`Database Error: ${error.message}`)
    }
  }
}

testFullFlow().catch(console.error)
