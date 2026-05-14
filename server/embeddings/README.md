# ระบบ Embedding แบบยืดหยุ่น (Flexible Embedding System)

ระบบนี้อนุญาตให้สลับระหว่าง **OpenAI Embeddings** และ **Local Sentence Transformers** ได้อย่างง่ายดาย

## โครงสร้างไฟล์ (File Structure)

```
server/embeddings/
├── index.ts       - ไฟล์หลักสำหรับสลับระหว่างผู้ให้บริการ
├── openaiEmbed.ts - การใช้งาน OpenAI (text-embedding-3-small)
└── localEmbed.ts  - การใช้งาน Local API (Sentence Transformers)
```

## วิธีการสลับ (How to Switch)

### ใช้ OpenAI (ค่าเริ่มต้น)
ในไฟล์ `server/.env`:
```env
USE_LOCAL_EMBEDDING=false
```

### ใช้ Local Sentence Transformers
ในไฟล์ `server/.env`:
```env
USE_LOCAL_EMBEDDING=true
LOCAL_EMBEDDING_URL=http://localhost:8000/embed
```

## ⚠️ ข้อควรระวังสำคัญ (IMPORTANT WARNING)

**ห้ามผสม embedding จากโมเดลที่แตกต่างกันในฐานข้อมูลเดียวกัน!**

### เหตุผล (Why?)
- **OpenAI (text-embedding-3-small)**: 1536 dimensions
- **Local (Sentence Transformers)**: ปกติ 384 หรือ 768 dimensions

เวกเตอร์ที่มีขนาดต่างกัน **ไม่สามารถ** เปรียบเทียบความคล้ายคลึงกันได้
การค้นหา (similarity search) จะทำงานผิดพลาด!

### วิธีการเปลี่ยนโมเดลอย่างปลอดภัย (Safe Model Switching)

เมื่อต้องการเปลี่ยนผู้ให้บริการ:

1. **อัปเดต environment variable** ใน `server/.env`
2. **สร้าง embedding ใหม่ทั้งหมด**:
   ```bash
   cd server
   npm run regenerate-embeddings
   ```

## การตั้งค่า Local API (Local API Setup)

### ใช้ Python + FastAPI

```python
# local_embedding_server.py
from sentence_transformers import SentenceTransformer
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()
model = SentenceTransformer('all-MiniLM-L6-v2')  # 384 dimensions

class TextRequest(BaseModel):
    text: str

@app.post("/embed")
async def embed(req: TextRequest):
    embedding = model.encode(req.text).tolist()
    return {"embedding": embedding}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

รัน:
```bash
pip install sentence-transformers fastapi uvicorn
python local_embedding_server.py
```

### ปรับขนาด Dimensions

หากใช้โมเดลอื่น ให้แก้ไข `EMBEDDING_DIM` ใน `server/embeddings/localEmbed.ts`:

| โมเดล | Dimensions |
|--------|-----------|
| all-MiniLM-L6-v2 | 384 |
| all-mpnet-base-v2 | 768 |
| paraphrase-multilingual-MiniLM-L12-v2 | 384 |

## การใช้งาน (Usage)

```typescript
import { embed, getEmbeddingConfig } from './embeddings'

// สร้าง embedding (จะใช้ provider ตามที่ตั้งค่าใน .env)
const vector = await embed("ข้อความของคุณ")

// ตรวจสอบการตั้งค่าปัจจุบัน
const config = getEmbeddingConfig()
console.log(config.provider)    // 'openai' หรือ 'local'
console.log(config.dimensions)  // 1536 หรือ 384
```

## การย้อนกลับไปใช้ OpenAI (Reverting to OpenAI)

1. แก้ไข `server/.env`:
   ```env
   USE_LOCAL_EMBEDDING=false
   ```

2. สร้าง embedding ใหม่:
   ```bash
   npm run regenerate-embeddings
   ```

## สรุป (Summary)

| คุณสมบัติ | OpenAI | Local |
|-----------|--------|-------|
| ต้นทุน | มีค่าใช้จ่าย | ฟรี |
| ความแม่นยำ | สูงมาก | ดีมาก |
| เวลาตอบสนอง | เร็ว (API) | เร็ว (local) |
| Dependencies | OpenAI API key | Python server |
| Dimensions | 1536 | 384/768 |
