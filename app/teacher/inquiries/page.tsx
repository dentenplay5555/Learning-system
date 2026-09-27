import { adminDb } from "@/lib/firebase-admin";
import { requireTeacher } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";
import TeacherInquiriesClient from "./TeacherInquiriesClient";

export default async function TeacherInquiriesPage() {
  const user = await requireTeacher();

  // ดึงห้องเรียนที่ครูเป็นผู้ดูแล (ถ้า admin ดูได้ทั้งหมด)
  let teacherClassIds: string[] = [];
  try {
    if (user.role === "admin") {
      const classesSnap = await adminDb.collection("classes").get();
      teacherClassIds = classesSnap.docs.map((d) => d.id);
    } else {
      const classesSnap = await adminDb
        .collection("classes")
        .where("teacherId", "==", user.uid)
        .get();
      teacherClassIds = classesSnap.docs.map((d) => d.id);
      // Fallback
      if (teacherClassIds.length === 0) {
        teacherClassIds = ["class-m4-1"];
      }
    }
  } catch (err) {
    console.error("Fetch teacher classes error:", err);
    teacherClassIds = ["class-m4-1"];
  }

  let inquiries: Array<{
    id: string;
    studentId: string;
    studentName: string;
    studentEmail: string;
    classId: string;
    category: string;
    title: string;
    content: string;
    status: "OPEN" | "ANSWERED" | "CLOSED";
    reply?: string | null;
    answeredBy?: string | null;
    answeredAt?: string | null;
    createdAt: string;
    context?: {
      assignmentId?: string;
      assignmentTitle?: string;
      questionIndex?: number;
      questionPrompt?: string;
    } | null;
  }> = [];

  try {
    const snap = await adminDb
      .collection("inquiries")
      .where("classId", "in", teacherClassIds.slice(0, 10))
      .get();

    if (!snap.empty) {
      const docs = snap.docs.sort((a, b) => {
        const aTime = a.data().createdAt?._seconds || 0;
        const bTime = b.data().createdAt?._seconds || 0;
        return bTime - aTime;
      });

      inquiries = docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          studentId: d.studentId,
          studentName: d.studentName || "นักเรียน",
          studentEmail: d.studentEmail || "",
          classId: d.classId || "ห้องเรียน",
          category: d.category || "other",
          title: d.title || "คำถาม",
          content: d.content || "",
          status: d.status || "OPEN",
          reply: d.reply || null,
          answeredBy: d.answeredBy || null,
          answeredAt: d.answeredAt ? formatBangkokDate(d.answeredAt) : null,
          createdAt: formatBangkokDate(d.createdAt),
          context: d.context || null,
        };
      });
    }
  } catch (err) {
    console.error("Fetch teacher inquiries failed:", err);
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8">
      <TeacherInquiriesClient
        initialInquiries={inquiries}
        classes={teacherClassIds}
        teacherName={user.name || "คุณครู"}
      />
    </div>
  );
}
