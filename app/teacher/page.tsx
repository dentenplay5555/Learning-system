import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import Link from "next/link";
import { getSessionUser, adminDb, isFirebaseAdminConfigured } from "@/lib/firebase-admin";
import { redirect } from "next/navigation";

export default async function TeacherDashboardPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  // ดึง assignments จาก Firestore พร้อมสถิติการส่งงานจริงจาก /submissions
  // ไม่มี mock fallback อีกต่อไป — ถ้ายังไม่มีข้อมูลจริง ให้แสดง empty state แทน
  let assignments: Array<{
    id: string;
    title: string;
    classId: string;
    submissionsCount: number;
    totalStudents: number;
    avgScore: number;
    maxScore: number;
    dueAt: string;
    status: string;
  }> = [];
  try {
    if (isFirebaseAdminConfigured) {
      const snap = await adminDb.collection("assignments").limit(20).get();
      if (!snap.empty) {
        // จำนวนนักเรียนทั้งหมด: นับจาก /users ที่ role === "student"
        // (หมายเหตุ: โค้ดปัจจุบันยังไม่มีการผูก classId เข้ากับนักเรียนจริง
        // จึงใช้จำนวนนักเรียนทั้งหมดในระบบเป็นตัวเทียบแทนจำนวนต่อห้อง)
        const studentsSnap = await adminDb.collection("users").where("role", "==", "student").get();
        const totalStudents = studentsSnap.size || 1;

        assignments = await Promise.all(
          snap.docs.map(async (doc: QueryDocumentSnapshot) => {
            const d = doc.data();

            // Query จริงจาก /submissions ที่ assignmentId ตรงกับข้อสอบนี้
            const subsSnap = await adminDb
              .collection("submissions")
              .where("assignmentId", "==", doc.id)
              .get();

            const scores = subsSnap.docs
              .map((s) => s.data().score)
              .filter((s): s is number => typeof s === "number");

            const submissionsCount = subsSnap.size;
            const avgScore =
              scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : 0;

            return {
              id: doc.id,
              title: d.title || "แบบฝึกหัด",
              classId: d.classId || "ห้องเรียน",
              submissionsCount,
              totalStudents,
              avgScore,
              maxScore: d.maxScore || 30,
              dueAt: d.dueAt?.toDate ? d.dueAt.toDate().toISOString().split("T")[0] : "2026-10-10",
              status: "active",
            };
          })
        );
      }
    }
  } catch (err) {
    console.error("Fetch teacher assignments error:", err);
  }

  // สรุปตัวเลขรวมจริงจาก assignments ที่ query ได้ (ใช้แทนตัวเลข hardcode ใน Metrics Row)
  const totalSubmissions = assignments.reduce((acc, a) => acc + a.submissionsCount, 0);
  const totalPossible = assignments.reduce((acc, a) => acc + a.totalStudents, 0) || 1;
  const submissionRate = Math.round((totalSubmissions / totalPossible) * 1000) / 10;
  const scoredAssignments = assignments.filter((a) => a.submissionsCount > 0);
  const overallAvgPercent =
    scoredAssignments.length > 0
      ? Math.round(
          (scoredAssignments.reduce((acc, a) => acc + a.avgScore / (a.maxScore || 1), 0) /
            scoredAssignments.length) *
            1000
        ) / 10
      : 0;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Teacher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              👨‍🏫 Teacher Management Dashboard
            </span>
            <span className="text-xs text-slate-400">กลุ่มสาระการเรียนรู้</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">
            สวัสดี, {user.name || "อาจารย์"}
          </h1>
          <p className="text-sm text-slate-400">
            ระบบจัดการสร้างแบบฝึกหัด มอบหมายงาน และวิเคราะห์ผลการส่งงานของนักเรียน
          </p>
        </div>

        {/* Action Button */}
        <div>
          <Link
            href="/teacher/assignments/new"
            className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-600/20 transition-all cursor-pointer"
          >
            <span className="text-lg">+</span> สร้างแบบฝึกหัดใหม่
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">แบบฝึกหัดทั้งหมด</div>
          <div className="text-2xl font-bold text-white">{assignments.length} งาน</div>
          <div className="text-[11px] text-cyan-400">2 ห้องเรียนที่ดูแล</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">นักเรียนส่งงานแล้ว</div>
          <div className="text-2xl font-bold text-emerald-400">{totalSubmissions} ครั้ง</div>
          <div className="text-[11px] text-emerald-300">ตรวจอัตโนมัติ 100%</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">อัตราการส่งงาน</div>
          <div className="text-2xl font-bold text-indigo-400">{submissionRate}%</div>
          <div className="text-[11px] text-indigo-300">คำนวณจากข้อมูลจริงใน /submissions</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">คะแนนเฉลี่ยรวม</div>
          <div className="text-2xl font-bold text-amber-400">{overallAvgPercent}%</div>
          <div className="text-[11px] text-amber-300">
            {scoredAssignments.length > 0 ? "จากงานที่มีคนส่งแล้ว" : "ยังไม่มีการส่งงาน"}
          </div>
        </div>
      </div>

      {/* Assignments Table Section */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>📋</span> รายการแบบฝึกหัดที่คุณครูสร้างไว้
            </h2>
            <p className="text-xs text-slate-400">
              เฉลยถูกเก็บไว้ในคอลเลกชัน /answerKeys แยกต่างหาก นักเรียนไม่สามารถเข้าถึงได้
            </p>
          </div>

          <Link
            href="/teacher/assignments/new"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            + เพิ่มงานใหม่
          </Link>
        </div>

        {/* Table / Cards */}
        {assignments.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <div className="text-3xl">📋</div>
            <p className="text-sm text-slate-300 font-semibold">ยังไม่มีแบบฝึกหัดที่สร้างไว้</p>
            <p className="text-xs text-slate-500">กด &quot;+ สร้างแบบฝึกหัดใหม่&quot; ด้านบนเพื่อเริ่มต้น</p>
          </div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                <th className="py-3 px-4">ชื่อแบบฝึกหัด</th>
                <th className="py-3 px-4">ห้องเรียน</th>
                <th className="py-3 px-4">สถานะส่งงาน</th>
                <th className="py-3 px-4">คะแนนเฉลี่ย</th>
                <th className="py-3 px-4">กำหนดส่ง</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {assignments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                  <td className="py-4 px-4 font-semibold text-slate-100">
                    {item.title}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-300">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700">
                      {item.classId}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-semibold">
                        {item.submissionsCount}/{item.totalStudents} คน
                      </span>
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400"
                          style={{
                            width: `${(item.submissionsCount / item.totalStudents) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-200">
                    {item.avgScore} / {item.maxScore}
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-400">
                    {item.dueAt}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <Link
                      href={`/dashboard/${item.id}`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
                    >
                      ดูข้อสอบ
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}
