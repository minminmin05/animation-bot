async function testAPIEncoding() {
  const question = 'มีนักเรียนกี่คน'

  console.log('Testing API encoding...')
  console.log(`Original question: "${question}"`)
  console.log(`UTF-8 bytes: ${Array.from(new TextEncoder().encode(question)).map(b => '0x' + b.toString(16)).join(' ')}`)
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

testAPIEncoding()
