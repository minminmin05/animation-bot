-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create table
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding VECTOR(1536),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kb_embedding ON knowledge_base USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_metadata ON knowledge_base USING GIN (metadata);

-- Insert dummy data
INSERT INTO knowledge_base (category, title, content, metadata) VALUES
('policy', 'Attendance Policy', 'นักเรียนต้องมีเวลาเรียนไม่น้อยกว่า 80% ของเวลาเรียนทั้งหมดในแต่ละรายวิชา หากเวลาเรียนไม่ถึงเกณฑ์ จะไม่มีสิทธิ์สอบปลายภาค (ติด มส.) ข้อยกเว้นคือกรณีลาป่วยที่มีใบรับรองแพทย์ หรือลากิจฉุกเฉินที่ผู้ปกครองรับรอง', '{"audience": ["student", "parent", "teacher"]}'),
('policy', 'Late Arrival', 'นักเรียนที่มาถึงโรงเรียนหลังเวลา 08:00 น. จะถือว่ามาสาย การมาสาย 3 ครั้ง จะถูกนับเป็นการขาดเรียน 1 วันเต็ม และจะถูกหักคะแนนความประพฤติ 5 คะแนนต่อครั้ง', '{"audience": ["student", "parent"]}'),
('grading', 'Grading Scale', 'ระบบการตัดเกรดของโรงเรียน: 80-100 ได้เกรด 4, 75-79 ได้เกรด 3.5, 70-74 ได้เกรด 3, 65-69 ได้เกรด 2.5, 60-64 ได้เกรด 2, 55-59 ได้เกรด 1.5, 50-54 ได้เกรด 1, ต่ำกว่า 50 ได้เกรด 0 (ตก)', '{"audience": ["teacher", "student"]}'),
('grading', 'Makeup Exams', 'นักเรียนที่สอบตก (ได้เกรด 0) ในสอบกลางภาคหรือปลายภาค มีสิทธิ์ขอสอบแก้ตัวได้ 1 ครั้ง โดยต้องยื่นคำร้องภายใน 7 วันหลังประกาศผล เกรดสูงสุดที่ได้จากการสอบแก้ตัวคือเกรด 1 เท่านั้น', '{"audience": ["student", "teacher"]}'),
('system_guide', 'Enter Grades', 'สำหรับคุณครู: วิธีการกรอกคะแนน ให้ไปที่เมนู Grades ในหน้า Teacher Dashboard เลือกรายวิชาที่สอน จากนั้นคลิกที่รายชื่อนักเรียนเพื่อกรอกคะแนน แล้วกดปุ่ม Save Grades เพื่อบันทึกลงระบบ', '{"audience": ["teacher"]}'),
('system_guide', 'Create Assignment', 'คุณครูสามารถสร้างการบ้านได้โดยไปที่เมนู Assignments เลือกคลาส กรอกชื่อการบ้าน รายละเอียด และกำหนดวันส่ง (Due Date) เมื่อกดสร้าง นักเรียนในคลาสนั้นจะเห็นการบ้านทันที', '{"audience": ["teacher"]}'),
('system_guide', 'Edit Student Info', 'แอดมินหรือฝ่ายทะเบียนสามารถแก้ไขข้อมูลส่วนตัวนักเรียนได้ โดยไปที่เมนู Student Management ค้นหาชื่อนักเรียน และคลิกปุ่ม Edit (ไอคอนดินสอ) จะมีหน้าต่างขึ้นมาให้แก้ไข ข้อมูลผู้ปกครอง โรคประจำตัว หรือที่อยู่', '{"audience": ["admin"]}'),
('faq', 'Reset Password', 'หากนักเรียนหรือคุณครูลืมรหัสผ่าน ให้คลิกที่ Forgot Password หน้าล็อกอิน แล้วกรอกอีเมล ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้ หากไม่ได้อีเมล ให้ติดต่อแอดมินระบบ', '{"audience": ["all"]}'),
('faq', 'View Report Card', 'นักเรียนและผู้ปกครองสามารถดูใบรายงานผลการเรียน (Report Card) ได้โดยเข้าสู่ระบบ ไปที่เมนู Academic Records หรือ My Grades จะสามารถดูผลการเรียนรายวิชาและเกรดเฉลี่ยสะสม (GPA) ได้', '{"audience": ["student", "parent"]}'),
('policy', 'Uniform Rules', 'นักเรียนต้องแต่งกายด้วยเครื่องแบบนักเรียนที่ถูกต้องตามระเบียบ วันที่มีเรียนพละศึกษาให้สวมชุดพละได้ ห้ามสวมรองเท้าแตะหรือทำสีผมผิดธรรมชาติ หากฝ่าฝืนจะถูกตักเตือนและหักคะแนนความประพฤติ', '{"audience": ["student", "parent"]}'),
('policy', 'Phone Usage', 'ห้ามใช้โทรศัพท์มือถือระหว่างการเรียนการสอน ยกเว้นได้รับอนุญาตจากครูผู้สอนเพื่อใช้ประกอบการเรียน หากพบเห็นการใช้งานผิดระเบียบ ครูสามารถยึดโทรศัพท์ไว้และคืนหลังเลิกเรียน', '{"audience": ["student", "teacher"]}'),
('faq', 'Contact Admin', 'หากพบปัญหาในระบบจัดการโรงเรียน (School Management System) เช่น ข้อมูลคลาสเรียนไม่ขึ้น หรือรายชื่อนักเรียนหาย สามารถติดต่อผู้ดูแลระบบได้ที่อีเมล admin@school.com หรือที่ห้องธุรการ', '{"audience": ["all"]}'),
('system_guide', 'Attendance Tracking', 'การเช็คชื่อเข้าเรียน: ครูเข้าเมนู Attendance เลือกวันที่และวิชา สามารถติ๊กเครื่องหมายถูกหน้านักเรียนที่มาเรียน และกากบาทสำหรับคนที่ขาดเรียน หรือระบุว่ามาสาย ระบบจะสรุปเปอร์เซ็นต์ให้ท้ายเทอม', '{"audience": ["teacher"]}'),
('grading', 'GPA Calculation', 'การคำนวณเกรดเฉลี่ยสะสม (GPA) ระบบจะนำหน่วยกิตของแต่ละวิชาคูณกับเกรดที่ได้ นำผลรวมทั้งหมดมาหารด้วยจำนวนหน่วยกิตรวมของทุกวิชาในเทอมนั้นๆ', '{"audience": ["student", "teacher"]}'),
('policy', 'Plagiarism', 'การทุจริตในการสอบหรือการคัดลอกผลงาน (Plagiarism) จะถูกลงโทษขั้นสูงสุด คือปรับตก (เกรด 0) ในรายวิชานั้นทันที และอาจถูกพิจารณาพักการเรียน ขึ้นอยู่กับความร้ายแรงของคณะกรรมการ', '{"audience": ["student"]}');
