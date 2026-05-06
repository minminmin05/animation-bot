import { checkQuerySafety } from './security/queryGuard.js'

console.log('=== Policy Questions Test (should be ALLOWED) ===\n')

const policyTests = [
  'Does everyone need to wear uniforms?',
  'Is everyone required to attend?',
   'ทุกคนต้องสวมเครื่องแบบไหม',
  'Does everyone have to take the exam?',
  'Is everyone expected to be on time?'
]

let passed = 0
policyTests.forEach(q => {
  const result = checkQuerySafety(q, 'student')
  const status = result.safe ? '✅' : '❌'
  if (result.safe) passed++
  console.log(`${status} "${q}" → ${result.safe ? 'ALLOWED' : 'BLOCKED'}`)
  if (!result.safe) console.log(`   Reason: ${result.reason}`)
})

console.log(`\nResult: ${passed}/${policyTests.length} passed`)
console.log(passed === policyTests.length ? '\n✅ All policy questions allowed!' : '\n❌ Some policy questions were blocked!')
