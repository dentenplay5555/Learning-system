import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase-admin";

/**
 * Layout นี้ครอบทุกหน้าใน /teacher/** (รวมถึง /teacher/assignments/new)
 * ทำหน้าที่เช็คสิทธิ์แบบรวมศูนย์ที่เดียว แทนที่จะเช็คซ้ำในทุก page.tsx
 *
 * สำคัญ: เช็คทั้ง "login หรือยัง" และ "role เป็นครู/admin จริงไหม"
 * ห้ามเช็คแค่ isSignedIn แล้วถือว่าปลอดภัย เพราะ role ต้องอ่านจาก
 * server-verified session (getSessionUser) เท่านั้น — ตามกฎ Zero-Trust เดิม
 */
 export default async function TeacherLayout({
     children,
 }: {
     children: React.ReactNode;
 }) {
     const user = await getSessionUser();

     if (!user) {
         redirect("/login");
     }

     if (user.role !== "teacher" && user.role !== "admin") {
         // นักเรียนที่พยายามเข้าโซนครู ส่งกลับไปหน้าของตัวเอง ไม่ใช่แค่ปฏิเสธเฉยๆ
         redirect("/dashboard");
     }

     return <>{children}</>;
 }
