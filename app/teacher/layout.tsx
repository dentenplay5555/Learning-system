import { requireTeacher } from "@/lib/auth";

/**
 * Layout นี้ครอบทุกหน้าใน /teacher/** (รวมถึง /teacher/assignments/new)
 * ทำหน้าที่เช็คสิทธิ์แบบรวมศูนย์ที่เดียวผ่าน requireTeacher()
 * ป้องกันไม่ให้นักเรียนเข้าถึง Teacher Area ได้โดยเด็ดขาด (BUG-01)
 */
export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireTeacher();

  return <>{children}</>;
}
