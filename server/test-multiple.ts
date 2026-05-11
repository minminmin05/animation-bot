async function testMultiple() {
  const questions = [
    'มีครูกี่คน',
    'โรงเรียนมีใครบ้าง',
    'รายชื่อครูทั้งหมด'
  ]

  for (const q of questions) {
    const response = await fetch('http://localhost:3001/api/rag/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ question: q })
    })

    const data = await response.json()
    console.log(`Q: ${q}`)
    console.log(`A: ${data.text.substring(0, 150)}...`)
    console.log('')
  }
}

testMultiple().catch(console.error)
