# คู่มือระบบแสดงแอนิเมชันตัวละครนักเรียน
# Student Status Character Animation Showcase Guide

## โครงสร้างโฟลเดอร์ (Folder Structure)

```
src/
├── animation-showcase/
│   ├── index.jsx                 # หน้าแรกของระบบแสดงแอนิเมชัน
│   ├── EmotionCharacter.jsx      # คอมโพเนนต์ตัวละครหลัก
│   ├── emotionConfig.js          # การตั้งค่าทั้ง 15 สถานะ
│   ├── AnimationGallery.jsx      # แกลเลอรีแสดงทุกสถานะ
│   └── AnimationPreview.jsx      # หน้าตัวอย่างแบบโต้ตอบ
│
└── pages/
    └── AnimationShowcasePage.jsx # หน้าทดสอบสำหรับ routing
```

---

## ไฟล์และฟังก์ชันหลัก (Main Files & Functions)

### 1. `emotionConfig.js`
**คำอธิบาย:** เก็บการตั้งค่าทั้งหมดของ 15 สถานะ

**ฟังก์ชันหลัก:**
- `emotionStates` - Object ที่เก็บ config ทั้งหมด
- `getAnimationPreset(state, intensity)` - รับค่า animation preset สำหรับ framer-motion
- `getFacialExpression(state)` - รับค่า path สำหรับวาดใบหน้า (คิ้ว, ตา, ปาก)

**ตัวอย่างการใช้:**
```javascript
import { emotionStates, getAnimationPreset } from './emotionConfig'

// เข้าถึง config ของสถานะ
const config = emotionStates['positive']
console.log(config.displayName) // "เชิงบวก"

// รับ animation preset
const animation = getAnimationPreset('critical', 0.8)
```

---

### 2. `EmotionCharacter.jsx`
**คำอธิบาย:** คอมโพเนนต์ตัวละครหลัก รับและแสดงแอนิเมชัน

**Props:**
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `state` | string | `'neutral'` | ชื่อสถานะ (เช่น 'positive', 'critical') |
| `intensity` | number | `0.5` | ความเข้มของแอนิเมชัน (0-1) |
| `size` | string | `'md'` | ขนาดตัวละคร ('sm', 'md', 'lg', 'xl') |
| `showLabel` | boolean | `false` | แสดงชื่อและคำอธิบาย |

**ตัวอย่างการใช้:**
```javascript
import EmotionCharacter from './animation-showcase/EmotionCharacter'

// แสดงตัวละครสถานะ positive ขนาดกลาง
<EmotionCharacter state="positive" size="md" />

// แสดงตัวละครสถานะ critical แรงสุด
<EmotionCharacter state="critical" intensity={1.0} size="xl" showLabel />
```

---

### 3. `AnimationGallery.jsx`
**คำอธิบาย:** แกลเลอรีแสดงทั้ง 15 สถานะพร้อม hover effect

**Props:**
| Prop | Type | Description |
|------|------|-------------|
| `onStateClick` | function | Callback เมื่อคลิกการ์ด (รับชื่อสถานะ) |

**ตัวอย่างการใช้:**
```javascript
import AnimationGallery from './animation-showcase/AnimationGallery'

<AnimationGallery
  onStateClick={(stateName) => console.log('Selected:', stateName)}
/>
```

---

### 4. `AnimationPreview.jsx`
**คำอธิบาย:** หน้าตัวอย่างแบบโต้ตอบพร้อม controls

**Features:**
- Dropdown เลือกสถานะ
- Slider ปรับ intensity (0-100%)
- ปุ่มเลือกขนาด (เล็ก, กลาง, ใหญ่, ใหญ่พิเศษ)
- แสดงข้อมูล animation (type, duration, ease)

---

### 5. `index.jsx`
**คำอธิบาย:** หน้าหลักของระบบ รวมทั้ง Gallery และ Preview

---

## วิธีการรัน (How to Run)

### 1. ติดตั้ง dependencies ที่จำเป็น
```bash
# ติดตั้ง framer-motion ถ้ายังไม่ได้ติดตั้ง
npm install framer-motion
```

### 2. เพิ่ม Route ใน App.jsx (หรือ router ของคุณ)
```javascript
// App.jsx
import AnimationShowcasePage from './pages/AnimationShowcasePage'

// เพิ่ม route
<Route path="/animation-showcase" element={<AnimationShowcasePage />} />
```

### 3. รัน development server
```bash
npm run dev
```

### 4. เปิดเบราว์เซอร์ไปที่
```
http://localhost:5173/animation-showcase
```
(หรือ port ที่ vite ใช้)

---

## วิธีการทดสอบแต่ละสถานะ (How to Test Each State)

### วิธีที่ 1: ผ่าน Animation Gallery (แนะนำ)
1. เปิดหน้า `/animation-showcase`
2. ดูที่แกลเลอรีด้านซ้าย/บน
3. **Hover** เหนือการ์ดแต่ละใบเพื่อ:
   - เห็น animation เต็มความเข้ม (100%)
   - อ่านคำอธิบายสถานะ
4. **คลิก** ที่การ์ดเพื่อ:
   - ดูตัวอย่างแบบละเอียดที่ Preview Panel
   - ปรับแต่ง intensity และ size

### วิธีที่ 2: ผ่าน Animation Preview Panel
1. ที่ Preview Panel ด้านขวา
2. เลือก State จาก dropdown:
   - มีทั้งหมด 15 สถานะให้เลือก
   - ชื่อไทย + ชื่ออังกฤษ
3. ปรับ Intensity Slider:
   - ลากไปซ้าย = แอนิเมชันเบา (0%)
   - ลากไปขวา = แอนิเมชันเต็มที่ (100%)
4. กดปุ่มขนาด:
   - เล็ก (sm) → ใช้ในรายการตาราง
   - กลาง (md) → ใช้ในการ์ด
   - ใหญ่ (lg) → ใช้ในหน้าหลัก
   - ใหญ่พิเศษ (xl) → ใช้ในหน้า hero

---

## รายการทั้ง 15 สถานะ (All 15 States)

| ลำดับ | State Name | ชื่อไทย | สีหลัก | Motion Type |
|--------|-----------|----------|---------|-------------|
| 1 | positive | เชิงบวก | Sage green | smooth_bouncy |
| 2 | improving | กำลังพัฒนา | Blue | gradual_rise |
| 3 | excellent | ยอดเยี่ยม | Coral | celebratory |
| 4 | neutral | ปกติ | Gray | idle |
| 5 | informative | แจ้งเตือน | Indigo | gentle_informative |
| 6 | stable | มั่นคง | Teal | steady |
| 7 | warning | คำเตือน | Gold | hesitant |
| 8 | declining | ลดลง | Orange | slow_heavy |
| 9 | at_risk | เสี่ยง | Red | trembling |
| 10 | critical | วิกฤติ | Coral red | panicked |
| 11 | urgent | เร่งด่วน | Dark red | urgent |
| 12 | needs_attention | ต้องการความสนใจ | Purple | inquisitive |
| 13 | insufficient_data | ข้อมูลไม่เพียงพอ | Light gray | questioning |
| 14 | anomaly | ผิดปกติ | Pink | confused |
| 15 | inconsistent | ไม่สม่ำเสมอ | Amber | unpredictable |

---

## การใช้งานจริง (Real Usage Examples)

### Example 1: ใช้ใน Dashboard แสดงสถานะนักเรียน
```javascript
import EmotionCharacter from './animation-showcase/EmotionCharacter'

// แสดงสถานะนักเรียนแต่ละคน
{students.map(student => (
  <div key={student.id} className="student-card">
    <EmotionCharacter
      state={student.status}
      size="sm"
      showLabel={false}
    />
    <span>{student.name}</span>
  </div>
))}
```

### Example 2: ใช้ในหน้ารายละเอียดนักเรียน
```javascript
import EmotionCharacter from './animation-showcase/EmotionCharacter'

<div className="student-detail">
  <EmotionCharacter
    state={student.status}
    intensity={0.8}
    size="xl"
    showLabel={true}
  />
  <p>สถานะปัจจุบัน: {student.status}</p>
</div>
```

### Example 3: ใช้ใน Modal/Dialog
```javascript
import { motion } from 'framer-motion'
import EmotionCharacter from './animation-showcase/EmotionCharacter'

<motion.div
  initial={{ scale: 0.8, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  className="status-modal"
>
  <EmotionCharacter
    state={newStatus}
    intensity={1}
    size="lg"
  />
  <p>สถานะถูกเปลี่ยนเป็น {newStatus}</p>
</motion.div>
```

---

## Performance Tips

1. **ใช้ size="sm"** สำหรับรายการที่มีหลายรายการ
2. **ปรับ intensity** ตามความเหมาะสมกับบริบท
3. **ใช้ React.memo** หากมีการ render หลายตัวละครพร้อมกัน:
```javascript
import { memo } from 'react'
const MemoizedCharacter = memo(EmotionCharacter)
```

---

## Troubleshooting

### Problem: Animation ไม่แสดง
**Solution:** ตรวจสอบว่าติดตั้ง framer-motion แล้ว
```bash
npm list framer-motion
```

### Problem: สีไม่แสดงถูกต้อง
**Solution:** ตรวจสอบว่า import Tailwind CSS ถูกต้องใน index.css

### Problem: ตัวละครไม่โหลด
**Solution:** ตรวจสอบ path ใน import ว่าถูกต้อง

---

## Contact & Support

หากมีปัญหาหรือข้อสงสัย ติดต่อ:
- GitHub Issues
- Team Developer

---

**Last Updated:** 2025
**Version:** 1.0.0
