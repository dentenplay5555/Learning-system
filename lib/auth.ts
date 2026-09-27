import { redirect } from "next/navigation";
import { getSessionUser, adminDb, type SessionUser } from "./firebase-admin";

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

// ===================================================================
// BUG-03: Single Source of Truth สำหรับตรวจ Class Membership
// ===================================================================

/**
 * ตรวจสอบว่าผู้ใช้มีสิทธิ์เข้าถึงหรือส่งงานในห้องเรียนนี้หรือไม่
 * ตรวจสอบความถูกต้องจากฐานข้อมูลฝั่ง Server ครบทุกกรณี
 */
export async function isUserMemberOfClass(
  user: SessionUser,
  classId: string
): Promise<boolean> {
  if (!classId) return false;

  // ครูและแอดมินสามารถเข้าถึงได้เสมอ
  if (canAccessTeacherArea(user)) {
    return true;
  }

  // 1. ตรวจ studentIds array ใน /classes/{classId}
  const classDoc = await adminDb.collection("classes").doc(classId).get();
  if (classDoc.exists) {
    const classData = classDoc.data();
    if (Array.isArray(classData?.studentIds) && classData.studentIds.includes(user.uid)) {
      return true;
    }
  }

  // 2. ตรวจ subcollection /classes/{classId}/members/{uid}
  const memberDoc = await adminDb
    .collection("classes")
    .doc(classId)
    .collection("members")
    .doc(user.uid)
    .get();
  if (memberDoc.exists) {
    return true;
  }

  // 3. ตรวจ user.classIds ใน Firestore /users/{uid}
  if (user.classIds && user.classIds.includes(classId)) {
    return true;
  }

  return false;
}
