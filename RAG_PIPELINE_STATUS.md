# สถานะการพัฒนาระบบ RAG Pipeline

**อัปเดตล่าสุด:** 5 พฤษภาคม 2026
**โปรเจกต์:** แอปพลิเคชันบริหารจัดการโรงเรียน Lumaid

## ภาพรวม

เอกสารฉบับนี้ติดตามความคืบหน้าในการพัฒนาระบบ Retrieval-Augmented Generation (RAG) สำหรับผู้ช่วย AI แชทบอทของโรงเรียน ระบบนี้ช่วยให้ AI สามารถตอบคำถามเกี่ยวกับกฎระเบียบ นโยบาย และข้อมูลต่างๆ ของโรงเรียนได้จากฐานความรู้

---

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              คำถามจากผู้ใช้ (ภาษาไทย)                       │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    สร้าง Embedding (OpenAI API)                             │
│  Model: text-embedding-3-small                                              │
│  Dimensions: 1536                                                           │
│  Status: ✅ สำเร็จ                                                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ค้นหาความคล้ายด้วย Vector                                │
│  Database: Supabase pgvector                                                │
│  Function: match_knowledge_base()                                           │
│  Status: ✅ สำเร็จ                                                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    สร้างคำตอบจาก LLM (Google Gemini)                       │
│  Model: gemini-2.0-flash-exp                                                │
│  Status: ✅ สำเร็จ                                                            │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    การตอบกลับ { ข้อความ, อารมณ์, เสียงพูด, แหล่งที่มา }        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## โมเดลที่ใช้งาน

### 1. Embedding Model
| โมเดล | ไลบรารี | ขนาด | ตำแหน่ง |
|--------|-----------|-------|---------|
| **text-embedding-3-small** | OpenAI API | 1536 มิติ | Cloud API |

- **รันที่ไหน:** OpenAI API
- **ค่าใช้จ่าย:** ตาม OpenAI pricing

### 2. LLM Model
| โมเดล | ไลบรารี | ตำแหน่ง |
|--------|-----------|---------|
| **gemini-2.0-flash-exp** | Google Generative AI | Cloud API |

- **รันที่ไหน:** Google Gemini API
- **ค่าใช้จ่าย:** ตาม Google AI pricing

---

## ความคืบหน้าการพัฒนา

### ✅ เฟส 1: ติดตั้งโครงสร้างพื้นฐาน (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **Supabase pgvector** | ✅ สำเร็จ | ตาราง `knowledge_base` พร้อมคอลัมน์ `vector(1536)` |
| **Script Migration** | ✅ สำเร็จ | `supabase/migrations/20260505_update_rag_embedding_dimensions.sql` |
| **ฟังก์ชันค้นหา** | ✅ สำเร็จ | `match_knowledge_base()` ใช้ cosine distance |
| **ตั้งค่า Environment** | ✅ สำเร็จ | การตั้งค่า `.env` สำหรับ API keys |

---

### ✅ เฟส 2: บริการสร้าง Embedding (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **โมเดล Embedding** | ✅ สำเร็จ | OpenAI `text-embedding-3-small` (1536 มิติ) |
| **Service Layer** | ✅ สำเร็จ | `server/rag/services/embedding.service.ts` |

**ไฟล์:**
- `server/rag/services/embedding.service.ts`

---

### ✅ เฟส 3: เชื่อมต่อ Vector Store (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **Supabase Client** | ✅ สำเร็จ | ตั้งค่าด้วย service role key |
| **การบันทึกข้อมูล** | ✅ สำเร็จ | ฟังก์ชัน `insertKnowledgeBase()` |
| **การค้นหา** | ✅ สำเร็จ | ฟังก์ชัน `searchByEmbedding()` กับ pgvector |
| **ตั้งค่า Threshold** | ✅ สำเร็จ | ปรับค่าความคล้ายได้ (ค่าเริ่มต้น 0.75) |

**ไฟล์:**
- `server/rag/services/supabase.service.ts`

---

### ✅ เฟส 4: บริการ LLM (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **เชื่อมต่อ LLM** | ✅ สำเร็จ | Google Gemini API |
| **ออกแบบ Prompt** | ✅ สำเร็จ | ภาษาไทย, บทบาทครูประจำชั้น |
| **รูปแบบการตอบ** | ✅ สำเร็จ | โครงสร้างพร้อมอารมณ์และแหล่งที่มา |
| **จัดการ Error** | ✅ สำเร็จ | คำตอบสำรองเมื่อเกิดข้อผิดพลาด |

**คุณสมบัติ:**
- รองรับภาษาไทย
- จำแนกอารมณ์ (ปกติ, ยินดี, กังวล, ช่วยเหลือ)
- อ้างอิงแหล่งที่มา

**ไฟล์:**
- `server/rag/services/llm.service.ts`

---

### ✅ เฟส 5: เซิร์ฟเวอร์ API (สำเร็จ)

| Endpoint | Method | สถานะ | คำอธิบาย |
|----------|--------|--------|-------------|
| `/api/rag/ask` | POST | ✅ สำเร็จ | RAG เต็มรูปแบบพร้อมคำตอบจาก LLM |
| `/api/rag/query` | POST | ✅ สำเร็จ | ค้นหาข้อมูลเท่านั้น (vector search) |
| `/api/rag/embed` | POST | ✅ สำเร็จ | เพิ่มเอกสารใหม่พร้อม embedding |

**ไฟล์:**
- `server/index.ts` - Express server พร้อม CORS และ JSON middleware
- `server/package.json` - จัดการ dependencies

**Dependencies:**
- `express` - เว็บเซิร์ฟเวอร์
- `openai` - สร้าง embedding
- `@supabase/supabase-js` - ไคลเอนต์ฐานข้อมูล
- `@google/generative-ai` - เชื่อมต่อ LLM

---

### ✅ เฟส 6: เชื่อมต่อ Frontend (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **หน้าตาแชท** | ✅ สำเร็จ | `AIChatAssistant.tsx` ภาษาไทย |
| **Service Layer** | ✅ สำเร็จ | `src/services/embedding/embeddingService.ts` |
| **แสดงอารมณ์** | ✅ สำเร็จ | ตัวการ์ตูผู้ช่วยเปลี่ยนตามอารมณ์ AI |
| **สถานะโหลด** | ✅ สำเร็จ | แอนิเมชันสปินเนอร์ขณะประมวลผล |
| **จัดการ Error** | ✅ สำเร็จ | ข้อความสำรองแบบกันเอง |

**ไฟล์:**
- `src/pages/admin/AIChatAssistant.tsx`
- `src/services/embedding/embeddingService.ts`

---

### ✅ เฟส 7: เพิ่มข้อมูลตัวอย่าง (สำเร็จ)

| ส่วนประกอบ | สถานะ | รายละเอียด |
|-----------|--------|-------------|
| **Script Seed** | ✅ สำเร็จ | `server/seed.ts` พร้อมข้อมูลโรงเรียนตัวอย่าง |
| **ข้อมูลตัวอย่าง** | ✅ สำเร็จ | 7 เอกสารภาษาไทยครอบคลุมกฎ กิจกรรม ติดต่อ ชำระเงิน |
| **สร้าง Embedding** | ✅ สำเร็จ | สร้าง embedding อัตโนมัติตอน seed |

**หมวดหมู่ข้อมูลตัวอย่าง:**
- กฎระเบียบ (ยูนิฟอร์ม, ห้องเรียน, การเคารพครู)
- กิจกรรม (ตารางสอบ)
- ติดต่อ (วันพบผู้ปกครอง)
- การเงิน (กำหนดชำระเงิน)

**ไฟล์:**
- `server/seed.ts`

---

## 🚀 เริ่มใช้งานอย่างรวดเร็ว

### ข้อกำหนดเบื้องต้น

1. **API Keys** - ตั้งค่าใน `server/.env`

### ตั้งค่า Environment Variables

```bash
# Supabase
SUPABASE_URL=supabase_url_ของคุณ
SUPABASE_SERVICE_KEY=service_key_ของคุณ

# OpenAI (Embeddings)
OPENAI_API_KEY=sk-...

# Google Gemini (LLM)
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-2.0-flash-exp

# API Server
PORT=3001
```

### เริ่มเซิร์ฟเวอร์

```bash
cd server
npm install
npm start
```

### เพิ่มข้อมูลตัวอย่าง

```bash
npm run seed
```

---

## 📁 โครงสร้างไฟล์

```
school-management-app/
├── server/
│   ├── index.ts                          # Express API server
│   ├── seed.ts                           # Script เพิ่มข้อมูล
│   ├── .env                              # ตั้งค่า environment เซิร์ฟเวอร์
│   ├── package.json                      # Dependencies ฝั่งเซิร์ฟเวอร์
│   └── rag/
│       └── services/
│           ├── embedding.service.ts      # สร้าง embedding (OpenAI)
│           ├── supabase.service.ts       # จัดการ vector store
│           └── llm.service.ts            # เชื่อมต่อ LLM (Gemini)
│
├── src/
│   ├── pages/admin/
│   │   └── AIChatAssistant.tsx           # หน้าตาแชท UI
│   └── services/embedding/
│       └── embeddingService.ts           # ไคลเอนต์ API ฝั่ง frontend
│
└── supabase/
    └── migrations/
        ├── 2_add_rag_pgvector_function.sql
        └── 20260505_update_rag_embedding_dimensions.sql
```

---

## 📊 เปรียบเทียบโมเดล

| ส่วนประกอบ | ระบบเก่า | ระบบใหม่ |
|-----------|-----------------|-------------|
| Embeddings | Xenova/all-MiniLM-L6-v2 (ที่เครื่อง) | OpenAI text-embedding-3-small |
| ขนาด Embedding | 384 มิติ | 1536 มิติ |
| Vector Store | Supabase pgvector | Supabase pgvector |
| LLM | Ollama llama3 (ที่เครื่อง) | Google Gemini API |

---

**เวอร์ชันเอกสาร:** 2.0
