import { getSessionUser, adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";
import QuizRunnerClient from "./QuizRunnerClient";

interface AssignmentData {
  id: string;
  title: string;
  description: string;
  classId: string;
  maxScore: number;
  questions: Array<{
    id: string;
    type: string;
    prompt: string;
    options: string[];
    points: number;
  }>;
}

// Mock Question Pool สำหรับโหมดเริ่มต้น
const MOCK_QUESTIONS: Record<string, AssignmentData> = {
  "math-01": {
    id: "math-01",
    title: "แบบทดสอบเรื่องเซตและความน่าจะเป็น (ชุดที่ 1)",
    description: "วิชาคณิตศาสตร์ ม.4 — กรุณาเลือกคำตอบที่ถูกต้องที่สุดเพียงข้อเดียว",
    classId: "ห้อง ม.4/1",
    maxScore: 30,
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "ข้อใดเป็นเซตว่าง (Empty Set)?",
        options: [
          "A) เซตของจำนวนเต็มบวกที่น้อยกว่า 0",
          "B) เซตของจำนวนเต็มคู่",
          "C) { 0 }",
          "D) { x | x เป็นจำนวนเต็มที่ 0 < x < 2 }",
        ],
        points: 10,
      },
      {
        id: "q2",
        type: "multiple_choice",
        prompt: "ถ้า A = {1, 2, 3} และ B = {3, 4, 5} แล้ว A ∩ B (A อินเตอร์เซก B) คือเซตใด?",
        options: [
          "A) {1, 2, 4, 5}",
          "B) {3}",
          "C) {1, 2, 3, 4, 5}",
          "D) {}",
        ],
        points: 10,
      },
      {
        id: "q3",
        type: "true_false",
        prompt: "เซตอนันต์คือเซตที่ไม่สามารถระบุจำนวนสมาชิกได้อย่างจำกัด ใช่หรือไม่?",
        options: ["True (ใช่)", "False (ไม่ใช่)"],
        points: 10,
      },
    ],
  },
  "sci-02": {
    id: "sci-02",
    title: "แบบฝึกหัดเคมี: ตารางธาตุและพันธะเคมี",
    description: "วิทยาศาสตร์พื้นฐาน — สมบัติของธาตุตามตารางธาตุ",
    classId: "ห้อง ม.4/1",
    maxScore: 30,
    questions: [
      {
        id: "q1",
        type: "multiple_choice",
        prompt: "ธาตุในหมู่ 1A ในตารางธาตุมีชื่อเรียกว่าอย่างไร?",
        options: [
          "A) โลหะแอลคาไล (Alkali metals)",
          "B) โลหะแอลคาไลน์เอิร์ท (Alkaline earth metals)",
          "C) แฮโลเจน (Halogens)",
          "D) แก๊สมีตระกูล (Noble gases)",
        ],
        points: 10,
      },
      {
        id: "q2",
        type: "multiple_choice",
        prompt: "พันธะเคมีที่เกิดจากการใช้อิเล็กตรอนร่วมกันเรียกว่าพันธะอะไร?",
        options: [
          "A) พันธะไอออนิก",
          "B) พันธะโคเวเลนต์",
          "C) พันธะโลหะ",
          "D) พันธะไฮโดรเจน",
        ],
        points: 10,
      },
      {
        id: "q3",
        type: "true_false",
        prompt: "ฮีเลียม (He) เป็นธาตุในหมู่แก๊สเฉื่อยที่มีเวเลนซ์อิเล็กตรอนเท่ากับ 2",
        options: ["True (ใช่)", "False (ไม่ใช่)"],
        points: 10,
      },
    ],
  },
};

export default async function AssignmentDetailPage({
  params,
}: {
  params: Promise<{ assignmentId: string }>;
}) {
  const { assignmentId } = await params;
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // ดึงข้อมูลโจทย์จาก Firestore หรือ fallback จาก Mock Data
  let assignment = MOCK_QUESTIONS[assignmentId];

  try {
    if (isFirebaseAdminConfigured) {
      const doc = await adminDb.collection("assignments").doc(assignmentId).get();
      if (doc.exists) {
        const data = doc.data()!;
        assignment = {
          id: doc.id,
          title: data.title || "แบบฝึกหัด",
          description: data.description || "",
          classId: data.classId || "ห้องเรียน",
          maxScore: data.maxScore || 30,
          questions: data.questions || [],
        };
      }
    }
  } catch (err) {
    console.error("Fetch assignment error:", err);
  }

  // Fallback ตัวอย่างถ้าหา ID ไม่เจอใน Mock หรือ DB
  if (!assignment) {
    assignment = {
      id: assignmentId,
      title: `แบบฝึกหัดรหัส ${assignmentId}`,
      description: "แบบทดสอบทั่วไปสำหรับทบทวนความรู้",
      classId: "ห้อง ม.4/1",
      maxScore: 30,
      questions: [
        {
          id: "demo-q1",
          type: "multiple_choice",
          prompt: "ข้อใดถูกต้องเกี่ยวกับระบบ Zero-Trust ในการส่งงาน?",
          options: [
            "A) Client ตรวจคะแนนและเขียนลง DB เองได้",
            "B) Server ตรวจคะแนนผ่าน Admin SDK และ Client ห้ามเขียนคำตอบลง DB โดยตรง",
            "C) ใครก็สามารถสร้าง Assignment ในห้องอื่นได้",
            "D) Role ถูกส่งผ่านจาก localStorage",
          ],
          points: 15,
        },
        {
          id: "demo-q2",
          type: "true_false",
          prompt: "Session Cookie ใน Next.js App Router ปลอดภัยกว่าการเก็บ Token ใน localStorage",
          options: ["True (ถูกต้อง)", "False (ไม่ถูกต้อง)"],
          points: 15,
        },
      ],
    };
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <QuizRunnerClient assignment={assignment} studentName={user.name || "นักเรียน"} />
    </div>
  );
}
