import { getSessionUser, adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { redirect, notFound } from "next/navigation";
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

  // ดึงข้อมูลโจทย์จาก Firestore จริงเท่านั้น — ไม่มี mock fallback อีกต่อไป
  // (เดิมมี MOCK_QUESTIONS + fallback ตัวอย่างทั่วไปที่ยัดคำถามปลอมให้เสมอ
  //  เมื่อหา id ไม่เจอ ทำให้ submit จริงพังเพราะ id ปลอมไม่มีใน Firestore)
  let assignment: AssignmentData | null = null;

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

  // หา id นี้ไม่เจอจริง (ไม่ว่าเพราะ id ผิด, ถูกลบไปแล้ว, หรือ Firebase ยังไม่ configure)
  // ให้ขึ้นหน้า not-found ตรงไปตรงมา แทนที่จะยัดข้อสอบปลอมให้เหมือนของจริง
  if (!assignment) {
    notFound();
  }

  // เช็คว่านักเรียนคนนี้เคยส่งคำตอบของ assignment นี้ไปแล้วหรือยัง
  // (submissionId ใช้รูปแบบ `${assignmentId}_${studentId}` ตามที่ submitAssignmentAction ตั้งไว้)
  // ถ้าเคยส่งแล้ว ต้องโชว์หน้าผลคะแนน ไม่ใช่ให้กลับไปทำข้อสอบใหม่ทุกครั้งที่กด "ดูผลคะแนน"
  let existingSubmission: { score: number; maxScore: number; submissionId: string } | null = null;
  try {
    if (isFirebaseAdminConfigured) {
      const submissionId = `${assignmentId}_${user.uid}`;
      const subDoc = await adminDb.collection("submissions").doc(submissionId).get();
      if (subDoc.exists) {
        const subData = subDoc.data()!;
        existingSubmission = {
          score: subData.score ?? 0,
          maxScore: subData.maxScore ?? assignment.maxScore,
          submissionId,
        };
      }
    }
  } catch (err) {
    console.error("Fetch existing submission error:", err);
  }

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <QuizRunnerClient
        assignment={assignment}
        studentName={user.name || "นักเรียน"}
        existingSubmission={existingSubmission}
      />
    </div>
  );
}

