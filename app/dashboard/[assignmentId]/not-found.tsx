import Link from "next/link";

export default function AssignmentNotFound() {
  return (
    <div className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-6">
      <div className="w-20 h-20 mx-auto rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-4xl">
        🔍
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-white">ไม่พบแบบฝึกหัดนี้</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          ลิงก์นี้อาจไม่ถูกต้อง หรือแบบฝึกหัดถูกลบไปแล้ว
          <br />
          กลับไปที่หน้ารายการแบบฝึกหัดเพื่อเลือกใหม่อีกครั้ง
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all"
      >
        ← กลับไปที่ Dashboard นักเรียน
      </Link>
    </div>
  );
}
