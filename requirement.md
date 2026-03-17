# Project Requirements: [Brand Name] Platform

---

## 1. Core Modules (ฟีเจอร์หลัก)

### 1.1 Social Integration & Auth

- **Multi-Platform OAuth:** ระบบ Login และขอสิทธิ์จัดการผ่าน Facebook Login, Twitter OAuth, LinkedIn API และ TikTok Business.
- **Permission Scoping:** ขอสิทธิ์เฉพาะที่จำเป็น (เช่น `pages_manage_posts`, `instagram_basic`) เพื่อความโปร่งใสกับผู้ใช้.
- **Token Health Check:** หน้าจอแสดงสถานะ Token ว่ายังใช้งานได้หรือใกล้หมดอายุ (Expired/Revoked).

### 1.2 Unified Content Studio

- **Smart Composer:**
  - ช่องพิมพ์ข้อความเดียวที่สามารถ "Split View" ดู Preview แยกตาม Platform ได้ (เพราะขนาดภาพ/จำนวนตัวอักษรแต่ละที่จำกัดไม่เท่ากัน).
- **Hashtag Manager:** บันทึกกลุ่ม Hashtag ที่ใช้บ่อย.
- **Media Assets Library:**
  - Cloud Storage สำหรับเก็บรูปภาพและวิดีโอส่วนกลาง.
  - รองรับ Video Transcoding (แปลงไฟล์ให้เหมาะสมกับข้อกำหนดของแต่ละ Social).
- **Post Scheduling:** ระบบปฏิทินแบบลากวาง (Drag & Drop) เพื่อย้ายวัน-เวลาโพสต์.

### 1.3 Engagement & Moderation

- **Global Inbox:** หน้าจอรวม Comment และ Mention จากทุกโพสต์.
- **Sentiment Analysis:** *(Optional)* ระบบตรวจจับอารมณ์ของ Comment (บวก/ลบ) เพื่อจัดลำดับความสำคัญในการตอบ.
- **Quick Replies:** ระบบ Template คำตอบที่พบบ่อยเพื่อลดเวลาการทำงาน.

---

## 2. User Roles & Collaboration (ระบบทีม)

| Role        | Permissions                                                                  |
| ----------- | ---------------------------------------------------------------------------- |
| **Admin**   | จัดการทุกอย่าง รวมถึงการเชื่อมต่อ API และจัดการสมาชิกในทีม                       |
| **Editor**  | สร้างโพสต์, แก้ไขเนื้อหา, และตั้งเวลาโพสต์ (แต่ลบโพสต์ไม่ได้)                      |
| **Moderator** | ตอบ Comment, ซ่อน/ลบ Comment ที่ไม่เหมาะสม                               |
| **Viewer**  | ดู Report และสถิติได้อย่างเดียว (Read-only)                                  |

---

## 3. Technical Requirements

### 3.1 Backend & Integration

- **API Gateway:** เพื่อจัดการ Rate Limit ของแต่ละ Social Platform (ป้องกันการโดน Block).
- **Webhook Listener:** รองรับการรับข้อมูลแบบ Real-time เมื่อมีคนมา Comment หรือ Like.
- **Async Processing:** ใช้ระบบ Queue (เช่น Redis) เพื่อประมวลผลการส่งโพสต์จำนวนมากพร้อมกัน.

### 3.2 Security

- **Data Encryption:** ข้อมูล Access Token ต้องถูกเข้ารหัสด้วย AES-256 ก่อนลง Database.
- **Activity Logs:** บันทึกประวัติว่าใครเป็นคนโพสต์ หรือใครเป็นคนลบ Comment เพื่อตรวจสอบย้อนหลัง.