# การออกแบบตัวละครเด็กชายสำหรับแสดงสถานะนักเรียน
# Cartoon Boy Character Design for Student Status States

## ภาพรวมตัวละคร (Character Overview)

**ชื่อตัวละคร:** น้อน้อย (Nong Noy)
**สไตล์:** Cartoon เส้น简洁 (Clean Line), Modern, Friendly
**ใบหน้า:** กลมกว่าง ตาดำโต ยิ้มแย้มแจ่มใส
**ทรงผม:** ผมสั้นตรงมีหางผักติด (Small spiky hair)
**ส่วนสูง:** Chibi proportion (หัวใหญ่ ตัวเล็ก 2:1)

---

## รายละเอียดแต่ละสถานะ (State Details)

### 1. positive (เชิงบวก)
**ความหมาย:** นักเรียนมีพฤติกรรมดี กำลังเติบโตอย่างดี

**การแสดงออกทางใบหน้า:**
- ยิ้มร่า มุมปากขึ้นด้านบน
- ตาเปลือกโต เห็นความสุข
- แก้มยุบเล็กน้อย

**ท่าทางร่างกาย:**
- ยืนตรง หัวเงย
- มือทั้งสองข้างถือกระเป๋าเป้
- ไหล่ผ่อนคลาย

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Smooth & Bouncy
- เดินเบาๆ กระโดดเล็กน้อย
- Head nod เมื่อตอบโต้

**โทนสี:**
- UI: `bg-sage/10` ข้อความ `text-sage`
- Background: `bg-cream`
- Accent: `#7d9a7c` (Sage green)

---

### 2. improving (กำลังพัฒนา)
**ความหมาย:** มีแนวโน้มดีขึ้น กำลังปรับปรุงตัวเอง

**การแสดงออกทางใบหน้า:**
- ยิ้มเล็กน้อย แต่ยังไม่ถึงกับหัวเราะ
- ตามองไปข้างหน้าด้วยความหวัง
- คิ้วเบาๆ

**ท่าทางร่างกาย:**
- เอนตัวไปข้างหน้าเล็กน้อย
- มือข้างหนึ่งยกขึ้นเล็กน้อย
- ท่อนบนแข็งแรง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Gradual Rise
- เดินด้วยความมั่นใจเพิ่มขึ้น
- Arm swing ช้าๆ

**โทนสี:**
- UI: `bg-blue-50` ข้อความ `text-blue-600`
- Background: `bg-cream`
- Accent: `#3b82f6` (Blue)

---

### 3. excellent (ยอดเยี่ยม)
**ความหมาย:** ผลงานดีเยี่ยม สุดยอด

**การแสดงออกทางใบหน้า:**
- ยิ้มกว้างมาก แสดงฟันเล็กน้อย
- ตาสว่างวาบ
- อาจมีแก้มสีชมพู

**ท่าทางร่างกาย:**
- ยืนตรงสมบูรณ์
- มือทั้งสองยกขึ้นเหนือศีรษะ (V-sign หรือชูนิ้วโป้ง)
- หัวเงยสูง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Celebratory
- กระโดดเล็กน้อย (Mini jump)
- Confetti effect เล็กน้อย

**โทนสี:**
- UI: `bg-accent/10` ข้อความ `text-accent`
- Background: `bg-cream`
- Accent: `#e07a5f` (Coral - สีส้มชมพู)

---

### 4. neutral (ปกติ)
**ความหมาย:** สถานะปกติ ไม่มีประเด็นพิเศษ

**การแสดงออกทางใบหน้า:**
- ใบหน้าเรียบ ไม่ยิ้มไม่แสดงอารมณ์
- ตามองตรง
- ปากปิดสนิท

**ท่าทางร่างกาย:**
- ยืนตรงธรรมดา
- มือวางข้างลำตัว
- ไหล่เท่ากัน

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Neutral & Steady
- เดินเป็นปกติ
- Idle breathing animation

**โทนสี:**
- UI: `bg-gray-100` ข้อความ `text-gray-600`
- Background: `bg-cream`
- Accent: `#6b7280` (Gray)

---

### 5. informative (ให้ข้อมูล)
**ความหมาย:** แจ้งเตือนข้อมูลทั่วไป

**การแสดงออกทางใบหน้า:**
- สนใจ คิ้วขมั้นเล็กน้อย
- ตามองด้วยความตั้งใจ
- ปากเล็กน้อย กำลังพูด

**ท่าทางร่างกาย:**
- ยืนตรง หันไปด้านข้างเล็กน้อย
- มือข้างหนึ่งชี้ไปข้างหน้า
- ถือกระดาษหรือแท็บเล็ต

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Gentle & Informative
- Pointing motion ช้าๆ
- Head tilt เล็กน้อย

**โทนสี:**
- UI: `bg-indigo-50` ข้อความ `text-indigo-600`
- Background: `bg-cream`
- Accent: `#6366f1` (Indigo)

---

### 6. stable (มั่นคง)
**ความหมาย:** ผลงานคงที่ ไม่ผันผวน

**การแสดงออกทางใบหน้า:**
- สงบนิ่ง ยิ้มเบาๆ
- ตามองด้วยความมั่นใจ
- ใบหน้าผ่อนคลาย

**ท่าทางร่างกาย:**
- ยืนตรงแข็งแรง
- เท้าทั้งสองห่างกันพอดี
- มือไขว้หน้าอก

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Solid & Consistent
- เดินมั่นคง
- Minimal movement

**โทนสี:**
- UI: `bg-teal-50` ข้อความ `text-teal-600`
- Background: `bg-cream`
- Accent: `#14b8a6` (Teal)

---

### 7. warning (คำเตือน)
**ความหมาย:** มีเครื่องหมายเตือน ต้องระวัง

**การแสดงออกทางใบหน้า:**
- คิ้วขมั้นลง
- ปากคลองเล็กน้อย
- ตามองด้วยความกังวล

**ท่าทางร่างกาย:**
- ย่อตัวลงเล็กน้อย
- มือกำชึ้งไหล่ข้างหนึ่ง
- ไหล่ด้านหนึ่งยกสูงขึ้น

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Hesitant
- ยกมือขึ้นลงช้าๆ
- Head tilt ขวา-ซ้าย

**โทนสี:**
- UI: `bg-gold/10` ข้อความ `text-gold`
- Background: `bg-cream`
- Accent: `#f4a261` (Gold)

---

### 8. declining (ลดลง)
**ความหมาย:** ผลงานแย่ลง กำลังลดลง

**การแสดงออกทางใบหน้า:**
- ใบหน้าเศร้า
- มุมปากหัวเราะ
- คิ้วก้มลง
- อาจมีเหงื่อยางน้ำตาเล็กน้อย

**ท่าทางร่างกาย:**
- หัวก้มลง
- ไหล่ห่อ
- มือแขวงไปข้างหน้าอย่างอ่อนแรง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Slow & Heavy
- เดินลื่อไถล
- Shoulder drop

**โทนสี:**
- UI: `bg-orange-50` ข้อความ `text-orange-600`
- Background: `bg-cream`
- Accent: `#f97316` (Orange)

---

### 9. at_risk (เสี่ยง)
**ความหมาย:** มีความเสี่ยงสูง ต้องการความช่วยเหลือ

**การแสดงออกทางใบหน้า:**
- ใบหน้ากังวลมาก
- ตากว้าง ดูตื่นตระหนก
- ปากเปิดเล็กน้อย

**ท่าทางร่างกาย:**
- ย่อตัวลงมาก
    - มือกำหน้าแน่น
- ไหล่ชูสูง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Trembling
- สั่นเล็กน้อย
- Look around anxiously

**โทนสี:**
- UI: `bg-red-50` ข้อความ `text-red-600`
- Background: `bg-cream`
- Accent: `#ef4444` (Red)

---

### 10. critical (วิกฤติ)
**ความหมาย:** สถานการณ์วิกฤติ ต้องดำเนินการทันที

**การแสดงออกทางใบหน้า:**
- ใบหน้าตื่นตระหนก
- ตาโตมาก น้ำตาไหล
- ปากเปิดกว้าง

**ท่าทางร่างกาย:**
- ย่อตัวลงอย่างสมบูรณ์
- มือกำแน่นประหนึ่งกำลังร้องไห้
- หัวก้มลง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Panicked
- สั่นรุนแรง
- ตามองรอบด้านอย่างรวดเร็ว

**โทนสี:**
- UI: `bg-coral/10` ข้อความ `text-coral` ขอบ `border-coral`
- Background: `bg-coral/5`
- Accent: `#ff6b6b` (Coral red)

---

### 11. urgent (เร่งด่วน)
**ความหมาย:** ต้องการความสนใจทันที

**การแสดงออกทางใบหน้า:**
- รีบเร่ง
- คิ้วขมั้นลงอย่างมาก
- ตามองด้วยความเร่งรีบ

**ท่าทางร่างกาย:**
- ท่อนบนเอนไปข้างหน้า
- มือเดียวชี้ไปข้างหน้า
- เท่าข้างหนึ่งเดินหน้า

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Urgent
- เดินเร็ว
- Rapid pointing

**โทนสี:**
- UI: `bg-red-100` ข้อความ `text-red-700`
- Background: `bg-cream`
- Accent: `#dc2626` (Dark red)

---

### 12. needs_attention (ต้องการความสนใจ)
**ความหมาย:** ต้องการความช่วยเหลือ/ความสนใจ

**การแสดงออกทางใบหน้า:**
- ดูหมั่นใส่
- คิ้วยกขึ้นหนึ่งข้าง
- ปากเปิดเล็กน้อย

**ท่าทางร่างกาย:**
- ยืนตรงแต่หมุนหัวไปมา
- มือยกขึ้นเล็กน้อย
- ไหล่หนึ่งยกสูง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Inquisitive
- Head tilt ซ้าย-ขวา
- Hand raise ช้าๆ

**โทนสี:**
- UI: `bg-purple-50` ข้อความ `text-purple-600`
- Background: `bg-cream`
- Accent: `#a855f7` (Purple)

---

### 13. insufficient_data (ข้อมูลไม่เพียงพอ)
**ความหมาย:** ไม่มีข้อมูลเพียงพอในการประเมิน

**การแสดงออกทางใบหน้า:**
- สับสน
- คิ้วขมั้นห่างกัน
- ตามองด้วยความสงสัย

**ท่าทางร่างกาย:**
- ยืนเอนไปมา
- มือขูดศีรษะ
- ไหล่เอียง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Questioning
- Head scratch
- Side-to-side sway

**โทนสี:**
- UI: `bg-gray-50` ข้อความ `text-gray-500`
- Background: `bg-cream`
- Accent: `#9ca3af` (Light gray)

---

### 14. anomaly (ผิดปกติ)
**ความหมาย:** มีบางอย่างผิดปกติ นอกเหนือจากที่คาด

**การแสดงออกทางใบหน้า:**
- ประหลาด
- คิ้วเป็นรูป 8
- ตาเหลียวแหล

**ท่าทางร่างกาย:**
- ยืนตรงแต่หมุนหัว 45 องศา
- มือทั้งสองยกขึ้นไหล่
- แขนขวาเอียงขึ้น

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Confused
- Head tilt มุมฉาก
- One eyebrow raise loop

**โทนสี:**
- UI: `bg-pink-50` ข้อความ `text-pink-600`
- Background: `bg-cream`
- Accent: `#ec4899` (Pink)

---

### 15. inconsistent (ไม่สม่ำเสมอ)
**ความหมาย:** ผลงานไม่สม่ำเสมอ ผันผวน

**การแสดงออกทางใบหน้า:**
- เปลี่ยนแปลง
- ด้านหนึ่งยิ้ม อีกด้านคิ้วขมั้น
- ตามองไปทิศทางอื่น

**ท่าทางร่างกาย:**
- ยืนเอนไปมา
- ไหล่หนึ่งสูง อีกหนึ่งต่ำ
- มือข้างหนึ่งในกระเป๋า อีกข้างหนึ่งแขวง

**การเคลื่อนไหว/แอนิเมชัน:**
- การเคลื่อนไหวแบบ Unpredictable
- Sway side to side
- Quick micro-movements

**โทนสี:**
- UI: `bg-amber-50` ข้อความ `text-amber-600`
- Background: `bg-cream`
- Accent: `#d97706` (Amber)

---

## JSON Mapping สำหรับ Animation Parameters

```json
{
  "character": {
    "name": "Nong Noy",
    "base_proportion": {
      "head_to_body": "2:1",
      "style": "chibi_modern"
    }
  },
  "states": {
    "positive": {
      "facial": {
        "eyebrow": "neutral_raised",
        "eyes": "open_happy",
        "mouth": "smile_gentle",
        "cheeks": "slight_blush"
      },
      "posture": {
        "head": "upright",
        "shoulders": "relaxed",
        "arms": "holding_bag",
        "stance": "straight"
      },
      "animation": {
        "type": "smooth_bouncy",
        "duration": 800,
        "easing": "easeOut",
        "loop": true,
        "motions": ["walk_light", "head_nod"]
      },
      "colors": {
        "ui": { "bg": "bg-sage/10", "text": "text-sage" },
        "background": "bg-cream",
        "accent": "#7d9a7c"
      }
    },
    "improving": {
      "facial": {
        "eyebrow": "slight_raise",
        "eyes": "looking_forward_hopeful",
        "mouth": "small_smile",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "slight_forward_tilt",
        "shoulders": "back",
        "arms": "one_raised_slightly",
        "stance": "leaning_forward"
      },
      "animation": {
        "type": "gradual_rise",
        "duration": 600,
        "easing": "easeOutCubic",
        "loop": true,
        "motions": ["walk_confident", "arm_slow_swing"]
      },
      "colors": {
        "ui": { "bg": "bg-blue-50", "text": "text-blue-600" },
        "background": "bg-cream",
        "accent": "#3b82f6"
      }
    },
    "excellent": {
      "facial": {
        "eyebrow": "raised_high",
        "eyes": "sparkling",
        "mouth": "big_smile_teeth",
        "cheeks": "rosy"
      },
      "posture": {
        "head": "tilted_back",
        "shoulders": "back_proud",
        "arms": "victory_pose",
        "stance": "proud_straight"
      },
      "animation": {
        "type": "celebratory",
        "duration": 1000,
        "easing": "easeOutElastic",
        "loop": false,
        "motions": ["mini_jump", "arms_raise", "confetti_small"]
      },
      "colors": {
        "ui": { "bg": "bg-accent/10", "text": "text-accent" },
        "background": "bg-cream",
        "accent": "#e07a5f"
      }
    },
    "neutral": {
      "facial": {
        "eyebrow": "neutral",
        "eyes": "looking_straight",
        "mouth": "closed",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "level",
        "shoulders": "level",
        "arms": "sides",
        "stance": "straight_normal"
      },
      "animation": {
        "type": "neutral_steady",
        "duration": 0,
        "easing": "linear",
        "loop": true,
        "motions": ["idle_breathing"]
      },
      "colors": {
        "ui": { "bg": "bg-gray-100", "text": "text-gray-600" },
        "background": "bg-cream",
        "accent": "#6b7280"
      }
    },
    "informative": {
      "facial": {
        "eyebrow": "slight_furrow",
        "eyes": "focused",
        "mouth": "small_open_speaking",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "slight_turn",
        "shoulders": "level",
        "arms": "pointing_forward",
        "hands": "holding_tablet"
      },
      "animation": {
        "type": "gentle_informative",
        "duration": 1200,
        "easing": "easeInOut",
        "loop": true,
        "motions": ["point_slow", "head_tilt_slight"]
      },
      "colors": {
        "ui": { "bg": "bg-indigo-50", "text": "text-indigo-600" },
        "background": "bg-cream",
        "accent": "#6366f1"
      }
    },
    "stable": {
      "facial": {
        "eyebrow": "neutral",
        "eyes": "confident",
        "mouth": "gentle_smile",
        "cheeks": "relaxed"
      },
      "posture": {
        "head": "upright",
        "shoulders": "square",
        "arms": "crossed_chest",
        "stance": "feet_apart_stable"
      },
      "animation": {
        "type": "solid_consistent",
        "duration": 0,
        "easing": "linear",
        "loop": true,
        "motions": ["minimal_movement", "steady_breathing"]
      },
      "colors": {
        "ui": { "bg": "bg-teal-50", "text": "text-teal-600" },
        "background": "bg-cream",
        "accent": "#14b8a6"
      }
    },
    "warning": {
      "facial": {
        "eyebrow": "furrowed",
        "eyes": "concerned",
        "mouth": "slight_frown",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "slight_tilt",
        "shoulders": "one_shrugged",
        "arms": "hand_on_shoulder",
        "stance": "slight_crouch"
      },
      "animation": {
        "type": "hesitant",
        "duration": 500,
        "easing": "easeInOut",
        "loop": true,
        "motions": ["arm_raise_lower", "head_tilt_lr"]
      },
      "colors": {
        "ui": { "bg": "bg-gold/10", "text": "text-gold" },
        "background": "bg-cream",
        "accent": "#f4a261"
      }
    },
    "declining": {
      "facial": {
        "eyebrow": "sad_drooped",
        "eyes": "looking_down",
        "mouth": "frown",
        "cheeks": "pale"
      },
      "posture": {
        "head": "bowed",
        "shoulders": "slumped",
        "arms": "hanging_loose",
        "stance": "slouched"
      },
      "animation": {
        "type": "slow_heavy",
        "duration": 1000,
        "easing": "easeIn",
        "loop": true,
        "motions": ["walk_drag", "shoulder_drop"]
      },
      "colors": {
        "ui": { "bg": "bg-orange-50", "text": "text-orange-600" },
        "background": "bg-cream",
        "accent": "#f97316"
      }
    },
    "at_risk": {
      "facial": {
        "eyebrow": "worried_high",
        "eyes": "wide_worried",
        "mouth": "slight_open",
        "cheeks": "tense"
      },
      "posture": {
        "head": "down_tense",
        "shoulders": "hunched_high",
        "arms": "clenched_fists",
        "stance": "crouched_protect"
      },
      "animation": {
        "type": "trembling",
        "duration": 300,
        "easing": "easeInOut",
        "loop": true,
        "motions": ["shake_slight", "look_anxious"]
      },
      "colors": {
        "ui": { "bg": "bg-red-50", "text": "text-red-600" },
        "background": "bg-cream",
        "accent": "#ef4444"
      }
    },
    "critical": {
      "facial": {
        "eyebrow": "panicked_high",
        "eyes": "wide_tearful",
        "mouth": "wide_open",
        "cheeks": "wet_tears"
      },
      "posture": {
        "head": "bowed_low",
        "shoulders": "raised_tense",
        "arms": "covering_face",
        "stance": "curled_defensive"
      },
      "animation": {
        "type": "panicked",
        "duration": 150,
        "easing": "linear",
        "loop": true,
        "motions": ["shake_intense", "look_rapid", "tremble"]
      },
      "colors": {
        "ui": { "bg": "bg-coral/10", "text": "text-coral", "border": "border-coral" },
        "background": "bg-coral/5",
        "accent": "#ff6b6b"
      }
    },
    "urgent": {
      "facial": {
        "eyebrow": "furrowed_intense",
        "eyes": "wide_urgent",
        "mouth": "firm_line",
        "cheeks": "tense"
      },
      "posture": {
        "head": "forward_lean",
        "shoulders": "forward",
        "arms": "pointing_urgent",
        "stance": "one_foot_forward"
      },
      "animation": {
        "type": "urgent",
        "duration": 200,
        "easing": "easeOut",
        "loop": true,
        "motions": ["walk_fast", "point_rapid", "head_bob_quick"]
      },
      "colors": {
        "ui": { "bg": "bg-red-100", "text": "text-red-700" },
        "background": "bg-cream",
        "accent": "#dc2626"
      }
    },
    "needs_attention": {
      "facial": {
        "eyebrow": "one_raised",
        "eyes": "looking_curious",
        "mouth": "small_open",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "turned",
        "shoulders": "one_raised",
        "arms": "hand_raised_question",
        "stance": "turned_side"
      },
      "animation": {
        "type": "inquisitive",
        "duration": 700,
        "easing": "easeInOut",
        "loop": true,
        "motions": ["head_tilt_lr", "hand_raise_slow"]
      },
      "colors": {
        "ui": { "bg": "bg-purple-50", "text": "text-purple-600" },
        "background": "bg-cream",
        "accent": "#a855f7"
      }
    },
    "insufficient_data": {
      "facial": {
        "eyebrow": "furrowed_apart",
        "eyes": "looking_confused",
        "mouth": "flat_confused",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "tilted_question",
        "shoulders": "uneven",
        "arms": "scratching_head",
        "stance": "swaying"
      },
      "animation": {
        "type": "questioning",
        "duration": 900,
        "easing": "easeInOut",
        "loop": true,
        "motions": ["head_scratch", "sway_gentle"]
      },
      "colors": {
        "ui": { "bg": "bg-gray-50", "text": "text-gray-500" },
        "background": "bg-cream",
        "accent": "#9ca3af"
      }
    },
    "anomaly": {
      "facial": {
        "eyebrow": "asymmetric_figure8",
        "eyes": "looking_sideways",
        "mouth": "crooked",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "tilted_45deg",
        "shoulders": "shrugged_both",
        "arms": "both_raised_palms",
        "stance": "but_cocked"
      },
      "animation": {
        "type": "confused",
        "duration": 1200,
        "easing": "easeOutBack",
        "loop": true,
        "motions": ["head_tilt_extreme", "eyebrow_raise_loop"]
      },
      "colors": {
        "ui": { "bg": "bg-pink-50", "text": "text-pink-600" },
        "background": "bg-cream",
        "accent": "#ec4899"
      }
    },
    "inconsistent": {
      "facial": {
        "eyebrow": "asymmetric_one_up_one_down",
        "eyes": "looking_away",
        "mouth": "half_smile_half_frown",
        "cheeks": "neutral"
      },
      "posture": {
        "head": "tilted_irregular",
        "shoulders": "uneven_high_low",
        "arms": "one_in_pocket_one_out",
        "stance": "swaying_irregular"
      },
      "animation": {
        "type": "unpredictable",
        "duration": 400,
        "easing": "easeInOutQuad",
        "loop": true,
        "motions": ["sway_side_to_side", "micro_movements_quick"]
      },
      "colors": {
        "ui": { "bg": "bg-amber-50", "text": "text-amber-600" },
        "background": "bg-cream",
        "accent": "#d97706"
      }
    }
  }
}
```

---

## Animation Presets สำหรับ React / Framer Motion

```javascript
// ตัวอย่างการใช้งานกับ Framer Motion
export const animationPresets = {
  positive: {
    initial: { scale: 0.9, opacity: 0 },
    animate: {
      scale: [0.9, 1.02, 1],
      opacity: 1,
      y: [0, -4, 0]
    },
    transition: { duration: 0.8, ease: "easeOut" }
  },
  improving: {
    initial: { scale: 0.95, opacity: 0 },
    animate: {
      scale: 1,
      opacity: 1,
      y: 0
    },
    transition: { duration: 0.6, ease: "easeOutCubic" }
  },
  excellent: {
    initial: { scale: 0, rotate: -10 },
    animate: {
      scale: [0, 1.1, 1],
      rotate: [-10, 5, 0],
      y: [0, -8, 0]
    },
    transition: { duration: 1, ease: "easeOutElastic" }
  },
  critical: {
    animate: {
      x: [0, -2, 2, -2, 2, 0],
      y: [0, 1, 0, 1, 0, 0],
      scale: [1, 1.02, 1]
    },
    transition: { duration: 0.3, repeat: Infinity }
  },
  at_risk: {
    animate: {
      x: [0, -1, 1, -1, 1, 0],
      scale: [1, 1.01, 1]
    },
    transition: { duration: 0.5, repeat: Infinity }
  },
  inconsistent: {
    animate: {
      rotate: [-2, 2, -2],
      x: [0, 3, 0, -3, 0]
    },
    transition: { duration: 0.8, repeat: Infinity }
  }
}
```

---

## หมายเหตุการออกแบบ (Design Notes)

1. **ความสม่ำเสมอ (Consistency):** ใช้ตัวละครตัวเดียวกันหมด แต่เปลี่ยนแค่ท่าทาง
2. **ความเหมาะสม (Appropriateness):** แอนิเมชันไม่ต้องมากเกินไป เน้นความรู้สึกมากกว่าความบันเทิง
3. **การเข้าถึง (Accessibility):** มี text label ประกอบเสมอ ไม่พึ่งพาภาพเคลื่อนไหวอย่างเดียว
4. **สีที่ใช้ (Color Usage):** ทุกสถานะใช้สีที่สอดคล้องกับ Lumaid Design System
5. **ความเร็ว (Speed):** แอนิเมชันควรเร็วพอที่จะเข้าใจ แต่ไม่เร็วจนเสียอารมณ์
