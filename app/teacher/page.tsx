import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { requireTeacher } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";

export default async function TeacherDashboardPage() {
  // BUG-01: ตรวจสิทธิ์ครูหรือแอดมินก่อนเข้าถึงข้อมูล
  const user = await requireTeacher();

  // BUG-02: Data Isolation — ครูเห็นเฉพาะ Assignment ของตัวเอง (Admin เห็นทั้งหมด)
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

  let totalEarnedScore = 0;
  let totalMaxScorePossible = 0;
  let totalUniqueSubmissions = 0;
  let totalClassMembersPossible = 0;

  try {
    const assignmentsCollection = adminDb.collection("assignments");
    const snap =
      user.role === "admin"
        ? await assignmentsCollection.limit(50).get()
        : await assignmentsCollection.where("teacherId", "==", user.uid).limit(50).get();

    if (!snap.empty) {
      // ดึงข้อมูล classes เพื่อหาจำนวนนักเรียนจริงในแต่ละห้อง (BUG-11)
      // ใช้ Set เก็บ UID นักเรียนเพื่อป้องกันการนับซ้ำระหว่าง classes.studentIds และ users.classIds
      const classesSnap = await adminDb.collection("classes").get();
      const classStudentsMap = new Map<string, Set<string>>();

      classesSnap.docs.forEach((doc) => {
        const cData = doc.data();
        const set = new Set<string>();
        if (Array.isArray(cData.studentIds)) {
          cData.studentIds.forEach((uid: string) => {
            if (uid) set.add(uid);
          });
        }
        classStudentsMap.set(doc.id, set);
      });

      // รวมกับนักเรียนที่ระบุ classIds ใน /users (Set จะ deduplicate UID อัตโนมัติ)
      const allStudentsSnap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .get();

      allStudentsSnap.docs.forEach((sDoc) => {
        const sData = sDoc.data();
        const cIds = (sData.classIds || []) as string[];
        cIds.forEach((cId) => {
          if (!classStudentsMap.has(cId)) {
            classStudentsMap.set(cId, new Set<string>());
          }
          classStudentsMap.get(cId)!.add(sDoc.id);
        });
      });

      // เรียงลำดับ createdAt descending
      const sortedDocs = snap.docs.sort((a, b) => {
        const aTime = a.data().createdAt?._seconds || 0;
        const bTime = b.data().createdAt?._seconds || 0;
        return bTime - aTime;
      });

      const results = await Promise.all(
        sortedDocs.map(async (doc: QueryDocumentSnapshot) => {
          const d = doc.data();
          const classId = d.classId || "unknown";

          // BUG-11: คำนวณจำนวนนักเรียนจริงของห้องนี้ (Deduplicated UID)
          const totalStudentsInClass = classStudentsMap.get(classId)?.size || 1;

          // Query Submissions สำหรับ assignment นี้
          const subsSnap = await adminDb
            .collection("submissions")
            .where("assignmentId", "==", doc.id)
            .get();

          const studentIdSet = new Set<string>();
          const scores: number[] = [];
          const maxScore = d.maxScore || 30;
          let earnedInAssignment = 0;
          let maxPossibleInAssignment = 0;

          subsSnap.docs.forEach((s) => {
            const sData = s.data();
            if (sData.studentId) studentIdSet.add(sData.studentId);
            if (typeof sData.score === "number") {
              scores.push(sData.score);
              earnedInAssignment += sData.score;
              maxPossibleInAssignment += sData.maxScore || maxScore;
            }
          });

          const uniqueSubmitted = studentIdSet.size;

          const avgScore =
            scores.length > 0
              ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
              : 0;

          return {
            assignment: {
              id: doc.id,
              title: d.title || "แบบฝึกหัด",
              classId,
              submissionsCount: uniqueSubmitted,
              totalStudents: totalStudentsInClass,
              avgScore,
              maxScore,
              // BUG-09: แปลงเวลาแสดงผลในโซนไทย Asia/Bangkok
              dueAt: formatBangkokDate(d.dueAt),
              status: "active",
            },
            uniqueSubmitted,
            totalStudentsInClass,
            earnedInAssignment,
            maxPossibleInAssignment,
          };
        })
      );

      assignments = results.map((r) => r.assignment);
      totalUniqueSubmissions = results.reduce((acc, r) => acc + r.uniqueSubmitted, 0);
      totalClassMembersPossible = results.reduce((acc, r) => acc + r.totalStudentsInClass, 0);
      totalEarnedScore = results.reduce((acc, r) => acc + r.earnedInAssignment, 0);
      totalMaxScorePossible = results.reduce((acc, r) => acc + r.maxPossibleInAssignment, 0);
    }
  } catch (err) {
    console.error("Fetch teacher assignments error:", err);
  }

  // BUG-11: คำนวณ Submission Rate ตามจำนวนสมาชิกห้องจริง
  const submissionRate =
    totalClassMembersPossible > 0
      ? Math.round((totalUniqueSubmissions / totalClassMembersPossible) * 1000) / 10
      : 0;

  // BUG-12: คำนวณ Average Score แบบถ่วงน้ำหนักรวมจริงจากทุก submission (ไม่ใช่ค่าเฉลี่ยของค่าเฉลี่ย)
  const overallAvgPercent =
    totalMaxScorePossible > 0
      ? Math.round((totalEarnedScore / totalMaxScorePossible) * 1000) / 10
      : 0;

  // BUG-13: คำนวณจำนวนห้องเรียนจริงจาก Assignment ที่ดูแล (แทนตัวเลข hardcode)
  const distinctClasses = new Set(assignments.map((a) => a.classId)).size;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Teacher Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel rounded-3xl p-6 sm:p-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {user.role === "admin" ? "🛡️ Admin Dashboard" : "👨‍🏫 Teacher Management Dashboard"}
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

      {/* Metrics Row — BUG-13: ใช้ข้อมูลคำนวณจริงทั้งหมด */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">แบบฝึกหัดทั้งหมด</div>
          <div className="text-2xl font-bold text-white">{assignments.length} งาน</div>
          <div className="text-[11px] text-cyan-400">{distinctClasses} ห้องเรียนที่ดูแล</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">นักเรียนส่งงานแล้ว</div>
          <div className="text-2xl font-bold text-emerald-400">{totalUniqueSubmissions} คน</div>
          <div className="text-[11px] text-emerald-300">
            จากทั้งหมด {totalClassMembersPossible} สิทธิ์
          </div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">อัตราการส่งงาน</div>
          <div className="text-2xl font-bold text-indigo-400">{submissionRate}%</div>
          <div className="text-[11px] text-indigo-300">คำนวณตามสมาชิกในห้องเรียนจริง</div>
        </div>
        <div className="glass-panel p-5 rounded-2xl space-y-1">
          <div className="text-xs text-slate-400 font-medium">คะแนนเฉลี่ยรวม</div>
          <div className="text-2xl font-bold text-amber-400">{overallAvgPercent}%</div>
          <div className="text-[11px] text-amber-300">
            {totalUniqueSubmissions > 0 ? "คิดคะแนนจากทุกการส่งงาน" : "ยังไม่มีการส่งงาน"}
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
            <p className="text-xs text-slate-500">
              กด &quot;+ สร้างแบบฝึกหัดใหม่&quot; ด้านบนเพื่อเริ่มต้น
            </p>
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
                {assignments.map((item) => {
                  const percentSubmitted =
                    item.totalStudents > 0
                      ? Math.min(100, Math.round((item.submissionsCount / item.totalStudents) * 100))
                      : 0;

                  return (
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
                                width: `${percentSubmitted}%`,
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
