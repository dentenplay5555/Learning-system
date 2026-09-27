import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";
import StudentDashboardClient, { AssignmentItem } from "@/components/StudentDashboardClient";

export default async function StudentDashboardPage() {
  // BUG-01: ตรวจสอบการเข้าสู่ระบบแบบรวมศูนย์
  const user = await requireUser();

  // BUG-02: Data Isolation — นักเรียนเข้าถึงเฉพาะแบบฝึกหัดของห้องที่ตนเองสังกัด
  const studentClasses =
    user.classIds && user.classIds.length > 0 ? user.classIds : ["class-m4-1"];

  let assignments: AssignmentItem[] = [];

  try {
    // Query เฉพาะ Assignment ของห้องที่นักเรียนสังกัดเท่านั้น
    const snap = await adminDb
      .collection("assignments")
      .where("classId", "in", studentClasses.slice(0, 10))
      .get();

    if (!snap.empty) {
      // ดึง submissions ของนักเรียนคนนี้มา map กับ assignmentId
      const subsSnap = await adminDb
        .collection("submissions")
        .where("studentId", "==", user.uid)
        .get();

      const submissionByAssignment = new Map<string, { score: number }>();
      subsSnap.docs.forEach((s) => {
        const d = s.data();
        if (d.assignmentId) {
          submissionByAssignment.set(d.assignmentId, { score: d.score ?? 0 });
        }
      });

      // เรียงลำดับตาม createdAt ล่าสุด
      const docs = snap.docs.sort((a, b) => {
        const aTime = a.data().createdAt?._seconds || 0;
        const bTime = b.data().createdAt?._seconds || 0;
        return bTime - aTime;
      });

      assignments = docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        const submission = submissionByAssignment.get(doc.id);
        const assignmentType: "practice" | "quiz" | "exam" =
          data.type === "quiz" || data.type === "exam" ? data.type : "practice";

        return {
          id: doc.id,
          title: data.title || "แบบฝึกหัด",
          description: data.description || "",
          classId: data.classId || "ห้องเรียน",
          type: assignmentType,
          timeLimitMinutes: data.timeLimitMinutes || 0,
          allowRetake: data.allowRetake ?? assignmentType === "practice",
          questionCount: (data.questions || []).length,
          maxScore: data.maxScore || 10,
          dueAt: formatBangkokDate(data.dueAt),
          status: submission ? "graded" : "pending",
          ...(submission ? { score: submission.score } : {}),
        };
      });
    }
  } catch (err) {
    console.error("Fetch student assignments failed:", err);
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8">
      <StudentDashboardClient
        assignments={assignments}
        studentName={user.name || "นักเรียน"}
        studentClasses={studentClasses}
      />
    </div>
  );
}
