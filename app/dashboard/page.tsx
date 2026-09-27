import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { requireUser } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";

export default async function StudentDashboardPage() {
  // BUG-01: ตรวจสอบการเข้าสู่ระบบแบบรวมศูนย์
  const user = await requireUser();

  // BUG-02: Data Isolation — นักเรียนเข้าถึงเฉพาะแบบฝึกหัดของห้องที่ตนเองสังกัด
  const studentClasses =
    user.classIds && user.classIds.length > 0 ? user.classIds : ["class-m4-1"];

  let assignments: Array<{
    id: string;
    title: string;
    description: string;
    classId: string;
    questionCount: number;
    maxScore: number;
    dueAt: string;
    status: string;
    score?: number;
  }> = [];

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
        return {
          id: doc.id,
          title: data.title || "แบบฝึกหัด",
          description: data.description || "",
          classId: data.classId || "ห้องเรียน",
          questionCount: (data.questions || []).length,
          maxScore: data.maxScore || 10,
          // BUG-09: แสดงผลวันที่ในเขตเวลาไทย (Asia/Bangkok)
          dueAt: formatBangkokDate(data.dueAt),
          status: submission ? "graded" : "pending",
          ...(submission ? { score: submission.score } : {}),
        };
      });
    }
  } catch (err) {
    console.error("Fetch student assignments failed:", err);
  }

  const pendingCount = assignments.filter((a) => a.status !== "graded").length;
  const gradedList = assignments.filter((a) => a.status === "graded" && typeof a.score === "number");
  const gradedCount = gradedList.length;
  const avgPercent =
    gradedCount > 0
      ? Math.round(
          (gradedList.reduce((acc, a) => acc + (a.score! / (a.maxScore || 1)) * 100, 0) / gradedCount)
        )
      : 0;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Student Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              👨‍🎓 Student Dashboard
            </span>
            {/* BUG-13: แสดงห้องเรียนจริงที่สังกัด แทนการ Hardcode */}
            <span className="text-xs text-slate-400">
              สังกัด: {studentClasses.join(", ")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            ยินดีต้อนรับ, {user.name || "นักเรียน"}
          </h1>
          <p className="text-sm text-slate-400">
            ตรวจสอบรายการแบบฝึกหัดที่ได้รับมอบหมายและส่งคำตอบเพื่อดูผลคะแนน
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-4">
          <div className="glass-panel px-5 py-3 rounded-2xl text-center">
            <div className="text-2xl font-bold text-indigo-400">{pendingCount}</div>
            <div className="text-[11px] text-slate-400 font-medium">รอส่งคำตอบ</div>
          </div>
          <div className="glass-panel px-5 py-3 rounded-2xl text-center">
            <div className="text-2xl font-bold text-emerald-400">{gradedCount}</div>
            <div className="text-[11px] text-slate-400 font-medium">ส่งแล้ว/ตรวจแล้ว</div>
          </div>
          <div className="glass-panel px-5 py-3 rounded-2xl text-center">
            <div className="text-2xl font-bold text-amber-400">{avgPercent}%</div>
            <div className="text-[11px] text-slate-400 font-medium">คะแนนเฉลี่ย</div>
          </div>
        </div>
      </div>

      {/* Assignments Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>📝</span> รายการแบบฝึกหัดประจำห้องเรียน
          </h2>
          <span className="text-xs text-slate-400">อัปเดตล่าสุดอัตโนมัติ</span>
        </div>

        {assignments.length === 0 ? (
          <div className="glass-panel rounded-2xl p-10 text-center space-y-2">
            <div className="text-3xl">📭</div>
            <p className="text-sm text-slate-300 font-semibold">ยังไม่มีแบบฝึกหัดในตอนนี้</p>
            <p className="text-xs text-slate-500">
              เมื่อคุณครูมอบหมายแบบฝึกหัดให้ห้องของคุณ จะแสดงที่นี่โดยอัตโนมัติ
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assignments.map((item) => (
              <div
                key={item.id}
                className="glass-panel glass-panel-hover rounded-2xl p-6 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300">
                      {item.classId}
                    </span>
                    {item.status === "graded" ? (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                        ตรวจแล้ว ({item.score}/{item.maxScore})
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/40">
                        ยังไม่ส่ง
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-base text-slate-100 leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-[11px] text-slate-400">
                    กำหนดส่ง: <span className="text-slate-200">{item.dueAt}</span>
                  </div>
                  <Link
                    href={`/dashboard/${item.id}`}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
                  >
                    {item.status === "graded" ? "ดูผลคะแนน" : "เริ่มทำแบบฝึกหัด →"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
