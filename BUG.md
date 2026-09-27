# Learning System — Bug Fix & Security Guide

> คู่มือแก้ Bug และปรับปรุงระบบ Learning System
>
> เป้าหมาย: ทำให้ระบบสามารถใช้งานจริงกับ Student / Teacher / Admin ได้อย่างปลอดภัย และข้อมูลคะแนนไม่ผิดเพี้ยน

---

# Table of Contents

1. [ภาพรวม](#1-ภาพรวม)
2. [BUG-01 — Student เข้าหน้า Teacher Dashboard](#2-bug-01--student-เข้าหน้า-teacher-dashboard)
3. [BUG-02 — Data Isolation ระหว่างห้องเรียน/ครู](#3-bug-02--data-isolation-ระหว่างห้องเรียนครู)
4. [BUG-03 — ส่งงานของห้องอื่นได้](#4-bug-03--ส่งงานของห้องอื่นได้)
5. [BUG-04 — Authentication Fail-open](#5-bug-04--authentication-fail-open)
6. [BUG-05 — Admin SDK Bypass Firestore Rules](#6-bug-05--admin-sdk-bypass-firestore-rules)
7. [BUG-06 — Race Condition ตอน Submit](#7-bug-06--race-condition-ตอน-submit)
8. [BUG-07 — Assignment + Answer Key ไม่ Atomic](#8-bug-07--assignment--answer-key-ไม่-atomic)
9. [BUG-08 — Server Validation ไม่ครบ](#9-bug-08--server-validation-ไม่ครบ)
10. [BUG-09 — Timezone ของ Deadline](#10-bug-09--timezone-ของ-deadline)
11. [BUG-10 — Due Date Hardcode](#11-bug-10--due-date-hardcode)
12. [BUG-11 — Submission Rate ผิด](#12-bug-11--submission-rate-ผิด)
13. [BUG-12 — Average Score ผิดความหมาย](#13-bug-12--average-score-ผิดความหมาย)
14. [BUG-13 — Dashboard Hardcode](#14-bug-13--dashboard-hardcode)
15. [BUG-14 — true_false รองรับไม่ครบ](#15-bug-14--true_false-รองรับไม่ครบ)
16. [BUG-15 — ตรวจ Class Ownership](#16-bug-15--ตรวจ-class-ownership)
17. [BUG-16 — Firebase Dummy Config](#17-bug-16--firebase-dummy-config)
18. [BUG-17 — Error Leakage](#18-bug-17--error-leakage)
19. [BUG-18 — Admin ถูกมองเป็น Student](#19-bug-18--admin-ถูกมองเป็น-student)
20. [BUG-19 — Client Submit Protection](#20-bug-19--client-submit-protection)
21. [Testing Checklist](#21-testing-checklist)
22. [ลำดับการแก้](#22-ลำดับการแก้)

---

# 1. ภาพรวม

ระบบมี Architecture ประมาณนี้:

```text
Browser
   │
   ├── Firebase Auth
   │
   ▼
Next.js Server
   │
   ├── Server Actions
   │
   └── Firebase Admin SDK
           │
           ▼
       Firestore
```

สิ่งสำคัญ:

> Client ไม่ใช่ Trusted Environment

ผู้ใช้สามารถ:

* เปิด DevTools
* แก้ JavaScript
* เรียก API/Server Action โดยตรง
* ส่ง Request ที่ไม่ได้มาจาก UI
* แก้ `assignmentId`
* แก้ `classId`
* ส่ง Request ซ้ำพร้อมกัน

ดังนั้นทุกสิ่งที่เกี่ยวกับ:

* Permission
* Role
* Ownership
* คะแนน
* Deadline
* Submission
* ข้อมูลสำคัญ

ต้องตรวจสอบที่ Server

---

# 2. BUG-01 — Student เข้าหน้า Teacher Dashboard

## ระดับ

**Critical — Authorization**

## ปัญหา

การตรวจ Login ไม่เท่ากับการตรวจ Permission

โค้ดที่มีลักษณะ:

```ts
const user = await getSessionUser();

if (!user) {
  redirect("/login");
}
```

ตรวจเพียงว่า:

> "Login แล้วหรือยัง?"

แต่ไม่ได้ตรวจ:

> "คนนี้มีสิทธิ์เข้า Teacher Dashboard หรือไม่?"

---

## ผลกระทบ

Student อาจลอง:

```text
/teacher
```

โดยตรง

ถ้า Server ไม่ตรวจ Role ก็อาจโหลดข้อมูล Teacher ได้

---

# วิธีแก้

สร้าง helper สำหรับตรวจสิทธิ์

## `lib/auth.ts`

```ts
import { redirect } from "next/navigation";
import { getSessionUser } from "./session";

export async function requireUser() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

export async function requireTeacher() {
  const user = await requireUser();

  if (user.role !== "teacher" && user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
```

จากนั้น:

```ts
// app/teacher/page.tsx

const user = await requireTeacher();
```

แทนการเขียนตรวจเองทุกหน้า

---

## สำคัญ

อย่าทำแบบนี้:

```tsx
if (user.role !== "teacher") {
  return null;
}
```

เพียงอย่างเดียว

เพราะยังโหลดข้อมูลมาก่อนแล้ว

ต้องตรวจ Permission ก่อน Query Database

---

## Test

### Student

```text
GET /teacher
```

Expected:

```text
Redirect → /dashboard
```

### Teacher

```text
GET /teacher
```

Expected:

```text
200 OK
Teacher Dashboard
```

### Admin

Expected:

```text
200 OK
```

---

# 3. BUG-02 — Data Isolation ระหว่างห้องเรียน/ครู

## ระดับ

**Critical**

## ปัญหา

อย่า Query:

```ts
collection("assignments").limit(20)
```

แล้วเอาทุก Assignment มาแสดง

เพราะ Assignment เป็นข้อมูลที่มี Owner

---

# Teacher

ควร Query:

```ts
const snapshot = await adminDb
  .collection("assignments")
  .where("teacherId", "==", user.uid)
  .orderBy("createdAt", "desc")
  .limit(20)
  .get();
```

ดังนั้น:

```text
Teacher A
   ↓
teacherId == A
   ↓
เฉพาะ Assignment ของ A
```

---

# Student

Student ต้องผ่าน:

```text
Student
   ↓
Membership
   ↓
Class
   ↓
Assignments
```

ไม่ใช่:

```text
Student
   ↓
Assignments ทั้งระบบ
```

ตัวอย่าง:

```ts
const classId = user.classId;

const snapshot = await adminDb
  .collection("assignments")
  .where("classId", "==", classId)
  .orderBy("createdAt", "desc")
  .get();
```

---

# แต่ยังมีปัญหา

ห้ามเชื่อ:

```ts
user.classId
```

ถ้ามันเป็นข้อมูลที่ Client สามารถแก้ได้

ควรเก็บ Membership ในฐานข้อมูลที่ Server เป็นคนอ่าน

ตัวอย่าง:

```text
/classes/class-m4-1/members/{uid}
```

หรือ:

```text
/users/{uid}

{
  role: "student",
  classIds: [...]
}
```

---

# Definition of Done

Student ห้อง A:

```text
เห็น Assignment ห้อง A
ไม่เห็น Assignment ห้อง B
```

Teacher A:

```text
เห็นงานของตัวเอง
ไม่เห็นงานของ Teacher B
```

---

# 4. BUG-03 — ส่งงานของห้องอื่นได้

## ระดับ

**Critical**

นี่สำคัญกว่า UI มาก

สมมติ:

```text
Assignment A
classId = class-m4-1
```

Student อยู่:

```text
class-m4-2
```

แต่ Request ส่ง:

```json
{
  "assignmentId": "assignment-A"
}
```

Server ต้องไม่เชื่อ Assignment ID อย่างเดียว

---

# วิธีแก้

ใน Server Action:

```ts
const user = await requireUser();

if (user.role !== "student") {
  return {
    success: false,
    error: "ไม่มีสิทธิ์ส่งงาน",
  };
}
```

โหลด Assignment:

```ts
const assignmentRef = adminDb
  .collection("assignments")
  .doc(assignmentId);

const assignmentSnap = await assignmentRef.get();

if (!assignmentSnap.exists) {
  return {
    success: false,
    error: "ไม่พบแบบฝึกหัด",
  };
}

const assignment = assignmentSnap.data();
```

จากนั้นตรวจ Membership:

```ts
const memberRef = adminDb
  .collection("classes")
  .doc(assignment.classId)
  .collection("members")
  .doc(user.uid);

const memberSnap = await memberRef.get();

if (!memberSnap.exists) {
  return {
    success: false,
    error: "คุณไม่มีสิทธิ์ทำแบบฝึกหัดนี้",
  };
}
```

---

# ห้ามทำ

```ts
if (user.classId === assignment.classId)
```

ถ้า `user.classId` มาจาก Client หรือข้อมูลที่ผู้ใช้แก้ได้

สิทธิ์ต้องมาจากข้อมูลที่ Server เชื่อถือได้

---

# 5. BUG-04 — Authentication Fail-open

## ระดับ

**High**

ระบบไม่ควรมีพฤติกรรม:

```text
Config หาย
     ↓
ปล่อยผ่าน
```

ควรเป็น:

```text
Config หาย
     ↓
FAIL
     ↓
ไม่สร้าง Session
```

---

# วิธีแก้

สร้าง function:

```ts
function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}
```

ใช้:

```ts
const schoolDomain = getRequiredEnv(
  "SCHOOL_DOMAIN"
);
```

ไม่ควรใช้:

```ts
const schoolDomain =
  process.env.NEXT_PUBLIC_SCHOOL_DOMAIN || "";
```

เพราะทำให้ Config หายแล้วระบบยังทำงานต่อ

---

# Email validation

ตัวอย่าง:

```ts
if (!decodedToken.email) {
  throw new Error("Email is required");
}
```

ตรวจ Domain:

```ts
const email = decodedToken.email.toLowerCase();

if (!email.endsWith(`@${schoolDomain.toLowerCase()}`)) {
  throw new Error("Unauthorized domain");
}
```

ถ้าต้องการบังคับ Email Verification:

```ts
if (!decodedToken.email_verified) {
  throw new Error("Email is not verified");
}
```

---

# 6. BUG-05 — Admin SDK ไม่อยู่ใต้ Firestore Rules

## ระดับ

**High**

นี่เป็นจุดที่ต้องเข้าใจให้ดี

ถ้าใช้:

```ts
firebase-admin
```

Server สามารถอ่าน/เขียน Firestore ได้โดยไม่ถูกบังคับด้วย Client Firestore Security Rules แบบเดียวกัน

ดังนั้น:

```text
Firestore Rules
```

ไม่สามารถชดเชย:

```text
Server Action ไม่มี Authorization
```

ได้

---

# Architecture ที่ควรเป็น

```text
                 ┌──────────────┐
                 │   Browser    │
                 └──────┬───────┘
                        │
                        ▼
                Authentication
                        │
                        ▼
                 Server Action
                        │
                ┌───────┴────────┐
                │ Authorization  │
                │ Validation     │
                │ Ownership      │
                └───────┬────────┘
                        │
                        ▼
                  Admin SDK
                        │
                        ▼
                    Firestore
```

---

# หลักการ

ทุก Server Action ต้อง:

```text
Authentication
       ↓
Authorization
       ↓
Validation
       ↓
Business Logic
       ↓
Database
```

ห้าม:

```text
Authentication
       ↓
Database
```

---

# 7. BUG-06 — Race Condition ตอน Submit

## ระดับ

**High**

ปัญหาคือ:

```ts
if (!existingSubmission.exists) {
    // ...
}

await submissionRef.set(...)
```

ระหว่าง `get()` กับ `set()` มีช่องว่าง

---

# ตัวอย่าง

```text
Request A ── get() ── ไม่มี
Request B ── get() ── ไม่มี
Request A ── set()
Request B ── set()
```

ทั้งคู่ผ่าน

---

# วิธีแก้ที่แนะนำ

ใช้:

```ts
transaction
```

ตัวอย่าง:

```ts
await adminDb.runTransaction(async (tx) => {
  const submissionSnap = await tx.get(submissionRef);

  if (submissionSnap.exists) {
    throw new Error("ALREADY_SUBMITTED");
  }

  tx.create(submissionRef, {
    studentId: user.uid,
    assignmentId,
    answers,
    score,
    submittedAt: FieldValue.serverTimestamp(),
  });
});
```

`tx.create()` มี semantics สำคัญ:

> ถ้า document มีอยู่แล้ว → operation ล้มเหลว

---

# สำคัญมาก

อย่าใช้:

```ts
set()
```

โดยไม่ตรวจ เพราะ:

```ts
set()
```

สามารถเขียนทับข้อมูลเดิมได้

สำหรับการสร้าง Submission ใหม่:

```ts
create()
```

เหมาะกว่า

---

# 8. BUG-07 — Assignment + Answer Key ไม่ Atomic

## ระดับ

**High**

ปัจจุบัน:

```text
Create Assignment
       ↓
Create Answer Key
```

ถ้าอันที่สอง fail:

```text
Assignment = มี
Answer Key = ไม่มี
```

---

# วิธีแก้

ใช้ Batch:

```ts
const batch = adminDb.batch();

batch.set(
  assignmentRef,
  assignmentData
);

batch.set(
  answerKeyRef,
  answerKeyData
);

await batch.commit();
```

ผล:

```text
ทั้งคู่สำเร็จ
      หรือ
ทั้งคู่ไม่สำเร็จ
```

---

# ห้าม fallback แบบนี้

```ts
const answerKey = answerKeySnap.exists
  ? answerKeySnap.data()
  : { answers: [] };
```

เพราะ:

```text
Answer Key หาย
      ↓
คิดว่าทุกคำตอบผิด
      ↓
Student ได้ 0
```

ควร:

```ts
if (!answerKeySnap.exists) {
  throw new Error("ANSWER_KEY_MISSING");
}
```

---

# 9. BUG-08 — Server Validation ไม่ครบ

## ระดับ

**High**

Client validation:

```tsx
<input required />
```

ไม่ใช่ Security

เพราะผู้ใช้สามารถสร้าง Request เองได้

---

# แนะนำใช้ Zod

ติดตั้ง:

```bash
npm install zod
```

สร้าง:

```text
lib/validation/assignment.ts
```

ตัวอย่าง:

```ts
import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().min(1),
  prompt: z.string().trim().min(1),
  type: z.enum([
    "multiple_choice",
    "true_false",
  ]),
  options: z.array(
    z.string().trim().min(1)
  ).min(2),
  points: z.number()
    .finite()
    .positive(),
  correctAnswer: z.string().min(1),
});

export const assignmentSchema = z.object({
  title: z.string().trim().min(1).max(200),

  classId: z.string().min(1),

  dueAt: z.string().datetime(),

  questions: z.array(
    questionSchema
  ).min(1),
});
```

---

# Server Action

```ts
const parsed = assignmentSchema.safeParse(data);

if (!parsed.success) {
  return {
    success: false,
    error: "ข้อมูลแบบฝึกหัดไม่ถูกต้อง",
  };
}

const data = parsed.data;
```

ข้อดี:

```text
Client
 ↓
Server
 ↓
Zod
 ↓
ข้อมูลที่มี Type ถูกต้อง
```

---

# 10. BUG-09 — Timezone ของ Deadline

## ระดับ

**High**

ประเทศไทย:

```text
UTC+7
```

`datetime-local`:

```text
2026-10-15T23:59
```

ไม่มี timezone

ดังนั้นต้องกำหนดให้ชัดว่า:

```text
23:59 Asia/Bangkok
```

ไม่ใช่:

```text
23:59 UTC
```

---

# วิธีที่แนะนำ

ใช้ library ที่รองรับ timezone เช่น:

```bash
npm install luxon
```

จากนั้น:

```ts
import { DateTime } from "luxon";

const dueAt = DateTime
  .fromISO(formData.dueAt, {
    zone: "Asia/Bangkok",
  })
  .toUTC()
  .toJSDate();
```

---

# Database

เก็บเป็น:

```text
Firestore Timestamp
```

โดยเก็บ Instant เดียวกันทั่วระบบ

เช่น:

```text
23:59 Thailand
=
16:59 UTC
```

UI ค่อยแปลงกลับ:

```text
16:59 UTC
↓
Asia/Bangkok
↓
23:59
```

---

# หลักการ

```text
Database
    ↓
UTC / Timestamp

Display
    ↓
Asia/Bangkok
```

อย่าเก็บ String แบบ:

```text
"2026-10-15 23:59"
```

โดยไม่ระบุ timezone

---

# 11. BUG-10 — Due Date Hardcode

ไม่ควร:

```ts
useState("2026-10-15T23:59");
```

เพราะวันหนึ่งมันจะหมดอายุ

---

# วิธีแก้

สร้าง Default แบบ Dynamic:

```ts
function getDefaultDueDate() {
  const date = new Date();

  date.setDate(date.getDate() + 7);

  return date;
}
```

หรือให้ครูเลือกเองและไม่กำหนด Default

---

# Server ต้องตรวจด้วย

```ts
if (dueAt <= new Date()) {
  return {
    success: false,
    error: "กำหนดส่งต้องอยู่ในอนาคต",
  };
}
```

---

# 12. BUG-11 — Submission Rate ผิด

อย่าใช้:

```ts
allStudents / submissions
```

เพราะ Assignment อาจเป็นของ Class เดียว

---

# ควรคำนวณ

```text
Class Members
       ↓
จำนวนสมาชิกจริง
       ↓
Submissions ของ Assignment
       ↓
Submitted unique students
```

ตัวอย่าง:

```ts
const members = await getClassMembers(
  assignment.classId
);

const submissions = await getSubmissions(
  assignment.id
);

const submittedStudents = new Set(
  submissions.map(s => s.studentId)
);

const rate =
  submittedStudents.size /
  members.length *
  100;
```

---

# 13. BUG-12 — Average Score

ต้องเลือกนิยามให้ชัด

## แบบที่ 1 — Average Submission

```text
คะแนนของทุก Submission
÷
จำนวน Submission
```

เหมาะกับ:

> คะแนนเฉลี่ยของการส่งทั้งหมด

---

## แบบที่ 2 — Average Student

```text
คะแนนของแต่ละ Student
÷
จำนวน Student
```

เหมาะกับ:

> ผลสัมฤทธิ์ของนักเรียน

---

## อย่าผสม

เช่น:

```text
Average ของ Assignment A
+
Average ของ Assignment B
+
Average ของ Assignment C
--------------------------------
3
```

ถ้าแต่ละ Assignment มีจำนวนคนส่งไม่เท่ากัน

จะให้น้ำหนักทุก Assignment เท่ากันโดยอัตโนมัติ

---

# 14. BUG-13 — Dashboard Hardcode

ตรวจและลบค่าประเภท:

```text
ม.4/1
2 ห้องเรียน
100%
2026-10-10
```

ถ้าไม่ได้มาจาก Database จริง

---

# หลักการ

Dashboard:

```text
Firestore
    ↓
Server
    ↓
DTO
    ↓
UI
```

ไม่ควร:

```text
UI
 ↓
Hardcoded fake data
```

---

# 15. BUG-14 — true_false รองรับไม่ครบ

ถ้ายังไม่ทำระบบ True/False ให้ครบ:

**ทางเลือก A**

เอาออกก่อน:

```ts
type QuestionType =
  "multiple_choice";
```

หรือ

**ทางเลือก B**

Implement ให้ครบ:

```text
Teacher Create
      ↓
Database
      ↓
Answer Key
      ↓
Student UI
      ↓
Submit
      ↓
Grader
      ↓
Score
```

ห้ามประกาศว่า Support แต่ทำงานได้แค่ครึ่งระบบ

---

# 16. BUG-15 — ตรวจ Class Ownership

ตอน Teacher สร้าง Assignment:

```text
Teacher
   ↓
classId
```

ต้องตรวจ:

```text
class exists?
      ↓
teacher เป็น owner?
      ↓
ใช่
      ↓
Create Assignment
```

ตัวอย่าง:

```ts
const classSnap = await adminDb
  .collection("classes")
  .doc(classId)
  .get();

if (!classSnap.exists) {
  throw new Error("CLASS_NOT_FOUND");
}

const classData = classSnap.data();

if (
  classData?.teacherId !== user.uid &&
  user.role !== "admin"
) {
  throw new Error("FORBIDDEN");
}
```

---

# 17. BUG-16 — Firebase Dummy Config

ไม่ควร:

```ts
process.env.FIREBASE_PROJECT_ID ||
"practice-hub"
```

ใน Production

---

# ทำเป็น Required Config

```ts
function requiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new Error(
      `Missing environment variable: ${name}`
    );
  }

  return value;
}
```

แล้ว:

```ts
const projectId =
  requiredEnv("FIREBASE_PROJECT_ID");
```

---

# Production

ถ้า Config หาย:

```text
Application startup
       ↓
Config invalid
       ↓
FAIL
```

ดีกว่า:

```text
Config invalid
       ↓
Firebase ใช้ Dummy
       ↓
Login พังแบบงง ๆ
```

---

# 18. BUG-17 — Error Leakage

ไม่ควร:

```ts
return {
  error: error.message
};
```

ตรง ๆ ทุกกรณี

เพราะ Error อาจเป็น:

```text
Firebase internal error
Database details
Stack-related information
Infrastructure details
```

---

# ทำ Error Mapping

```ts
try {
  // ...
} catch (error) {
  console.error(error);

  return {
    success: false,
    error: "เกิดข้อผิดพลาด กรุณาลองใหม่",
  };
}
```

ส่วน Error ที่คาดการณ์ได้:

```ts
if (error instanceof AlreadySubmittedError) {
  return {
    success: false,
    error: "คุณส่งงานนี้ไปแล้ว",
  };
}
```

---

# 19. BUG-18 — Admin ถูกมองเป็น Student

สร้าง helper:

```ts
export function isTeacher(user: User) {
  return user.role === "teacher";
}

export function isAdmin(user: User) {
  return user.role === "admin";
}

export function canAccessTeacherArea(user: User) {
  return (
    user.role === "teacher" ||
    user.role === "admin"
  );
}
```

แล้วทุกหน้าควรใช้ helper เหล่านี้

แทน:

```ts
if (user.role !== "teacher") {
   ...
}
```

กระจายไปทั่ว Project

---

# 20. BUG-19 — Client Submit Protection

Client:

```tsx
<button disabled={submitting}>
  ส่งคำตอบ
</button>
```

ควรมีต่อไป

เพราะช่วย UX

แต่ต้องมี Server protection:

```text
Client disabled
       +
Server transaction
       +
Unique submission ID
```

จึงจะปลอดภัย

---

# 21. Testing Checklist

หลังแก้เสร็จต้องทดสอบอย่างน้อย 3 Roles:

```text
Admin
Teacher
Student
```

---

## Authentication

* [ ] Login สำเร็จ
* [ ] Logout สำเร็จ
* [ ] Session หมดอายุ
* [ ] Email ไม่ใช่ Domain โรงเรียน
* [ ] Email ไม่ verified
* [ ] Token invalid
* [ ] Missing Firebase config

---

## Authorization

### Student

* [ ] เข้า `/dashboard`
* [ ] เข้า `/teacher` ไม่ได้
* [ ] เปิด Assignment ห้องอื่นไม่ได้
* [ ] ส่ง Assignment ห้องอื่นไม่ได้
* [ ] สร้าง Assignment ไม่ได้
* [ ] อ่าน Answer Key ไม่ได้

### Teacher

* [ ] เข้า Teacher Dashboard
* [ ] เห็นเฉพาะงานตัวเอง
* [ ] เห็นเฉพาะห้องตัวเอง
* [ ] สร้าง Assignment ได้
* [ ] สร้าง Assignment ในห้องที่ไม่มีสิทธิ์ไม่ได้

### Admin

* [ ] เข้า Teacher/Admin area ได้ตาม policy
* [ ] ดูข้อมูลที่ได้รับอนุญาต
* [ ] ไม่ถูกแสดงเป็น Student

---

# Submission

* [ ] ส่งครั้งแรกสำเร็จ
* [ ] ส่งครั้งที่สองถูกปฏิเสธ
* [ ] กด Submit รัว ๆ
* [ ] ส่ง Request พร้อมกัน 2 ครั้ง
* [ ] ส่งหลัง Deadline
* [ ] ส่งก่อน Deadline
* [ ] Assignment ไม่มี Answer Key
* [ ] Assignment ถูกลบ
* [ ] Student ไม่อยู่ใน Class

---

# Assignment Creation

* [ ] Title ว่าง
* [ ] Title ยาวเกิน
* [ ] ไม่มีคำถาม
* [ ] Question ID ซ้ำ
* [ ] คะแนนติดลบ
* [ ] คะแนนเป็น NaN
* [ ] Options ว่าง
* [ ] correctAnswer ไม่อยู่ใน options
* [ ] Class ไม่มีอยู่จริง
* [ ] Teacher ไม่ใช่ Owner
* [ ] Admin สร้างได้ตาม policy

---

# Timezone

ทดสอบ:

```text
23:59 Thailand
```

ต้องตรงกับ:

```text
16:59 UTC
```

ตรวจทั้ง:

* [ ] Create
* [ ] Display
* [ ] Deadline check
* [ ] Submission
* [ ] Dashboard

---

# 22. ลำดับการแก้

ไม่ควรแก้ตามเลข BUG แบบสุ่ม

แนะนำ:

```text
PHASE 1 — Security
│
├── BUG-01 Authorization
├── BUG-02 Data Isolation
├── BUG-03 Assignment Access
├── BUG-04 Authentication
└── BUG-05 Admin SDK boundary

PHASE 2 — Data Integrity
│
├── BUG-06 Submission Race Condition
├── BUG-07 Atomic Assignment Creation
└── BUG-08 Server Validation

PHASE 3 — Correctness
│
├── BUG-09 Timezone
├── BUG-10 Due Date
├── BUG-11 Submission Rate
└── BUG-12 Average Score

PHASE 4 — Product
│
├── BUG-13 Dashboard
├── BUG-14 Question Types
├── BUG-15 Class Ownership
├── BUG-16 Firebase Config
├── BUG-17 Error Handling
├── BUG-18 Role Handling
└── BUG-19 Client UX
```

---

# Recommended Architecture หลังแก้

ระบบสุดท้ายควรมี Flow แบบนี้:

```text
                    ┌───────────────┐
                    │    Browser    │
                    └───────┬───────┘
                            │
                            ▼
                    Firebase Auth
                            │
                            ▼
                  ┌──────────────────┐
                  │   Next.js Server │
                  └────────┬─────────┘
                           │
                    Authentication
                           │
                    Authorization
                           │
                    Server Validation
                           │
                    Business Rules
                           │
                           ▼
                  ┌──────────────────┐
                  │ Firebase Admin   │
                  │      SDK         │
                  └────────┬─────────┘
                           │
                           ▼
                      Firestore
```

สำหรับ Submit:

```text
Student
   │
   ▼
Validate Session
   │
   ▼
Check Student Role
   │
   ▼
Load Assignment
   │
   ▼
Check Class Membership
   │
   ▼
Check Deadline
   │
   ▼
Load Answer Key
   │
   ▼
Validate Answers
   │
   ▼
Calculate Score
   │
   ▼
Firestore Transaction
   │
   ├── Submission doesn't exist?
   │       │
   │       ├── NO → Reject
   │       │
   │       └── YES
   │
   ▼
Create Submission
```

---

# Definition of Done

ระบบถือว่า "แก้ครบ" เมื่อ:

```text
[Security]

Student → Teacher Dashboard       ❌
Student → Other Class Assignment ❌
Teacher → Other Teacher Data     ❌
Student → Answer Key             ❌

[Integrity]

Duplicate Submission             ❌
Race Condition                   ❌
Assignment without Answer Key    ❌

[Validation]

Invalid Question                 ❌
Invalid Score                    ❌
Invalid Class                    ❌
Unauthorized Teacher             ❌

[Time]

Timezone ถูกต้อง                 ✅
Deadline ถูกต้อง                 ✅

[Analytics]

Submission Rate ถูกต้อง          ✅
Average Score มีนิยามชัดเจน      ✅

[Roles]

Admin                             ✅
Teacher                           ✅
Student                           ✅
```

---

# สิ่งที่ควรทำต่อจาก Guide นี้

หลังจากแก้ตาม Guide แล้ว **อย่าเพิ่งถือว่าระบบปลอดภัยเพียงเพราะ Build ผ่าน**

ต้องทำอีก 3 ขั้น:

```text
1. npm run lint
        ↓
2. npm run build
        ↓
3. Security / Integration Test
        ↓
4. Firebase Emulator
        ↓
5. ทดสอบ Student / Teacher / Admin
        ↓
6. ทดสอบ Request ที่ไม่ได้มาจาก UI
```

โดยเฉพาะข้อ 3–6 สำคัญ เพราะ Bug ประเภท Authorization และ Race Condition บางส่วนอาจไม่ปรากฏจากการกดใช้งานหน้าเว็บตามปกติ

**เป้าหมายสุดท้ายไม่ใช่แค่ "เว็บใช้งานได้" แต่คือ "แม้ผู้ใช้พยายามส่งข้อมูลที่ UI ไม่อนุญาต Server ก็ยังปฏิเสธได้"**
