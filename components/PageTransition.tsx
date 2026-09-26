"use client";

import { usePathname } from "next/navigation";

/**
 * ห่อ {children} ของ RootLayout ไว้ — ทุกครั้งที่ pathname เปลี่ยน (เช่นกด
 * "ครูผู้สอน" หรือ "ห้องเรียนนักเรียน" บน header) React จะ mount div ใหม่
 * (เพราะ key เปลี่ยน) ทำให้ animation ใน CSS เล่นใหม่ทุกครั้งที่สลับหน้า
 */
export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-transition">
      {children}
    </div>
  );
}
