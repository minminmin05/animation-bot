import { embed } from './embeddings/index.js'

async function testApiDebug() {
  const texts = ['นักเรียนต้องสวมเครื่องแบบ', 'อาหารกลางวันมีเมนูอะไร']
  
  console.log('=== Debug API Similarity ===\n')
  
  const embeddings: number[][] = []
  for (const text of texts) {
    const emb = await embed(text)
    embeddings.push(emb)
    console.log(`Text: "${text}"`)
    console.log(`  Embedding length: ${emb.length}`)
    console.log(`  First 5: [${emb.slice(0, 5).join(', ')}]`)
    console.log(`  Last 5: [${emb.slice(-5).join(', ')}]`)
    
    // Check if it's the same embedding
    const hash = emb.slice(0, 10).join('')
    console.log(`  Hash (first 10): ${hash}`)
    console.log()
  }
  
  // Calculate similarity
  const dot = embeddings[0].reduce((sum, val, i) => sum + val * embeddings[1][i], 0)
  const norm0 = Math.sqrt(embeddings[0].reduce((sum, val) => sum + val * val, 0))
  const norm1 = Math.sqrt(embeddings[1].reduce((sum, val) => sum + val * val, 0))
  const sim = dot / (norm0 * norm1)
  
  console.log(`Similarity calculation:`)
  console.log(`  Dot product: ${dot}`)
  console.log(`  Norm A: ${norm0}`)
  console.log(`  Norm B: ${norm1}`)
  console.log(`  Similarity: ${sim}`)
}

testApiDebug().catch(console.error)
