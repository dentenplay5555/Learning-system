import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";
import InquiriesClient from "./InquiriesClient";

export default async function InquiriesPage() {
  const user = await requireUser();

  let inquiries: Array<{
    id: string;
    studentId: string;
    studentName: string;
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
      .where("studentId", "==", user.uid)
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
          classId: d.classId || "class-m4-1",
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
    console.error("Fetch student inquiries failed:", err);
  }

  const studentClasses =
    user.classIds && user.classIds.length > 0 ? user.classIds : ["class-m4-1"];

  return (
    <div className="flex-1 max-w-5xl w-full mx-auto px-5 sm:px-6 py-8">
      <InquiriesClient
        initialInquiries={inquiries}
        defaultClassId={studentClasses[0]}
      />
    </div>
  );
}
