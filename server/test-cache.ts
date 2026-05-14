import { embed } from './embeddings/index.js'

// Test if embeddings are unique
const texts = ['AAA', 'BBB', 'CCC', 'DDD']
const embeddings: number[][] = []

for (const text of texts) {
  const emb = await embed(text)
  embeddings.push(emb)
  console.log(`"${text}" first 3: [${emb.slice(0, 3).join(', ')}]`)
}

// Check if any embeddings are identical
for (let i = 0; i < embeddings.length; i++) {
  for (let j = i + 1; j < embeddings.length; j++) {
    const same = JSON.stringify(embeddings[i]) === JSON.stringify(embeddings[j])
    console.log(`"${texts[i]}" == "${texts[j]}": ${same}`)
    
    if (!same) {
      // Count different values
      let diff = 0
      for (let k = 0; k < embeddings[i].length; k++) {
        if (Math.abs(embeddings[i][k] - embeddings[j][k]) > 0.0001) diff++
      }
      console.log(`  Different values: ${diff}/${embeddings[i].length}`)
    }
  }
}
