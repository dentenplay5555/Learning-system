"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, adminDb, FieldValue } from "@/lib/firebase-admin";


export interface SubmitResult {
  success: boolean;
  error?: string;
  score?: number;
  maxScore?: number;
  submissionId?: string;
}

interface QuestionItem {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  points?: number;
}

/**
 * Server Action สำหรับการส่งคำตอบและตรวจข้อสอบ (Server-side Grading Only)
 * ป้องกันการโกงโดย Client ไม่สามารถอ่านเฉลยหรือกำหนดคะแนนเองได้
 */
export async function submitAssignmentAction(
  assignmentId: string,
  studentAnswers: Record<string, string | number>
): Promise<SubmitResult> {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนส่งงาน" };
  }

  const submissionId = `${assignmentId}_${user.uid}`;

  try {
    // 1. ดึงข้อมูลโจทย์เพื่อเช็คเวลาส่งงาน (Deadline Check)
    const assignmentDoc = await adminDb.collection("assignments").doc(assignmentId).get();
    

    if (!assignmentDoc.exists) {
      return { success: false, error: "ไม่พบแบบฝึกหัดนี้" };
    }

    const assignmentData = assignmentDoc.data()!;
    if (assignmentData.dueAt) {
      const dueDate = assignmentData.dueAt.toDate ? assignmentData.dueAt.toDate() : new Date(assignmentData.dueAt);
      if (Date.now() > dueDate.getTime()) {
        return { success: false, error: "เกินกำหนดเวลาส่งงานแล้ว" };
      }
    }

    // 2. ดึงเฉลยจาก /answerKeys/{assignmentId} (เข้าถึงได้เฉพาะ Server Admin SDK)
    const keyDoc = await adminDb.collection("answerKeys").doc(assignmentId).get();
    const keyData = keyDoc.data() || { answers: [] };
    const correctMap: Record<string, string | number> = {};
    for (const item of keyData.answers || []) {
      correctMap[item.questionId] = item.correctAnswer;
    }

    // 3. ตรวจเทียบคำตอบและคำนวณคะแนน
    const questions = (assignmentData.questions || []) as QuestionItem[];
    let calculatedScore = 0;
    let totalMaxScore = assignmentData.maxScore || 0;

    const formattedAnswers = questions.map((q: QuestionItem) => {
      const selected = studentAnswers[q.id];
      const correct = correctMap[q.id];
      const points = q.points || 1;
      const isCorrect = selected !== undefined && String(selected) === String(correct);
      if (isCorrect) {
        calculatedScore += points;
      }
      return {
        questionId: q.id,
        selectedAnswer: selected ?? null,
      };
    });

    if (totalMaxScore === 0) {
      totalMaxScore = questions.reduce((acc: number, cur: QuestionItem) => acc + (cur.points || 1), 0);
    }

    // 4. บันทึกผลลง /submissions/{assignmentId}_{studentId} (write: if false ใน client rule)
    await adminDb.collection("submissions").doc(submissionId).set({
      assignmentId,
      studentId: user.uid,
      classId: assignmentData.classId || "unknown",
      answers: formattedAnswers,
      score: calculatedScore,
      maxScore: totalMaxScore,
      status: "graded",
      submittedAt: FieldValue.serverTimestamp(),
      gradedAt: FieldValue.serverTimestamp(),
    });

    return {
      success: true,
      score: calculatedScore,
      maxScore: totalMaxScore,
      submissionId,
    };
  } catch (err: unknown) {
    console.error("Grading failed:", err);
    const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการตรวจข้อสอบ";
    return { success: false, error: msg };
  }
}

/**
 * Server Action สำหรับครูสร้างแบบฝึกหัดใหม่
 * แยก Questions (ให้ client อ่านได้) กับ AnswerKeys (ซ่อนบน Server เท่านั้น)
 */
export async function createAssignmentAction(formData: {
  title: string;
  description: string;
  classId: string;
  dueAt: string;
  questions: Array<{
    id: string;
    type: "multiple_choice" | "true_false";
    prompt: string;
    options: string[];
    points: number;
    correctAnswer: string | number;
  }>;
}) {
  const user = await getSessionUser();
  if (!user || (user.role !== "teacher" && user.role !== "admin")) {
    return { success: false, error: "คุณไม่มีสิทธิ์สร้างแบบฝึกหัด (เฉพาะคุณครูเท่านั้น)" };
  }

  try {
    const assignmentRef = adminDb.collection("assignments").doc();
    const assignmentId = assignmentRef.id;

    // คำนวณคะแนนเต็ม
    const maxScore = formData.questions.reduce((acc, q) => acc + (q.points || 1), 0);

    // แยก questions (ไม่มีเฉลย)
    const sanitizedQuestions = formData.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    }));

    // แยก answerKeys (มีเฉพาะ questionId และ correctAnswer)
    const answerKeysList = formData.questions.map((q) => ({
      questionId: q.id,
      correctAnswer: q.correctAnswer,
    }));

    // บันทึก /assignments/{assignmentId}
    await assignmentRef.set({
      classId: formData.classId,
      teacherId: user.uid,
      title: formData.title,
      description: formData.description,
      maxScore,
      dueAt: new Date(formData.dueAt),
      createdAt: FieldValue.serverTimestamp(),
      questions: sanitizedQuestions,
    });

    // บันทึก /answerKeys/{assignmentId} (Client ห้ามอ่านเด็ดขาด)
    await adminDb.collection("answerKeys").doc(assignmentId).set({
      answers: answerKeysList,
      createdAt: FieldValue.serverTimestamp(),
    });

    return { success: true, assignmentId };
  } catch (err: unknown) {
    console.error("Create assignment failed:", err);
    const msg = err instanceof Error ? err.message : "ไม่สามารถสร้างแบบฝึกหัดได้";
    return { success: false, error: msg };
  }
}

/**
 * Server Action สำหรับออกจากระบบ
 */
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  redirect("/login");
}
