# ระบบจัดการแบบฝึกหัดและติดตามผลการเรียน (Practice Hub)
### Architecture: Next.js (App Router) + Firebase + Vercel + Google OAuth

---

## 1. ภาพรวมปัญหา

```
ปัจจุบัน                              เป้าหมาย
─────────                             ────────
ครูแต่ละคน                            
 ├─ Google Form                       ┌──────────────────┐
 ├─ ทำเว็บเอง                    →    │  ระบบกลางเดียว    │
 ├─ ส่งลิงก์                          │  Central System   │
 └─ ใช้ระบบอื่น ๆ                     └──────────────────┘
                                              │
นักเรียน                              ┌───────┴───────┐
 ├─ จำเองว่าต้องทำอะไร                ▼               ▼
 ├─ ตามลิงก์เอง                   Student          Teacher
 ├─ ไม่รู้ว่าทำอะไรไปแล้ว           Dashboard       Dashboard
 └─ ผลกระจายหลายที่
```

**Core flow**
- นักเรียน: `Discover → Do → Submit → Know Result`
- ครู: `Create → Assign → Monitor → Analyze`

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         GitHub Repo                         │
└──────────────────────────────┬──────────────────────────────┘
                               │ push
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Vercel (CI/CD + Hosting)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Next.js App                         │  │
│  │  ┌─────────────┐        ┌─────────────────────────┐   │  │
│  │  │  Frontend   │        │  Server Actions /       │   │  │
│  │  │  (RSC/React)│◄──────►│  Route Handlers         │   │  │
│  │  └─────────────┘        │  (firebase-admin SDK)    │   │  │
│  │       ▲                 └────────────┬────────────┘   │  │
│  │       │ Cookie Session               │                 │  │
│  └───────┼──────────────────────────────┼────────────────┘  │
└──────────┼──────────────────────────────┼───────────────────┘
           │                              │
           ▼                              ▼
 ┌──────────────────┐           ┌──────────────────┐
 │  Firebase Auth   │           │    Firestore     │
 │  (Google OAuth)  │           │    (Database)    │
 └──────────────────┘           └──────────────────┘
```

---

## 3. Auth Flow — Firebase Auth + Session Cookie (Next.js App Router)

เพื่อให้รองรับ Next.js App Router ทั้ง **Server Components** และ **Server Actions** ได้อย่างราบรื่น ระบบใช้ Session Cookie แทนการส่ง Authorization header:

```
[Client]
   │
   │ 1. คลิก "Sign in with Google"
   ▼
GoogleAuthProvider (hd: "schooldomain.ac.th")
   │
   │ 2. Google popup/redirect → ได้รับ Firebase ID Token
   ▼
[Client] POST /api/auth/session พร้อม ID Token
   │
   ▼
[Server: Route Handler]
   │ 3. firebase-admin.auth().verifyIdToken(idToken)
   │    - ตรวจสอบ email_verified
   │    - ตรวจสอบ Domain โรงเรียนซ้ำอีกชั้น (server-side check)
   │ 4. First-time User Provisioning (Server Admin SDK):
   │    - หากล็อกอินครั้งแรก ให้ Server สร้าง /users/{uid} กำหนด role: "student" เสมอ
   │    - (Client ห้ามสร้าง doc นี้เองเด็ดขาด เพื่อปิดช่องโหว่ self-assign role)
   │ 5. firebase-admin.auth().createSessionCookie(idToken, { expiresIn })
   │ 6. ตั้งค่า httpOnly, Secure cookie กลับไปยัง Client
   ▼
[Server Actions / Server Components]
   │ 7. อ่าน session cookie ผ่าน cookies() ของ Next.js
   │ 8. ดึง role (จาก Custom Claims หรือ Firestore /users/{uid})
   ▼
[อนุญาต/ปฏิเสธ การทำงานตาม role]
```

> **กฎเหล็กด้าน Security:** 
> 1. ห้าม trust role จากฝั่ง Client เด็ดขาด ต้องอ่านจาก Session / Token ที่ verify ผ่าน Server เท่านั้น
> 2. ปิด Client Create ที่ `/users/{uid}` — บังคับให้ Server (Admin SDK) เป็นผู้สร้าง doc พร้อมกำหนด role เริ่มต้นเสมอ
> 3. ตรวจสอบ email domain ซ้ำที่ฝั่ง Server เสมอ (อย่าพึ่งพาแค่ `hd` parameter ของ Google Client)

---

## 4. Data Model (Firestore)

```
/users/{uid}
    email: string
    displayName: string
    role: "student" | "teacher" | "admin"
    classIds: string[]          // รองรับนักเรียนที่อยู่ได้หลายห้อง/วิชา
    updatedAt: timestamp

/classes/{classId}
    name: string
    teacherId: string
    studentIds: string[]        // รายชื่อ uid นักเรียนในห้อง
    createdAt: timestamp

/assignments/{assignmentId}
    classId: string
    teacherId: string
    title: string
    description: string
    maxScore: number
    dueAt: timestamp            // กำหนดส่งงาน
    createdAt: timestamp
    questions: [
        { 
            id: string, 
            type: "multiple_choice" | "true_false", 
            prompt: string, 
            options: string[],  // ตัวเลือก (ไม่มีคำตอบที่ถูก)
            points: number 
        }
    ]

/answerKeys/{assignmentId}      // แยก collection ห้าม client เข้าถึงโดยเด็ดขาด
    answers: [
        { questionId: string, correctAnswer: any }
    ]

/submissions/{submissionId}     // ID แนะนำใช้: ${assignmentId}_${studentId} ป้องกันการส่งซ้ำ
    assignmentId: string
    studentId: string
    classId: string             // denormalized ช่วยให้ครู query ทั้งห้องได้เร็ว
    answers: [
        { questionId: string, selectedAnswer: any }
    ]
    score: number
    status: "in_progress" | "submitted" | "graded"
    submittedAt: timestamp
    gradedAt: timestamp
```

---

## 5. Security Rules (Production-Ready)

บันทึกเป็นไฟล์ `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(uid) {
      return isSignedIn() && request.auth.uid == uid;
    }

    function isTeacherOf(classId) {
      return get(/databases/$(database)/documents/classes/$(classId)).data.teacherId == request.auth.uid;
    }

    function isStudentInClass(classId) {
      return request.auth.uid in get(/databases/$(database)/documents/classes/$(classId)).data.studentIds;
    }

    function isTeacher() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['teacher', 'admin'];
    }

    // --- Users ---
    // ปิด create จาก Client 100% (สร้างผ่าน Server Admin SDK ตอนล็อกอินครั้งแรก พร้อม role "student" เสมอ)
    // ป้องกัน Privacy Leak: ให้อ่านได้เฉพาะเจ้าของบัญชี หรือครู/แอดมิน เพื่อดูข้อมูลนักเรียน
    // Client เจ้าของอัปเดตข้อมูลทั่วไปได้ แต่ห้ามแก้ role เด็ดขาด
    match /users/{uid} {
      allow read: if isOwner(uid) || isTeacher();
      allow create: if false;
      allow update: if isOwner(uid) && request.resource.data.role == resource.data.role;
      allow delete: if false;
    }

    // --- Classes ---
    // อ่านได้เฉพาะครูผู้สอนหรือนักเรียนในห้อง
    // สร้างได้เฉพาะผู้ใช้ที่มี role "teacher" หรือ "admin" และต้องกำหนด teacherId เป็นของตัวเอง
    // อัปเดตได้เฉพาะครูเจ้าของห้อง และห้ามเปลี่ยนความเป็นเจ้าของ (ห้ามแก้ teacherId)
    match /classes/{classId} {
      allow read: if isSignedIn() && (
        resource.data.teacherId == request.auth.uid || 
        request.auth.uid in resource.data.studentIds
      );
      allow create: if isTeacher() && request.resource.data.teacherId == request.auth.uid;
      allow update: if isTeacherOf(classId) && 
        request.resource.data.teacherId == resource.data.teacherId;
      allow delete: if isTeacherOf(classId);
    }

    // --- Assignments ---
    // อ่านได้ทั้งครูและนักเรียนในคลาสนั้น, สร้าง/แก้/ลบ ได้เฉพาะครูผู้สอนของคลาสนั้น
    // ป้องกัน Cross-Tenant Data Injection: ห้ามย้ายห้อง (classId) และห้ามเปลี่ยนเจ้าของ (teacherId)
    match /assignments/{id} {
      allow read: if isSignedIn() && (
        isTeacherOf(resource.data.classId) || 
        isStudentInClass(resource.data.classId)
      );
      allow create: if isTeacher() && 
        isTeacherOf(request.resource.data.classId) && 
        request.resource.data.teacherId == request.auth.uid;
      allow update: if isTeacherOf(resource.data.classId) &&
        request.resource.data.classId == resource.data.classId &&
        request.resource.data.teacherId == resource.data.teacherId;
      allow delete: if isTeacherOf(resource.data.classId);
    }

    // --- AnswerKeys ---
    // ปิดกั้นการเข้าถึงจาก Client 100% เข้าถึงผ่าน firebase-admin SDK บน Server เท่านั้น
    match /answerKeys/{id} {
      allow read, write: if false;
    }

    // --- Submissions ---
    // ป้องกันการโกง: Client ห้ามเขียน/แก้คะแนนเองโดยตรง (write: if false)
    // การส่งงานและตรวจคำตอบทำผ่าน Server Action (Admin SDK) เท่านั้น
    match /submissions/{id} {
      allow read: if isSignedIn() && (
        resource.data.studentId == request.auth.uid ||
        isTeacherOf(resource.data.classId)
      );
      allow write: if false;
    }
  }
}
```

---

## 6. Grading Flow (Server-Side Only)

เพื่อความปลอดภัยสูงสุดและป้องกันการแอบดูเฉลยหรือดัดแปลงคะแนน:

```
Student ส่งคำตอบผ่านหน้าเว็บ
        │
        ▼
Next.js Server Action (ใช้ firebase-admin SDK ซึ่ง bypass firestore rules)
        │
        ├─ 1. ตรวจสอบสิทธิ์ผู้ใช้จาก Session
        ├─ 2. ตรวจสอบกำหนดส่ง (Check: now <= assignment.dueAt)
        ├─ 3. อ่านเฉลยจาก /answerKeys/{assignmentId}
        ├─ 4. ตรวจเทียบคำตอบและคำนวณคะแนนรวม
        └─ 5. บันทึกผลลง /submissions/${assignmentId}_${studentId}
              { score, status: "graded", submittedAt, gradedAt }
        │
        ▼
Client แสดงผลคะแนนทันที หรืออ่านผลผ่าน Real-time Listener
```

---

## 7. Deployment Pipeline & Environment Variables

```
git push → GitHub
    │
    ▼
Vercel: Build & Deploy Next.js (Auto on push)
    │
Firebase CLI: Deploy Rules (รันเมื่อมีการปรับ Security Rules)
    firebase deploy --only firestore:rules
```

### Environment Variables ที่จำเป็น

**Vercel Project Settings (Production / Preview):**

| Variable | Scope | คำอธิบาย |
|---|---|---|
| `FIREBASE_ADMIN_PROJECT_ID` | Server | Project ID จาก Firebase Service Account |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Client Email ของ Service Account |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Private Key (ดูข้อควรระวังด้านล่าง) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Client | Firebase Web API Key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Client | Auth Domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Client | Project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Client | Storage Bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Client | Sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Client | App ID |

> [!WARNING]
> **ข้อควรระวังเรื่อง Private Key ใน Vercel:**  
> ตัวแปร `FIREBASE_ADMIN_PRIVATE_KEY` มักมีปัญหา newline `\n` ถูกแปลงเป็น literal string `\\n` ตอนนำไป initialize ให้แปลงกลับก่อนเสมอ:
> ```typescript
> privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
> ```

---

## 8. Scope: MVP vs Phase 2

| MVP (ทำก่อน) | Phase 2 |
|---|---|
| Google OAuth login (จำกัด domain โรงเรียน) + Session Cookie | ระบบ Auto-grading พร้อม Feedback ละเอียดรายข้อ |
| Firestore schema พื้นฐาน (users/classes/assignments/submissions) | Analytics เชิงลึก (วิเคราะห์ข้อสอบยาก-ง่าย) |
| Teacher สร้าง assignment แบบเลือกตอบ (Multiple Choice / True-False) | Notification แจ้งเตือนงานใกล้ครบกำหนดผ่าน Line/Email |
| Student ดูรายการงานที่ต้องทำ + ทำข้อสอบ + ส่งคำตอบ | Gamification (Badges / Streak / Leaderboard) |
| ครูเห็น Dashboard ผลคะแนนรวมและสถานะการส่งงาน | Export ผลคะแนนเป็นไฟล์ Excel / CSV |

---

## 9. Tech Stack สรุป

```
Frontend/Backend : Next.js (App Router, Server Actions, Route Handlers)
Styling          : Tailwind CSS v4
Hosting/CI-CD    : Vercel
Auth             : Firebase Auth (Google Provider + Session Cookie)
Database         : Cloud Firestore
Server SDK       : firebase-admin SDK
```
