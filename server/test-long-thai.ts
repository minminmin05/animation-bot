import { embed } from './embeddings/index.js'

async function testLongThai() {
  const texts = [
    'นักเรียนต้องสวมเครื่องแบบนักเรียนทุกคนขาดเสียไม่ได้',
    'วันนี้มีอาหารกลางวันเป็นข้าวมันไก่และผลไม้',
    'โรงเรียนปิดการสอนในวันหยุดนักขัตฤกษ์',
    'ผมชอบเล่นฟุตบอลกับเพื่อนๆในสนาม'
  ]
  
  const embeddings: number[][] = []
  for (const text of texts) {
    const emb = await embed(text)
    embeddings.push(emb)
  }
  
  console.log('=== Thai Sentence Similarity ===\n')
  
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const dot = embeddings[i].reduce((sum, val, k) => sum + val * embeddings[j][k], 0)
      console.log(`"${texts[i].substring(0, 30)}..." vs "${texts[j].substring(0, 30)}...":`)
      console.log(`  Score: ${dot.toFixed(4)}`)
    }
  }
}

testLongThai().catch(console.error)
