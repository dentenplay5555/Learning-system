import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getSessionUser } from "@/lib/firebase-admin";
import { logoutAction } from "@/lib/actions";
import PageTransition from "@/components/PageTransition";
import { ToastProvider } from "@/components/Toast";
import ConsoleEasterEgg from "@/components/ConsoleEasterEgg";
import InteractiveBackground from "@/components/InteractiveBackground";

export const metadata: Metadata = {
  title: "Practice Hub — ระบบจัดการแบบฝึกหัดสไตล์ GitHub Cosmos",
  description: "ระบบกลางจัดการแบบฝึกหัดสำหรับนักเรียนและครู พร้อมระบบตรวจข้อสอบอัตโนมัติบนธีมอวกาศ",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  return (
    <html lang="th" className="h-full dark">
      <body className="min-h-full flex flex-col bg-[#0d1117] text-[#c9d1d9] antialiased selection:bg-[#1f6feb]/30 selection:text-white">
        <InteractiveBackground />

        <ToastProvider>
          <ConsoleEasterEgg />

          {/* ─── GitHub Style Header ─── */}
          <header className="sticky top-0 z-50 border-b border-[#30363d] bg-[#161b22]/85 backdrop-blur-xl">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 h-14 flex items-center justify-between">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-2.5 group">
                <div className="w-8 h-8 rounded-lg bg-[#21262d] border border-[#30363d] flex items-center justify-center text-white text-sm font-bold shadow-sm group-hover:border-[#58a6ff] transition-colors">
                  <svg className="w-4 h-4 text-[#58a6ff]" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9 1.01 1.25.33.41.9.9 2.51.64.01.67.01 1.3.01 1.51 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                  </svg>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-[15px] text-[#f0f6fc] tracking-tight">
                    Practice Hub
                  </span>
                  <span className="hidden sm:inline-block text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                    cosmos
                  </span>
                </div>
              </Link>

              {/* Nav */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  href="/dashboard"
                  className="text-[13px] font-medium text-[#8b949e] hover:text-[#f0f6fc] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors"
                >
                  แบบฝึกหัด
                </Link>
                <Link
                  href="/teacher"
                  className="text-[13px] font-medium text-[#8b949e] hover:text-[#f0f6fc] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors"
                >
                  ครูผู้สอน
                </Link>
                {user?.role === "teacher" || user?.role === "admin" ? (
                  <Link
                    href="/teacher/inquiries"
                    className="text-[13px] font-medium text-[#8b949e] hover:text-[#f0f6fc] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>ข้อความนักเรียน</span>
                  </Link>
                ) : (
                  <Link
                    href="/inquiries"
                    className="text-[13px] font-medium text-[#8b949e] hover:text-[#f0f6fc] px-3 py-1.5 rounded-md hover:bg-[#21262d] transition-colors flex items-center gap-1"
                  >
                    <span>💬</span>
                    <span>ติดต่อครู</span>
                  </Link>
                )}

                {user ? (
                  <div className="flex items-center gap-2 ml-2 pl-3 border-l border-[#30363d]">
                    <div className="hidden sm:block text-right">
                      <div className="text-[13px] font-medium text-[#f0f6fc] leading-tight">
                        {user.name}
                      </div>
                      <div className="text-[11px] text-[#8b949e] font-mono">
                        {user.role === "teacher" ? "teacher" : "student"}
                      </div>
                    </div>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="text-[12px] font-medium text-[#8b949e] hover:text-[#f85149] px-2.5 py-1.5 rounded-md hover:bg-[#da3633]/10 transition-colors cursor-pointer"
                      >
                        ออก
                      </button>
                    </form>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    className="ml-2 text-[13px] font-medium bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white px-3.5 py-1.5 rounded-md transition-all shadow-sm cursor-pointer"
                  >
                    เข้าสู่ระบบ
                  </Link>
                )}
              </div>
            </div>
          </header>

          {/* ─── Main ─── */}
          <main className="flex-1 relative z-10 flex flex-col">
            <PageTransition>{children}</PageTransition>
          </main>

          {/* ─── GitHub Style Footer ─── */}
          <footer className="relative z-10 border-t border-[#30363d] py-6 bg-[#0d1117]/80 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-5 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px] text-[#8b949e]">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
                  <span>ระบบพร้อมใช้งานทุกวิชา</span>
                </span>
                <span>•</span>
                <p>© 2026 Practice Hub · Cosmos Space Edition</p>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="hover:text-[#58a6ff] transition-colors">
                  แบบฝึกหัด
                </Link>
                <Link href="/teacher" className="hover:text-[#58a6ff] transition-colors">
                  ครูผู้สอน
                </Link>
                <Link href="/login" className="hover:text-[#58a6ff] transition-colors">
                  เข้าสู่ระบบ
                </Link>
              </div>
            </div>
          </footer>
        </ToastProvider>
      </body>
    </html>
  );
}
