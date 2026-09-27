// ===================================================================
// Server Actions — แก้ไข BUG ทั้งหมดที่เกี่ยวข้อง:
//
// BUG-01: ตรวจ role ก่อน query (requireUser/requireTeacher)
// BUG-02: Data Isolation — query เฉพาะข้อมูลที่ user มีสิทธิ์
// BUG-03: ส่งงานของห้องอื่นได้ → ตรวจ class membership
// BUG-05: Admin SDK bypass → ตรวจ auth+authz ใน server action
// BUG-06: Race Condition → ใช้ transaction + tx.create()
// BUG-07: Assignment + Answer Key ไม่ atomic → ใช้ batch
// BUG-08: Server Validation → ใช้ Zod
// BUG-09: Timezone → ใช้ Luxon แปลง Asia/Bangkok → UTC
// BUG-10: Due Date Hardcode → server ตรวจ dueAt ต้องอยู่ในอนาคต
// BUG-15: Class Ownership → teacher ต้องเป็น owner ของ class
// BUG-17: Error Leakage → ไม่ส่ง internal error ให้ client
// BUG-19: Client Submit Protection → server ใช้ transaction
// ===================================================================

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser, adminDb, FieldValue } from "@/lib/firebase-admin";
import { canAccessTeacherArea, isUserMemberOfClass } from "@/lib/auth";
import { createAssignmentSchema, submitAnswersSchema } from "@/lib/validation/assignment";
import {
  createInquirySchema,
  replyInquirySchema,
  closeInquirySchema,
  CreateInquiryInput,
  ReplyInquiryInput,
} from "@/lib/validation/inquiry";
import { DateTime } from "luxon";

export interface SubmitResult {
  success: boolean;
  error?: string;
  score?: number;
  maxScore?: number;
  submissionId?: string;
  solutions?: Record<string, string | number>;
  isPractice?: boolean;
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
  // BUG-01: ตรวจ authentication
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนส่งงาน" };
  }

  // BUG-01: ตรวจ role — เฉพาะ student เท่านั้นที่ส่งงานได้
  if (user.role !== "student") {
    return { success: false, error: "เฉพาะนักเรียนเท่านั้นที่ส่งงานได้" };
  }

  // BUG-08: Validate input ด้วย Zod
  if (!assignmentId || typeof assignmentId !== "string" || assignmentId.length === 0) {
    return { success: false, error: "รหัสแบบฝึกหัดไม่ถูกต้อง" };
  }

  const parsedAnswers = submitAnswersSchema.safeParse(studentAnswers);
  if (!parsedAnswers.success) {
    return { success: false, error: "ข้อมูลคำตอบไม่ถูกต้อง" };
  }

  const submissionId = `${assignmentId}_${user.uid}`;

  try {
    // 1. ดึงข้อมูล Assignment
    const assignmentDoc = await adminDb.collection("assignments").doc(assignmentId).get();

    if (!assignmentDoc.exists) {
      return { success: false, error: "ไม่พบแบบฝึกหัดนี้" };
    }

    const assignmentData = assignmentDoc.data()!;

    // BUG-03: ตรวจ Class Membership — student ต้องอยู่ในห้องเรียนของ assignment
    if (assignmentData.classId) {
      const isMember = await isUserMemberOfClass(user, assignmentData.classId);
      if (!isMember) {
        return { success: false, error: "คุณไม่มีสิทธิ์ทำแบบฝึกหัดนี้ (ไม่ได้อยู่ในห้องเรียนนี้)" };
      }
    }

    // BUG-09: ตรวจ Deadline ด้วย timezone ที่ถูกต้อง
    if (assignmentData.dueAt) {
      const dueDate = assignmentData.dueAt.toDate
        ? assignmentData.dueAt.toDate()
        : new Date(assignmentData.dueAt);
      if (Date.now() > dueDate.getTime()) {
        return { success: false, error: "เกินกำหนดเวลาส่งงานแล้ว" };
      }
    }

    // 2. ดึงเฉลยจาก /answerKeys/{assignmentId}
    const keyDoc = await adminDb.collection("answerKeys").doc(assignmentId).get();

    // BUG-07: ถ้า answer key ไม่มี → ห้ามตรวจ (ไม่ใช่ให้ทุกคนได้ 0)
    if (!keyDoc.exists) {
      console.error(`ANSWER_KEY_MISSING for assignment: ${assignmentId}`);
      return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
    }

    const keyData = keyDoc.data()!;
    const correctMap: Record<string, string | number> = {};
    for (const item of keyData.answers || []) {
      correctMap[item.questionId] = item.correctAnswer;
    }

    // 3. ตรวจเทียบคำตอบและคำนวณคะแนน
    const questions = (assignmentData.questions || []) as QuestionItem[];
    let calculatedScore = 0;
    let totalMaxScore = assignmentData.maxScore || 0;

    const formattedAnswers = questions.map((q: QuestionItem) => {
      const selected = parsedAnswers.data[q.id];
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

    const isPractice = assignmentData.type === "practice" || !!assignmentData.allowRetake;

    // BUG-06 + BUG-19: ใช้ transaction ป้องกัน race condition
    const submissionRef = adminDb.collection("submissions").doc(submissionId);

    await adminDb.runTransaction(async (tx) => {
      const submissionSnap = await tx.get(submissionRef);

      // ถ้าเป็น quiz หรือ exam ไม่อนุญาตให้ส่งซ้ำ
      if (submissionSnap.exists && !isPractice) {
        throw new Error("ALREADY_SUBMITTED");
      }

      const submissionPayload = {
        assignmentId,
        studentId: user.uid,
        classId: assignmentData.classId || "unknown",
        answers: formattedAnswers,
        score: calculatedScore,
        maxScore: totalMaxScore,
        status: "graded",
        submittedAt: FieldValue.serverTimestamp(),
        gradedAt: FieldValue.serverTimestamp(),
      };

      if (submissionSnap.exists) {
        tx.set(submissionRef, submissionPayload, { merge: true });
      } else {
        tx.create(submissionRef, submissionPayload);
      }
    });

    return {
      success: true,
      score: calculatedScore,
      maxScore: totalMaxScore,
      submissionId,
      isPractice,
      solutions: isPractice ? correctMap : undefined,
    };
  } catch (err: unknown) {
    // BUG-17: Error Leakage → log จริง แต่ส่ง safe message
    console.error("Grading failed:", err);

    // Expected errors — safe to show
    if (err instanceof Error && err.message === "ALREADY_SUBMITTED") {
      return { success: false, error: "คุณส่งคำตอบของแบบฝึกหัดนี้ไปแล้ว ไม่สามารถส่งซ้ำได้" };
    }

    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
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
  // BUG-01 + BUG-18: ตรวจ authentication + role
  const user = await getSessionUser();
  if (!user || !canAccessTeacherArea(user)) {
    return { success: false, error: "คุณไม่มีสิทธิ์สร้างแบบฝึกหัด (เฉพาะคุณครูเท่านั้น)" };
  }

  // BUG-08: Validate ข้อมูลด้วย Zod
  const parsed = createAssignmentSchema.safeParse(formData);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "ข้อมูลแบบฝึกหัดไม่ถูกต้อง";
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;

  try {
    // BUG-15: ตรวจ Class Ownership — teacher ต้องเป็น owner ของ class
    const classSnap = await adminDb.collection("classes").doc(data.classId).get();
    if (!classSnap.exists) {
      return { success: false, error: "ไม่พบห้องเรียนนี้ในระบบ" };
    }

    const classData = classSnap.data();
    if (classData?.teacherId !== user.uid && user.role !== "admin") {
      return { success: false, error: "คุณไม่ใช่ครูผู้สอนของห้องเรียนนี้" };
    }

    // BUG-09: Timezone — แปลง datetime-local (Asia/Bangkok) → UTC Timestamp
    const dueAt = DateTime.fromISO(data.dueAt, { zone: "Asia/Bangkok" })
      .toUTC()
      .toJSDate();

    // BUG-10: Due Date ต้องอยู่ในอนาคต
    if (dueAt <= new Date()) {
      return { success: false, error: "กำหนดส่งต้องอยู่ในอนาคต" };
    }

    const assignmentRef = adminDb.collection("assignments").doc();
    const assignmentId = assignmentRef.id;

    // คำนวณคะแนนเต็ม
    const maxScore = data.questions.reduce((acc, q) => acc + (q.points || 1), 0);

    // แยก questions (ไม่มีเฉลย)
    const sanitizedQuestions = data.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      options: q.options,
      points: q.points,
    }));

    // แยก answerKeys (มีเฉพาะ questionId และ correctAnswer)
    const answerKeysList = data.questions.map((q) => ({
      questionId: q.id,
      correctAnswer: q.correctAnswer,
    }));

    // BUG-07: Atomic — ใช้ batch เพื่อให้ assignment + answerKey สำเร็จหรือล้มเหลวพร้อมกัน
    const batch = adminDb.batch();

    batch.set(assignmentRef, {
      classId: data.classId,
      teacherId: user.uid,
      title: data.title,
      description: data.description,
      type: data.type || "practice",
      timeLimitMinutes: data.timeLimitMinutes || 0,
      allowRetake: data.allowRetake || false,
      maxScore,
      dueAt,
      createdAt: FieldValue.serverTimestamp(),
      questions: sanitizedQuestions,
    });

    const answerKeyRef = adminDb.collection("answerKeys").doc(assignmentId);
    batch.set(answerKeyRef, {
      answers: answerKeysList,
      createdAt: FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return { success: true, assignmentId };
  } catch (err: unknown) {
    // BUG-17: Error Leakage → log จริง แต่ส่ง safe message
    console.error("Create assignment failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาด กรุณาลองใหม่" };
  }
}

/**
 * Server Action: นักเรียนส่งข้อความติดต่อครู (Ask / Contact Teacher)
 */
export async function createInquiryAction(formData: CreateInquiryInput) {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนส่งคำถาม" };
  }

  const parsed = createInquirySchema.safeParse(formData);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "ข้อมูลคำถามไม่ถูกต้อง";
    return { success: false, error: errorMsg };
  }

  const data = parsed.data;

  try {
    const inquiryRef = adminDb.collection("inquiries").doc();
    await inquiryRef.set({
      studentId: user.uid,
      studentName: user.name || "นักเรียน",
      studentEmail: user.email || "",
      classId: data.classId,
      category: data.category,
      title: data.title,
      content: data.content,
      context: data.context || null,
      status: "OPEN",
      reply: null,
      answeredAt: null,
      answeredBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true, inquiryId: inquiryRef.id };
  } catch (err) {
    console.error("Create inquiry failed:", err);
    return { success: false, error: "ไม่สามารถส่งคำถามได้ กรุณาลองใหม่อีกครั้ง" };
  }
}

/**
 * Server Action: คุณครูตอบข้อความนักเรียน และปรับสถานะ (OPEN → ANSWERED / CLOSED)
 */
export async function replyInquiryAction(formData: ReplyInquiryInput) {
  const user = await getSessionUser();
  if (!user || !canAccessTeacherArea(user)) {
    return { success: false, error: "เฉพาะคุณครูเท่านั้นที่สามารถตอบคำถามได้" };
  }

  const parsed = replyInquirySchema.safeParse(formData);
  if (!parsed.success) {
    const errorMsg = parsed.error.issues[0]?.message || "ข้อมูลการตอบไม่ถูกต้อง";
    return { success: false, error: errorMsg };
  }

  const { inquiryId, reply, newStatus } = parsed.data;

  try {
    const docRef = adminDb.collection("inquiries").doc(inquiryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return { success: false, error: "ไม่พบรายการคำถามนี้" };
    }

    await docRef.update({
      reply,
      status: newStatus,
      answeredBy: user.name || "คุณครู",
      answeredAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error("Reply inquiry failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการตอบกลับ" };
  }
}

/**
 * Server Action: ปิดคำถามเมื่อเข้าใจแล้ว (Close Inquiry)
 */
export async function closeInquiryAction(inquiryId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อน" };
  }

  const parsed = closeInquirySchema.safeParse({ inquiryId });
  if (!parsed.success) {
    return { success: false, error: "Inquiry ID ไม่ถูกต้อง" };
  }

  try {
    const docRef = adminDb.collection("inquiries").doc(inquiryId);
    const snap = await docRef.get();
    if (!snap.exists) {
      return { success: false, error: "ไม่พบรายการคำถามนี้" };
    }

    const data = snap.data()!;
    // ตรวจว่าผู้ใช้เป็นเจ้าของคำถาม หรือเป็นครู
    const isOwner = data.studentId === user.uid;
    const isTeacher = canAccessTeacherArea(user);
    if (!isOwner && !isTeacher) {
      return { success: false, error: "คุณไม่มีสิทธิ์ปิดคำถามนี้" };
    }

    await docRef.update({
      status: "CLOSED",
      closedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { success: true };
  } catch (err) {
    console.error("Close inquiry failed:", err);
    return { success: false, error: "เกิดข้อผิดพลาดในการปิดคำถาม" };
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
