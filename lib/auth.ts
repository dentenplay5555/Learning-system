import { redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "./firebase-admin";

// ===================================================================
// BUG-01: Auth helpers — ตรวจ Login + Role ที่เดียว ก่อน query database
// BUG-18: Admin ถูกมองเป็น Student — ใช้ helper เหล่านี้แทนตรวจ role กระจาย
// ===================================================================

/** ตรวจว่า login แล้ว — redirect ไป /login ถ้ายังไม่ได้ login */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

/** ตรวจว่าเป็น teacher หรือ admin — redirect ไป /dashboard ถ้าไม่ใช่ */
export async function requireTeacher(): Promise<SessionUser> {
  const user = await requireUser();

  if (!canAccessTeacherArea(user)) {
    redirect("/dashboard");
  }

  return user;
}

/** ตรวจว่าเป็น admin เท่านั้น — redirect ไป /dashboard ถ้าไม่ใช่ */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();

  if (!isAdmin(user)) {
    redirect("/dashboard");
  }

  return user;
}

// ===================================================================
// BUG-18: Role helper functions — ใช้แทนการตรวจ role ตรง ๆ ทุกที่
// ===================================================================

export function isTeacher(user: SessionUser): boolean {
  return user.role === "teacher";
}

export function isAdmin(user: SessionUser): boolean {
  return user.role === "admin";
}

/** Teacher หรือ Admin สามารถเข้า Teacher area ได้ */
export function canAccessTeacherArea(user: SessionUser): boolean {
  return user.role === "teacher" || user.role === "admin";
}
