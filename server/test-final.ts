import { embed } from './embeddings/index.js'

async function testFinal() {
  const texts = [
    'นักเรียนทุกคนต้องสวมเครื่องแบบนักเรียนเพื่อความเป็นระเบียบเรียบร้อย',
    'โรงเรียนขอให้นักเรียนสวมชุดนักเรียนในทุกวันที่มีการเรียนการสอน',
    'วันนี้ในโรงอาหารมีบริการอาหารกลางวันเป็นข้าวมันไก่พร้อมแกงจึนจัดซุก',
    'ผมชอบเล่นฟุตบอลกับเพื่อนๆในวันหยุด'
  ]
  
  const embeddings: number[][] = []
  for (const text of texts) {
    const emb = await embed(text)
    embeddings.push(emb)
  }
  
  console.log('=== Final Thai Similarity Test ===\n')
  
  for (let i = 0; i < texts.length; i++) {
    for (let j = i + 1; j < texts.length; j++) {
      const dot = embeddings[i].reduce((sum, val, k) => sum + val * embeddings[j][k], 0)
      console.log(`"${texts[i].substring(0, 40)}..."`)
      console.log(`  vs "${texts[j].substring(0, 40)}..."`)
      console.log(`  Similarity: ${dot.toFixed(4)}`)
      if (dot > 0.6) console.log('  ✅ HIGH - Related topics')
      else if (dot > 0.2) console.log('  ⚠️ MEDIUM - Some similarity')
      else console.log('  ❌ LOW - Unrelated')
      console.log()
    }
  }
}

testFinal().catch(console.error)
