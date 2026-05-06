import { embed } from './embeddings/index.js'

async function testThaiSimilarity() {
  const texts = [
    'นักเรียนต้องสวมเครื่องแบบ',
    'เครื่องแบบนักเรียนมีอะไรบ้าง',
    'อาหารกลางวันมีเมนูอะไร',
    'ฉันรักการเรียนหนังสือ' // unrelated
  ]

  console.log('=== Thai Similarity Test ===\n')

  const embeddings: number[][] = []
  for (const text of texts) {
    const emb = await embed(text)
    embeddings.push(emb)
    console.log(`"${text}"`)
    console.log(`  First 5 values: [${emb.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`)
    console.log(`  Norm: ${Math.sqrt(emb.reduce((s, v) => s + v * v, 0)).toFixed(6)}`)
    console.log()
  }

  // Calculate similarities
  function cosineSimilarity(a: number[], b: number[]): number {
    const dot = a.reduce((sum, val, i) => sum + val * b[i], 0)
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0))
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0))
    return dot / (normA * normB)
  }

  console.log('=== Similarity Scores ===')
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const sim = cosineSimilarity(embeddings[i], embeddings[j])
      console.log(`"${texts[i]}" vs "${texts[j]}": ${sim.toFixed(4)}`)
    }
  }
}

testThaiSimilarity().catch(console.error)
