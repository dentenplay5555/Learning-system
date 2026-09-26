"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { clientAuth, googleProvider } from "@/lib/firebase-client";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // การล็อกอินด้วย Google OAuth จริง
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await signInWithPopup(clientAuth, googleProvider);
      const idToken = await result.user.getIdToken();

      // ส่ง ID Token ไปแลก Session Cookie ที่ฝั่ง Server
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์");
      }

      // นำทางตาม Role ที่ได้รับมาจาก Server
      if (data.user?.role === "teacher" || data.user?.role === "admin") {
        router.push("/teacher");
      } else {
        router.push("/dashboard");
      }
      router.refresh();
    } catch (err: unknown) {
      console.error("Login failed:", err);
      const msg = err instanceof Error ? err.message : "ไม่สามารถเข้าสู่ระบบด้วย Google ได้";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="max-w-md w-full glass-panel rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="text-center space-y-3 mb-8">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[15px] flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">เข้าสู่ระบบ Practice Hub</h2>
          <p className="text-xs text-slate-400">
            ระบบกลางจัดการแบบฝึกหัดสำหรับนักเรียนและคุณครู
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-red-950/40 border border-red-800/50 text-xs text-red-300">
            ⚠️ {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Main Google Sign-in Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
              />
            </svg>
            {loading ? "กำลังเชื่อมต่อ..." : "Sign in with Google"}
          </button>

        </div>

        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <p className="text-[11px] text-slate-500 leading-normal">
            🛡️ ระบบรักษาความปลอดภัยด้วย Session Cookie ปลอดภัยจาก XSS และ CSRF
          </p>
        </div>
      </div>
    </div>
  );
}
