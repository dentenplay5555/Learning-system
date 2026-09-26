import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/firebase-admin";
import { logoutAction } from "@/lib/actions";

export const metadata: Metadata = {
  title: "Practice Hub — ระบบจัดการแบบฝึกหัดและติดตามผลการเรียน",
  description: "ระบบกลางจัดการแบบฝึกหัดสำหรับนักเรียนและครู พร้อมระบบตรวจข้อสอบอัตโนมัติที่ปลอดภัย",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="th" className="h-full antialiased dark">
      <body className="min-h-full flex flex-col bg-[#090d16] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
        {/* Glow backdrop effects */}
        <div className="fixed inset-0 pointer-events-none glow-gradient z-0"></div>
        <div className="fixed inset-0 pointer-events-none glow-accent z-0"></div>

        {/* Global Navigation Header */}
        <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div>
                <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                  Practice Hub
                </span>
                <span className="hidden sm:inline-block ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  ระบบกลางโรงเรียน
                </span>
              </div>
            </Link>

            {/* Navigation links & User Profile */}
            <div className="flex items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                ห้องเรียนนักเรียน
              </Link>
              <Link
                href="/teacher"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
              >
                ครูผู้สอน
              </Link>

              {user ? (
                <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
                  <div className="hidden sm:flex flex-col text-right">
                    <span className="text-xs font-semibold text-slate-200">{user.name}</span>
                    <span className="text-[10px] text-slate-400">
                      {user.role === "teacher" ? "👨‍🏫 ครูผู้สอน" : "👨‍🎓 นักเรียน"}
                    </span>
                  </div>
                  <form action={logoutAction}>
                    <button
                      type="submit"
                      className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/30 hover:bg-red-950/50 border border-red-800/40 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      ออก
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="text-sm font-medium bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-xl shadow-md shadow-indigo-600/25 transition-all cursor-pointer"
                >
                  เข้าสู่ระบบ
                </Link>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative z-10 flex flex-col">{children}</main>

        {/* Global Footer */}
        <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950/80 py-8 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p>© 2026 Practice Hub — Centralized Learning & Assignment Tracking</p>
            <div className="flex items-center gap-4 text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Zero-Trust Rules Active
              </span>
              <span>Next.js App Router</span>
              <span>Firestore</span>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
