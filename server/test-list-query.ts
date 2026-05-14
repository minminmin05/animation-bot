async function testListQuery() {
  const question = 'มีนักเรียนชื่ออะไรบ้างในระบบ'

  console.log('Testing list query...')
  console.log(`Original question: "${question}"`)
  console.log('')

  try {
    const response = await fetch('http://localhost:3001/api/rag/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ question })
    })

    const data = await response.json()

    console.log('API Response:')
    console.log(`  Intent: ${data.intent}`)
    console.log(`  Text: ${data.text}`)
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
  }
}

testListQuery()
