// Load environment variables FIRST before any other imports
import 'dotenv/config'

import { generateEmbedding } from './rag/services/embedding.service'
import { insertKnowledgeBase } from './rag/services/supabase.service'

async function seed() {
  console.log('🌱 Seeding Supabase with test data...\n')

  const docs = [
    { content: 'นักเรียนต้องสวมเครื่องแบบ สีขาว น้ำเงิน เสมอ', category: 'rules', title: 'กฎเครื่องแบบนักเรียน' },
    { content: 'เครื่องแบบนักเรียน ชุดละลอย ห้ามใส่ทรงผมประหลาด', category: 'rules', title: 'ระเบียบการแต่งกาย' },
    { content: 'ในห้องเรียนต้องเงียบ ฟังครูสอน และทำการบ้าน', category: 'rules', title: 'กฎในห้องเรียน' },
    { content: 'นักเรียนต้องเคารพครู ไม่พูดกลางคลาสโดยไม่ได้รับอนุญาต', category: 'rules', title: 'การเคารพครู' },
    { content: 'การสอบจะมีขึ้นทุกเดือน วันจันทร์ที่สองของเดือน', category: 'events', title: 'ตารางสอบ' },
    { content: 'ผู้ปกครองสามารถติดต่อครูประจำชั้นได้ทุกวันศุกร์ 14:00-16:00 น.', category: 'contact', title: 'วันติดต่อครู' },
    { content: 'ค่าธรรมเนียมเรียนต้องชำระภายในวันที่ 5 ของเดือน', category: 'payment', title: 'กำหนดชำระเงิน' }
  ]

  for (const doc of docs) {
    const id = crypto.randomUUID()
    const embedding = await generateEmbedding(doc.content)

    await insertKnowledgeBase({
      id,
      content: doc.content,
      category: doc.category,
      title: doc.title,
      embedding
    })

    console.log(`✓ Seeded: ${doc.content.slice(0, 40)}...`)
  }

  console.log('\n✅ Seeding complete!')
}

seed().catch(console.error)
