import { embed } from './embeddings/index.js'

// Simulate what the API receives
const testCases = [
  { text: 'นักเรียนต้องสวมเครื่องแบบ', desc: 'proper Thai' },
  { text: 'à¸™à¸±à¸à¹€à¸£à¸µà¸¢à¸™', desc: 'mojibake' },
  { text: decodeURIComponent('%E0%B8%99%E0%B8%B1%E0%B8%81%E0%B9%80%E0%B8%A3%E0%B8%B5%E0%B8%A2%E0%B8%99'), desc: 'URL decoded' }
]

for (const test of testCases) {
  const emb = await embed(test.text)
  console.log(`"${test.desc}": [${emb.slice(0, 3).join(', ')}...]`)
}

// Compare two texts
const emb1 = await embed('อาหาร')
const emb2 = await embed('การเรียน')

const dot = emb1.reduce((sum, val, i) => sum + val * emb2[i], 0)
const sim = dot / (Math.sqrt(emb1.reduce((s, v) => s + v*v, 0)) * Math.sqrt(emb2.reduce((s, v) => s + v*v, 0)))
console.log(`\nSimilarity "อาหาร" vs "การเรียน": ${sim.toFixed(4)}`)
