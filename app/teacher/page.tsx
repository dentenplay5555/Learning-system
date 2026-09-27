import type { QueryDocumentSnapshot } from "firebase-admin/firestore";
import Link from "next/link";
import { adminDb } from "@/lib/firebase-admin";
import { requireTeacher } from "@/lib/auth";
import { formatBangkokDate } from "@/lib/date";
import AnimatedCounter from "@/components/AnimatedCounter";

export default async function TeacherDashboardPage() {
  // BUG-01: ตรวจสิทธิ์ครูหรือแอดมินก่อนเข้าถึงข้อมูล
  const user = await requireTeacher();

  // BUG-02: Data Isolation — ครูเห็นเฉพาะ Assignment ของตัวเอง (Admin เห็นทั้งหมด)
  let assignments: Array<{
    id: string;
    title: string;
    classId: string;
    type: "practice" | "quiz" | "exam";
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
  let openInquiriesCount = 0;

  try {
    const assignmentsCollection = adminDb.collection("assignments");
    const snap =
      user.role === "admin"
        ? await assignmentsCollection.limit(50).get()
        : await assignmentsCollection.where("teacherId", "==", user.uid).limit(50).get();

    // ดึงห้องเรียนของครู
    const classesSnap = await adminDb.collection("classes").get();
    const classStudentsMap = new Map<string, Set<string>>();
    const teacherClasses: string[] = [];

    classesSnap.docs.forEach((doc) => {
      const cData = doc.data();
      if (user.role === "admin" || cData.teacherId === user.uid) {
        teacherClasses.push(doc.id);
      }
      const set = new Set<string>();
      if (Array.isArray(cData.studentIds)) {
        cData.studentIds.forEach((uid: string) => {
          if (uid) set.add(uid);
        });
      }
      classStudentsMap.set(doc.id, set);
    });

    const activeClasses = teacherClasses.length > 0 ? teacherClasses : ["class-m4-1"];

    // ดึงจำนวนข้อสงสัยที่ยังไม่ได้ตอบจากนักเรียน (Inquiries)
    const inqSnap = await adminDb
      .collection("inquiries")
      .where("classId", "in", activeClasses.slice(0, 10))
      .where("status", "==", "OPEN")
      .get();
    openInquiriesCount = inqSnap.size;

    if (!snap.empty) {
      const allStudentsSnap = await adminDb
        .collection("users")
        .where("role", "==", "student")
        .get();

      allStudentsSnap.docs.forEach((sDoc) => {
        const sData = sDoc.data();
        if (Array.isArray(sData.classIds)) {
          sData.classIds.forEach((cId: string) => {
            if (!classStudentsMap.has(cId)) {
              classStudentsMap.set(cId, new Set<string>());
            }
            classStudentsMap.get(cId)!.add(sDoc.id);
          });
        }
      });

      const results = await Promise.all(
        snap.docs.map(async (doc: QueryDocumentSnapshot) => {
          const d = doc.data();
          const subsSnap = await adminDb
            .collection("submissions")
            .where("assignmentId", "==", doc.id)
            .get();

          const studentScoreMap = new Map<string, number>();
          subsSnap.docs.forEach((s) => {
            const sData = s.data();
            const sid = sData.studentId;
            const score = typeof sData.score === "number" ? sData.score : 0;
            if (sid && !studentScoreMap.has(sid)) {
              studentScoreMap.set(sid, score);
            }
          });

          const uniqueSubmitted = studentScoreMap.size;
          const classStudentsSet = classStudentsMap.get(d.classId) || new Set<string>();
          const totalStudentsInClass = classStudentsSet.size;

          const maxScore = d.maxScore || 10;
          let earnedInAssignment = 0;
          studentScoreMap.forEach((sc) => {
            earnedInAssignment += sc;
          });
          const maxPossibleInAssignment = uniqueSubmitted * maxScore;

          const avgScore =
            uniqueSubmitted > 0
              ? Math.round((earnedInAssignment / uniqueSubmitted) * 10) / 10
              : 0;

          const assignmentType: "practice" | "quiz" | "exam" =
            d.type === "quiz" || d.type === "exam" ? d.type : "practice";

          return {
            assignment: {
              id: doc.id,
              title: d.title || "แบบฝึกหัด",
              classId: d.classId || "ห้องเรียน",
              type: assignmentType,
              submissionsCount: uniqueSubmitted,
              totalStudents: totalStudentsInClass,
              avgScore,
              maxScore,
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

  const submissionRate =
    totalClassMembersPossible > 0
      ? Math.round((totalUniqueSubmissions / totalClassMembersPossible) * 1000) / 10
      : 0;

  const overallAvgPercent =
    totalMaxScorePossible > 0
      ? Math.round((totalEarnedScore / totalMaxScorePossible) * 1000) / 10
      : 0;

  const distinctClasses = new Set(assignments.map((a) => a.classId)).size;

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-5 sm:px-6 py-8 space-y-6">
      {/* ─── Header ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#30363d]">
        <div className="space-y-1">
          <div className="text-[12px] font-mono text-[#8b949e] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span>{user.role === "admin" ? "admin-panel" : "teacher-dashboard"}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#f0f6fc]">
            สวัสดี, {user.name || "อาจารย์"}
          </h1>
          <p className="text-[13px] text-[#8b949e]">
            จัดการแบบฝึกหัด ตรวจสอบข้อสอบ และติดตามผลคะแนนรายห้อง
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/teacher/inquiries"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] hover:text-white font-mono text-[12px] transition-colors"
          >
            <span>💬 ข้อความนักเรียน</span>
            {openInquiriesCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#da3633] text-white font-bold text-[10px]">
                {openInquiriesCount}
              </span>
            )}
          </Link>

          <Link
            href="/teacher/assignments/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white font-medium text-[13px] shadow-sm transition-all cursor-pointer"
          >
            <span>+</span> สร้างงานใหม่
          </Link>
        </div>
      </div>

      {/* ─── Inquiries Banner (If there are pending questions) ─── */}
      {openInquiriesCount > 0 && (
        <div className="rounded-xl border border-[#da3633]/40 bg-[#da3633]/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💬</span>
            <div>
              <div className="text-sm font-bold text-[#f0f6fc] flex items-center gap-2">
                <span>มี {openInquiriesCount} คำถามจากนักเรียนที่ยังไม่ได้ตอบ</span>
                <span className="w-2 h-2 rounded-full bg-[#f85149] animate-ping" />
              </div>
              <p className="text-xs text-[#8b949e] mt-0.5">
                นักเรียนกำลังรอคำตอบเกี่ยวกับเนื้อหา หรือสงสัยข้อสอบ
              </p>
            </div>
          </div>
          <Link
            href="/teacher/inquiries"
            className="px-3.5 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-mono font-medium shrink-0 transition-colors"
          >
            เปิดดูกล่องข้อความ →
          </Link>
        </div>
      )}

      {/* ─── Metrics ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b949e]">แบบฝึกหัดทั้งหมด</div>
          <div className="text-xl font-bold text-[#f0f6fc] flex items-baseline gap-1">
            <AnimatedCounter target={assignments.length} />
            <span className="text-[12px] font-normal text-[#8b949e]">งาน</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e]">{distinctClasses} ห้องเรียน</div>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b949e]">ส่งงานแล้ว</div>
          <div className="text-xl font-bold text-[#3fb950] flex items-baseline gap-1">
            <AnimatedCounter target={totalUniqueSubmissions} />
            <span className="text-[12px] font-normal text-[#8b949e]">คน</span>
          </div>
          <div className="text-[11px] font-mono text-[#8b949e]">
            จาก {totalClassMembersPossible} สิทธิ์
          </div>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b949e]">อัตราส่งงาน</div>
          <div className="text-xl font-bold text-[#58a6ff]">
            <AnimatedCounter target={submissionRate} decimals={1} suffix="%" />
          </div>
          <div className="text-[11px] font-mono text-[#8b949e]">ตามจำนวนนักเรียนจริง</div>
        </div>
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-4 space-y-1">
          <div className="text-[11px] font-mono text-[#8b949e]">คะแนนเฉลี่ยรวม</div>
          <div className="text-xl font-bold text-[#d29922]">
            <AnimatedCounter target={overallAvgPercent} decimals={1} suffix="%" />
          </div>
          <div className="text-[11px] font-mono text-[#8b949e]">
            {totalUniqueSubmissions > 0 ? "คำนวณจากทุกส่งงาน" : "ยังไม่มีการส่งงาน"}
          </div>
        </div>
      </div>

      {/* ─── Assignments Table ─── */}
      <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#21262d]">
          <div>
            <h2 className="text-[15px] font-bold text-[#f0f6fc]">รายการแบบฝึกหัดและข้อสอบ</h2>
            <p className="text-[11px] font-mono text-[#8b949e] mt-0.5">
              เฉลยถูกเก็บอย่างปลอดภัยบน Firestore Private Collection
            </p>
          </div>
          <Link
            href="/teacher/assignments/new"
            className="text-[12px] font-medium text-[#58a6ff] hover:text-[#79c0ff] transition-colors"
          >
            + เพิ่มงานใหม่
          </Link>
        </div>

        {assignments.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <p className="text-[13px] text-[#f0f6fc] font-medium">ยังไม่มีแบบฝึกหัดที่สร้างไว้</p>
            <p className="text-[12px] text-[#8b949e]">
              กดปุ่ม &quot;สร้างงานใหม่&quot; เพื่อเริ่มต้นมอบหมายงาน
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
            <table className="w-full text-left border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#30363d] text-[#8b949e] text-[11px] font-mono uppercase tracking-wide">
                  <th className="py-2.5 px-3 font-medium">ประเภท</th>
                  <th className="py-2.5 px-3 font-medium">ชื่องาน / ข้อสอบ</th>
                  <th className="py-2.5 px-3 font-medium">ห้องเรียน</th>
                  <th className="py-2.5 px-3 font-medium">สถานะส่งงาน</th>
                  <th className="py-2.5 px-3 font-medium">คะแนนเฉลี่ย</th>
                  <th className="py-2.5 px-3 font-medium">กำหนดส่ง</th>
                  <th className="py-2.5 px-3 text-right font-medium">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#21262d]">
                {assignments.map((item) => {
                  const percentSubmitted =
                    item.totalStudents > 0
                      ? Math.min(100, Math.round((item.submissionsCount / item.totalStudents) * 100))
                      : 0;

                  return (
                    <tr key={item.id} className="hover:bg-[#21262d]/50 transition-colors">
                      <td className="py-3 px-3">
                        {item.type === "practice" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#238636]/15 text-[#3fb950] border border-[#238636]/30">
                            🟢 แบบฝึกหัด
                          </span>
                        )}
                        {item.type === "quiz" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#1f6feb]/15 text-[#58a6ff] border border-[#1f6feb]/30">
                            🔵 แบบทดสอบ
                          </span>
                        )}
                        {item.type === "exam" && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#da3633]/15 text-[#f85149] border border-[#da3633]/30">
                            🔴 การสอบ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-medium text-[#f0f6fc]">
                        {item.title}
                      </td>
                      <td className="py-3 px-3 text-[#8b949e]">
                        <span className="px-2 py-0.5 rounded-full bg-[#21262d] border border-[#30363d] font-mono text-[11px]">
                          {item.classId}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#3fb950] font-mono font-medium text-[12px]">
                            {item.submissionsCount}/{item.totalStudents}
                          </span>
                          <div className="w-14 h-1.5 rounded-full bg-[#21262d] overflow-hidden">
                            <div
                              className="h-full bg-[#3fb950] progress-bar-smooth rounded-full"
                              style={{ width: `${percentSubmitted}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#c9d1d9] font-mono text-[12px]">
                        {item.avgScore} / {item.maxScore}
                      </td>
                      <td className="py-3 px-3 text-[#8b949e] font-mono text-[11px]">
                        {item.dueAt}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Link
                          href={`/dashboard/${item.id}`}
                          className="px-2.5 py-1 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[12px] font-medium text-[#c9d1d9] hover:text-white transition-colors"
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
