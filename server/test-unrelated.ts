import { embed } from './embeddings/index.js'

async function testUnrelated() {
  const texts = ['cat', 'car', 'sky', 'run']
  
  const embeddings: number[][] = []
  for (const text of texts) {
    const emb = await embed(text)
    embeddings.push(emb)
    console.log(`"${text}": [${emb.slice(0, 3).map(v => v.toFixed(3)).join(', ')}]`)
  }
  
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const dot = embeddings[i].reduce((sum, val, k) => sum + val * embeddings[j][k], 0)
      const sim = dot // Already normalized
      console.log(`"${texts[i]}" vs "${texts[j]}": ${sim.toFixed(4)}`)
    }
  }
}

testUnrelated().catch(console.error)
