"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithPopup } from "firebase/auth";
import { clientAuth, googleProvider } from "@/lib/firebase-client";
import Spinner from "@/components/Spinner";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);

  // การล็อกอินด้วย Google OAuth จริง
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

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

      showToast(`ยินดีต้อนรับ ${data.user?.name || ""}`, "success");

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
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 items-center justify-center px-5 py-14">
      <div className="max-w-sm w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[#161b22] border border-[#30363d] flex items-center justify-center text-white text-lg font-bold shadow-md">
            <svg className="w-6 h-6 text-[#58a6ff]" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9 1.01 1.25.33.41.9.9 2.51.64.01.67.01 1.3.01 1.51 0 .21-.15.46-.55.38A8.013 8.013 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#f0f6fc]">เข้าสู่ระบบ Practice Hub</h2>
          <p className="text-[13px] text-[#8b949e]">
            ลงชื่อเข้าใช้งานด้วยบัญชี Google เพื่อเริ่มเรียนรู้
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-xl space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-md bg-[#f0f6fc] hover:bg-[#ffffff] text-[#0d1117] font-semibold text-[13px] flex items-center justify-center gap-2.5 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <Spinner className="w-4 h-4 text-gray-900" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
              </svg>
            )}
            {loading ? "กำลังเชื่อมต่อ..." : "Continue with Google"}
          </button>
        </div>

        <div className="text-center font-mono text-[11px] text-[#8b949e]">
          Protected by Firebase Authentication · HTTP-only Session
        </div>
      </div>
    </div>
  );
}
