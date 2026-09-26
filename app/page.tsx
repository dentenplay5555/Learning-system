import Link from "next/link";
import { getSessionUser } from "@/lib/firebase-admin";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col flex-1 items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
      {/* Hero Header */}
      <div className="max-w-4xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 font-medium">
          <span className="w-2 h-2 rounded-full bg-indigo-400"></span>
          Next.js App Router + Firebase + Google OAuth
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
          ระบบรวมแบบฝึกหัดกลาง <br />
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent">
            และติดตามผลการเรียนรู้
          </span>
        </h1>

        <p className="text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
          จบปัญหาการบ้านกระจัดกระจายหลายระบบ ไม่ต้องจำลิงก์ Google Forms 
          นักเรียนส่งงานแล้วรู้ผลคะแนนทันที คุณครูติดตามสถิติและผลการเรียนได้ในที่เดียว
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {user ? (
            user.role === "teacher" ? (
              <Link
                href="/teacher"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                เข้าสู่ Teacher Dashboard 👨‍🏫
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                เข้าสู่ Student Dashboard 👨‍🎓
              </Link>
            )
          ) : (
              <Link
                href="/login"
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              >
                เข้าสู่ระบบด้วย Google 🚀
              </Link>
          )}
        </div>
      </div>

      {/* Feature Architecture Cards */}
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-6 mt-20">
        {/* Student Box */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl">
              👨‍🎓
            </div>
            <h3 className="text-xl font-bold text-white">สำหรับนักเรียน (Student Portal)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              เห็นงานทุกวิชาที่ต้องทำในที่เดียว ทำข้อสอบผ่านเว็บ และส่งคำตอบพร้อมรู้คะแนนประเมินผลอัตโนมัติทันที
            </p>
            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> ฟีดงานตามห้องเรียนและวิชา
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> ตรวจข้อสอบอัตโนมัติแบบ Real-time
              </div>
              <div className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> บันทึกประวัติและคะแนนสะสม
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800/80 mt-6">
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
            >
              เปิดหน้า Student Dashboard <span>→</span>
            </Link>
          </div>
        </div>

        {/* Teacher Box */}
        <div className="glass-panel glass-panel-hover rounded-2xl p-6 sm:p-8 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-2xl">
              👨‍🏫
            </div>
            <h3 className="text-xl font-bold text-white">สำหรับคุณครู (Teacher Studio)</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              สร้างแบบฝึกหัดได้รวดเร็ว แยกเฉลยเก็บไว้บนเซิร์ฟเวอร์อย่างปลอดภัย ตรวจสอบสถานะการส่งงานและคะแนนของนักเรียนทุกคน
            </p>
            <div className="space-y-2 pt-2 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> ปลอดภัยสูง: เฉลยถูกซ่อนบน Admin SDK
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> ติดตามว่าใครส่งแล้ว / ยังไม่ส่ง
              </div>
              <div className="flex items-center gap-2">
                <span className="text-cyan-400">✓</span> สถิติวิเคราะห์คะแนนเฉลี่ยรายห้อง
              </div>
            </div>
          </div>
          <div className="pt-6 border-t border-slate-800/80 mt-6">
            <Link
              href="/teacher"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5"
            >
              เปิดหน้า Teacher Dashboard <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Security Architecture Badge */}
      <div className="max-w-4xl w-full mt-16 p-4 rounded-xl border border-indigo-500/20 bg-indigo-950/20 text-center">
        <p className="text-xs text-indigo-300">
          🔒 <strong>Zero-Trust Architecture:</strong> ป้องกัน Client แก้ไขคะแนน, ล็อกฟิลด์สิทธิ์ความเป็นเจ้าของ, และเก็บ Session Cookie ปลอดภัยตามมาตรฐานสากล
        </p>
      </div>
    </div>
  );
}
