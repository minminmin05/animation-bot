# ระบบหน่วยความจำแบบสนทนา Conversational RAG

## ภาพรวม

เอกสารนี้อธิบายระบบ AI ผู้ช่วยโรงเรียนที่อัปเกรดจากระบบ RAG แบบดั้งเดิมเป็นระบบ Conversational RAG ที่มีความจำหลายชั้น (Multi-layer Memory Architecture)

## สถาปัตยกรรมระบบ

```
คำถามจากผู้ใช้
   ↓
ตัวเขียนคำถามใหม่ (Query Rewriter)
   ↓
ดึงข้อมูลจาก:
- ความจำการสนทนาล่าสุด
- ประวัติการสนทนาที่เกี่ยวข้อง (Semantic Search)
- เอกสารความรู้ RAG
- สรุปการสนทนา
   ↓
จัดอันดับและกำจัดข้อมูลซ้ำ
   ↓
สร้างคำตอบจาก LLM
   ↓
บันทึกข้อความสนทนา
   ↓
ประมวลผล Embedding และจัดการความจำแบบ Async
```

## ชั้นข้อมูลความจำ (Memory Layers)

### 1. ความจำการสนทนาล่าสุด (Recent Chat Memory)
- **วัตถุประสงค์**: รักษาความต่อเนื่องของการสนทนา
- **การดึงข้อมูล**: ข้อความ 5-10 ข้อล่าสุดจากเซสชันปัจจุบัน
- **การกรอง**: ไม่เอาข้อความไร้สาระ (ok, ขอบคุณ, สวัสดี)
- **คุณสมบัติ**: เก็บการอ้างอิงด้วยสรรพนาม (มัน, อันนั้น, it, that)

### 2. ความจำประวัติการสนทนา (Semantic History Memory)
- **วัตถุประสงค์**: ค้นหาประวัติการสนทนาที่เกี่ยวข้อง
- **วิธีการ**: ค้นหาความคล้ายคลึงด้วย Embedding
- **การจัดเก็บ**: pgvector พร้อม embedding 384 มิติ
- **การกรอง**: โดย user_id, session_id, importance_score

### 3. ความจำสรุปเซสชัน (Session Summary Memory)
- **วัตถุประสงค์**: บีบอัดการสนทนาเก่า
- **การทำงาน**: ทุกๆ 10 ข้อความ หรือตามรอบเวลา
- **เนื้อหา**: หัวข้อที่คุย, เป้าหมายผู้ใช้, งานที่ยังไม่เสร็จ
- **การจัดเก็บ**: ตารางแยกต่างหาาพร้อม embedding

### 4. การเขียนคำถามใหม่ (Query Rewriting)
- **วัตถุประสงค์**: แก้คำอ้างอิงที่กำกวม
- **ตัวอย่าง**:
  - "มันแก้ยังไง" → "แก้ error EADDRINUSE ยังไง"
  - "that issue" → "database connection timeout issue"
- **วิธีการ**: ใช้ pattern + LLM fallback ถ้าจำเป็น

### 5. การดึงข้อมูลแบบผสม (Hybrid Context Retrieval)
- **วัตถุประสงค์**: รวมแหล่งข้อมูลทั้งหมดอย่างชาญฉลาด
- **คุณสมบัติ**:
  - กำจัดข้อมูลซ้ำ
  - จัดอันดับความเกี่ยวข้อง
  - จัดการ token budget
  - ให้ความสำคัญกับแหล่งข้อมูล

### 6. การประมวลผลความจำแบบ Async
- **วัตถุประสงค์**: สร้าง embedding และสรุปโดยไม่บล็อก
- **งาน**: สร้าง embedding, อัปเดตสรุป, ทำความสะอาด
- **คิว**: จัดลำดับความสำคัญพร้อม retry

## โครงสร้างฐานข้อมูล

### chat_sessions
- id, user_id, title, summary
- metadata, message_count, last_message_at
- Indexes: user_id, created_at, updated_at

### chat_messages
- id, session_id, user_id, role, content
- embedding (vector(384))
- importance_score (0.0-1.0)
- is_embedded, is_processed flags
- Indexes: session_id, created_at, embedding (HNSW)

### session_summaries
- id, session_id, user_id, summary
- embedding (vector(384))
- message_count, time_span_start, time_span_end
- Indexes: session_id, embedding (HNSW)

## ความปลอดภัย

- **Row Level Security (RLS)**: ทุกตารางมี policy เฉพาะผู้ใช้
- **การแยกเซสชัน**: คำถามกรองโดย user_id และ session_id
- **ป้องกันการรั่วไหล**: กรอง metadata อย่างเข้มงวด

## API Endpoints

### POST /api/memory/chat
ประมวลผลคำถามพร้อมระบบความจำเต็มรูปแบบ

### GET /api/memory/sessions
ดึงเซสชันการสนทนาของผู้ใช้

### GET /api/memory/sessions/:sessionId
ดึงประวัติเซสชัน

### POST /api/memory/search
ค้นหาข้ามการสนทนา

### GET /api/memory/stats
ดึงสถิติความจำผู้ใช้

## ตัวอย่างการใช้งาน

```typescript
import { getConversationalPipelineService } from './memory/index.js'

const pipeline = getConversationalPipelineService()

const response = await pipeline.process({
  query: 'เกรดของฉันสอบครั้งล่าสุด',
  userId: 'user-123',
  sessionId: 'session-456',
  userRole: 'student'
})

console.log(response.response.text)
console.log(response.context.memorySources)
// { recent: 3, semantic: 2, summaries: 1, rag: 0 }
```

## การกำหนดค่า

```typescript
import { getMemoryManagerService } from './memory/index.js'

const memoryManager = getMemoryManagerService()

memoryManager.configure({
  autoSummarize: true,           // สรุปอัตโนมัติ
  summarizeAfterMessages: 10,   // สรุปทุก 10 ข้อความ
  embedMessages: true,           // สร้าง embedding
  rewriteQueries: true,          // เขียนคำถามใหม่
  maxContextTokens: 2000         // จำกัด context
})
```

## สิ่งที่ถูกสร้าง

### ไฟล์ฐานข้อมูล
- `supabase/migrations/20260512_conversational_memory_system.sql`

### Services (ไฟล์ TypeScript)
1. `server/memory/recent-memory.service.ts` - ความจำล่าสุด
2. `server/memory/semantic-memory.service.ts` - ความจำเชิงความหมาย
3. `server/memory/summary.service.ts` - การสรุปเซสชัน
4. `server/memory/importance.service.ts` - คะแนนความสำคัญ
5. `server/memory/query-rewriter.service.ts` - การเขียนคำถามใหม่
6. `server/memory/hybrid-retrieval.service.ts` - การดึงข้อมูลผสม
7. `server/memory/memory-manager.service.ts` - ผู้จัดการความจำ
8. `server/memory/async-processor.service.ts` - ประมวลผลแบบ async
9. `server/memory/conversational-pipeline.service.ts` - pipeline การสนทนา

### API Controller
- `server/api/conversational-memory.controller.ts`

## แตกต่างจากระบบเดิมอย่างไร?

### ระบบเดิม
- คำถาม → ค้นหา RAG → ตอบ
- ไม่มีความจำการสนทนา
- ไม่เข้าใจบริบทก่อนหน้า

### ระบบใหม่
- คำถาม → เขียนใหม่ → ดึงความจำทั้งหมด → ค้นหา RAG → จัดอันดับ → ตอบ
- จำการสนทนาทั้งหมดของผู้ใช้
- เข้าใจสรรพนาม (มัน, เขา, อันนั้น)
- สรุปการสนทนาอัตโนมัติ
- ค้นหาประวัติที่เกี่ยวข้อง

## การปรับขนาด (Scalability)

1. **Embedding Generation**: แบบ async, ไม่บล็อก
2. **Vector Search**: HNSW index สำหรับการค้นหาเร็ว
3. **Token Budget**: จำกัดขนาด context
4. **Caching**: Recent memory จะถูก cache ใน memory
5. **Batch Processing**: Background jobs สำหรับงานจำนวนมาก

## การปรับปรุงในอนาคต

1. **Redis Caching**: สำหรับ context ที่ใช้บ่อย
2. **Distributed Queue**: สำหรับหลาย instance
3. **Conversation Branching**: สำหรับสำรวจหัวข้อ
4. **Multi-Modal Memory**: สำหรับรูปภาพ, ไฟล์
5. **Memory Compression**: สรุปแบบกว้างขึ้น
6. **Memory Sharing**: สำหรับ collaborative sessions

## สรุป

ระบบ Conversational RAG ที่สร้างขึ้นช่วยให้ AI ผู้ช่วยโรงเรียน:

1. **จำการสนทนาทั้งหมด** - ไม่ต้องอธิบายซ้ำๆ
2. **เข้าใจบริบท** - รู้ว่า "มัน" หรือ "อันนั้น" หมายถึงอะไร
3. **ค้นหาประวัติ** - หาข้อมูลที่เคยคุยไว้
4. **สรุปอัตโนมัติ** - ไม่ต้องจำทุกอย่าง
5. **ทำงานเร็ว** - async processing, non-blocking

ระบบนี้ทำให้ AI ผู้ช่วย "ฉลาดขึ้น" เพราะมีความจำและเข้าใจบริบทของการสนทนา
