import Link from "next/link";
import { getSessionUser } from "@/lib/firebase-admin";
import FlappyGame from "@/components/FlappyGame";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <div className="flex flex-col flex-1 items-center px-5 sm:px-6 pt-12 pb-24 max-w-5xl mx-auto w-full">
      {/* ─── GitHub Universe Space Badge ─── */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#30363d] bg-[#161b22]/80 backdrop-blur-md mb-8 hover:border-[#58a6ff]/50 transition-colors">
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58a6ff] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#1f6feb]" />
        </span>
        <span className="text-xs font-mono text-[#8b949e]">
          GitHub Cosmos Edition
        </span>
        <span className="text-[#30363d]">•</span>
        <span className="text-xs font-mono text-[#58a6ff]">
          แตะท้องฟ้าเพื่อเล่นกับดวงดาว ✨
        </span>
      </div>

      {/* ─── Hero Section ─── */}
      <div className="text-center max-w-3xl mx-auto space-y-5">
        <h1 className="text-3xl sm:text-5xl lg:text-[46px] font-bold tracking-tight text-[#f0f6fc] leading-[1.15]">
          แบบฝึกหัดทุกวิชา
          <br />
          <span className="bg-gradient-to-r from-[#79c0ff] via-[#d2a8ff] to-[#7ee787] bg-clip-text text-transparent">
            จัดการได้ในที่เดียว บนห้วงอวกาศ
          </span>
        </h1>

        <p className="text-[15px] sm:text-[16px] text-[#8b949e] max-w-xl mx-auto leading-relaxed">
          ระบบจัดการและตรวจข้อสอบอัตโนมัติสำหรับคุณครูและนักเรียน
          พร้อมฉากหลังท้องฟ้ายามค่ำคืนที่คลิก ลาก และวาดกลุ่มดาวได้จริง
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
          {user ? (
            user.role === "teacher" ? (
              <Link
                href="/teacher"
                className="px-5 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white font-medium text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>เข้าหน้าจัดการคุณครู</span>
                <span aria-hidden>→</span>
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="px-5 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white font-medium text-sm transition-all flex items-center gap-2 shadow-sm cursor-pointer"
              >
                <span>ดูแบบฝึกหัดของฉัน</span>
                <span aria-hidden>→</span>
              </Link>
            )
          ) : (
            <>
              <Link
                href="/login"
                className="px-5 py-2.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white font-medium text-sm transition-all flex items-center gap-2.5 shadow-sm cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#ffffff" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
                </svg>
                เข้าสู่ระบบด้วย Google
              </Link>
              <Link
                href="/dashboard"
                className="px-4 py-2.5 rounded-md bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] text-[#c9d1d9] hover:text-[#f0f6fc] text-sm font-medium transition-colors cursor-pointer"
              >
                ดูตัวอย่างแบบฝึกหัด
              </Link>
            </>
          )}
        </div>
      </div>

      {/* ─── GitHub Interactive Space Showcase Terminal ─── */}
      <div className="w-full mt-12 rounded-xl border border-[#30363d] bg-[#161b22]/90 backdrop-blur-md overflow-hidden shadow-2xl">
        {/* Terminal Header */}
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <span className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <span className="w-3 h-3 rounded-full bg-[#27c93f]" />
            <span className="ml-2 text-xs font-mono text-[#8b949e]">
              cosmos-terminal · bash
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#8b949e]">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span>starfield: active</span>
          </div>
        </div>

        {/* Terminal Body */}
        <div className="p-5 font-mono text-xs text-[#c9d1d9] space-y-3">
          <div className="flex items-center gap-2 text-[#79c0ff]">
            <span className="text-[#3fb950]">$</span>
            <span>npx practice-hub --theme=github-cosmos</span>
          </div>
          <div className="text-[#8b949e] pl-4 border-l-2 border-[#30363d] space-y-1">
            <p>✔ Starfield initialized: 250+ celestial nodes rendered</p>
            <p>✔ Real-time physics: Gravitational well, Supernova bursts, Constellation linker</p>
            <p>✔ Play mode enabled: Click to shoot comets, drag to connect constellations</p>
          </div>
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-[#8b949e]">ลองเล่นดวงดาวได้ทันทีผ่าน Cosmos Dock ด้านล่างขวา ↘️</span>
          </div>
        </div>
      </div>

      {/* ─── GitHub Style Repository Feature Cards ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full">
        {/* Card 1 */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-3 hover:border-[#58a6ff]/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-md bg-[#1f6feb]/15 border border-[#1f6feb]/30 flex items-center justify-center text-[#58a6ff]">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] border border-[#30363d] bg-[#0d1117] px-2 py-0.5 rounded-full">
              manage
            </span>
          </div>
          <h3 className="text-[14px] font-semibold text-[#f0f6fc]">จัดการแบบฝึกหัด</h3>
          <p className="text-[13px] text-[#8b949e] leading-relaxed">
            คุณครูสร้างแบบฝึกหัด กำหนดเวลาส่งงาน และมอบหมายให้แต่ละห้องเรียนได้ง่ายในระบบเดียว
          </p>
        </div>

        {/* Card 2 */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-3 hover:border-[#3fb950]/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-md bg-[#238636]/15 border border-[#238636]/30 flex items-center justify-center text-[#3fb950]">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M13.78 4.22a.75.75 0 0 1 0 1.06l-7.25 7.25a.75.75 0 0 1-1.06 0L2.22 9.28a.751.751 0 0 1 .018-1.042.751.751 0 0 1 1.042-.018L6 10.94l6.72-6.72a.75.75 0 0 1 1.06 0Z" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] border border-[#30363d] bg-[#0d1117] px-2 py-0.5 rounded-full">
              autocheck
            </span>
          </div>
          <h3 className="text-[14px] font-semibold text-[#f0f6fc]">ตรวจคำตอบอัตโนมัติ</h3>
          <p className="text-[13px] text-[#8b949e] leading-relaxed">
            ระบบ Server-side ประเมินผลและคำนวณคะแนนทันที เฉลยถูกเก็บอย่างปลอดภัย
          </p>
        </div>

        {/* Card 3 */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-5 space-y-3 hover:border-[#d29922]/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-md bg-[#9e6a03]/15 border border-[#d29922]/30 flex items-center justify-center text-[#d29922]">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M1.5 1.75V13.5h13.75a.75.75 0 0 1 0 1.5H.75a.75.75 0 0 1-.75-.75V1.75a.75.75 0 0 1 1.5 0Zm14.28 2.53-5.25 5.25a.75.75 0 0 1-1.06 0L7 7.06 2.53 11.53a.75.75 0 0 1-1.06-1.06l5-5a.75.75 0 0 1 1.06 0L10 7.94l4.72-4.72a.75.75 0 0 1 1.06 1.06Z" />
              </svg>
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] border border-[#30363d] bg-[#0d1117] px-2 py-0.5 rounded-full">
              analytics
            </span>
          </div>
          <h3 className="text-[14px] font-semibold text-[#f0f6fc]">สถิติและรายงานผล</h3>
          <p className="text-[13px] text-[#8b949e] leading-relaxed">
            ดูอัตราการส่งงาน คะแนนเฉลี่ย และกราฟวิเคราะห์รายห้องอย่างชัดเจน
          </p>
        </div>
      </div>

      {/* ─── Role Portals ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 w-full">
        {/* Student Portal */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col justify-between hover:border-[#58a6ff]/60 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#58a6ff] bg-[#1f6feb]/15 px-2.5 py-0.5 rounded-full border border-[#1f6feb]/30">
                student-portal
              </span>
              <span className="text-xs text-[#8b949e]">สำหรับผู้เรียน</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#f0f6fc]">
              ทำแบบฝึกหัดและดูผลคะแนนทันที
            </h3>
            <p className="text-[13px] text-[#8b949e] leading-relaxed">
              เห็นแบบฝึกหัดทุกวิชาที่ต้องส่ง ทำข้อสอบออนไลน์ และตรวจสอบคะแนนย้อนหลังได้ตลอดเวลา
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[#21262d]">
            <Link
              href="/dashboard"
              className="text-[13px] font-medium text-[#58a6ff] hover:text-[#79c0ff] flex items-center gap-1 group"
            >
              เข้าสู่หน้านักเรียน <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Teacher Portal */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 flex flex-col justify-between hover:border-[#7ee787]/60 transition-colors">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#7ee787] bg-[#238636]/15 px-2.5 py-0.5 rounded-full border border-[#238636]/30">
                teacher-portal
              </span>
              <span className="text-xs text-[#8b949e]">สำหรับผู้สอน</span>
            </div>
            <h3 className="text-[16px] font-bold text-[#f0f6fc]">
              สร้างข้อสอบและตรวจงานรายห้อง
            </h3>
            <p className="text-[13px] text-[#8b949e] leading-relaxed">
              เพิ่มโจทย์ กำหนดคำตอบที่ถูกต้อง ดูรายชื่อนักเรียนที่ส่งแล้ว และวิเคราะห์สถิติคลาส
            </p>
          </div>
          <div className="pt-4 mt-4 border-t border-[#21262d]">
            <Link
              href="/teacher"
              className="text-[13px] font-medium text-[#7ee787] hover:text-[#a5d6ff] flex items-center gap-1 group"
            >
              เข้าสู่หน้าคุณครู <span className="group-hover:translate-x-1 transition-transform">→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── Relax Mini Game (Collapsible GitHub Box) ─── */}
      <details className="w-full mt-10 rounded-xl border border-[#30363d] bg-[#161b22] p-5 group cursor-pointer">
        <summary className="text-[13px] font-mono text-[#8b949e] hover:text-[#f0f6fc] flex items-center justify-between list-none transition-colors">
          <span className="flex items-center gap-2">
            <span>🎮</span>
            <span>mini-game: cosmic-flappy (พักสายตาระหว่างเรียน)</span>
          </span>
          <span className="text-[#8b949e] group-open:rotate-180 transition-transform text-xs">▼</span>
        </summary>
        <div className="pt-6 flex flex-col items-center">
          <FlappyGame />
        </div>
      </details>
    </div>
  );
}
