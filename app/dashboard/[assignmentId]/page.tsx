import { adminDb } from "@/lib/firebase-admin";
import { requireUser, canAccessTeacherArea } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
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

  // BUG-01: ตรวจสอบการ Login
  const user = await requireUser();

  let assignment: AssignmentData | null = null;

  try {
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
  } catch (err) {
    console.error("Fetch assignment error:", err);
  }

  // หากไม่พบแบบฝึกหัด
  if (!assignment) {
    notFound();
  }

  // BUG-03: ตรวจสอบ Class Membership ฝั่งนักเรียน — ป้องกันการแอบเปิดดูข้อสอบห้องอื่นผ่าน URL
  if (!canAccessTeacherArea(user)) {
    let isMember = false;

    // ตรวจ 1: studentIds array ใน classes/{classId}
    const classSnap = await adminDb.collection("classes").doc(assignment.classId).get();
    if (classSnap.exists) {
      const classData = classSnap.data();
      if (Array.isArray(classData?.studentIds) && classData.studentIds.includes(user.uid)) {
        isMember = true;
      }
    }

    // ตรวจ 2: subcollection /classes/{classId}/members/{uid}
    if (!isMember) {
      const memberSnap = await adminDb
        .collection("classes")
        .doc(assignment.classId)
        .collection("members")
        .doc(user.uid)
        .get();
      if (memberSnap.exists) {
        isMember = true;
      }
    }

    // ตรวจ 3: user.classIds ใน Firestore /users/{uid}
    if (!isMember) {
      const userClassIds = user.classIds || [];
      if (userClassIds.includes(assignment.classId)) {
        isMember = true;
      }
    }

    // หากนักเรียนไม่ได้อยู่ในห้องเรียนนี้ ไม่อนุญาตให้ดูข้อสอบ
    if (!isMember) {
      redirect("/dashboard");
    }
  }

  // เช็คว่าเคยส่งงานนี้ไปแล้วหรือยัง
  let existingSubmission: { score: number; maxScore: number; submissionId: string } | null = null;
  try {
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
