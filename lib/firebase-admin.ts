import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const rawPrivateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
const privateKey = rawPrivateKey?.replace(/\\n/g, "\n");

export const isFirebaseAdminConfigured = Boolean(projectId && clientEmail && privateKey);

const apps = getApps();
const app = !apps.length
  ? initializeApp(
      isFirebaseAdminConfigured
        ? {
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          }
        : {
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "practice-hub",
          }
    )
  : apps[0];

export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
export { FieldValue };

export interface SessionUser {
  uid: string;
  email?: string;
  name?: string;
  role: "student" | "teacher" | "admin";
  classIds?: string[];
}

/**
 * ดึงข้อมูลผู้ใช้จาก Session Cookie ฝั่ง Server (RSC หรือ Server Actions)
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  if (!sessionCookie) {
    return null;
  }
  try {
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // ดึง Role จริงจาก Firestore /users/{uid} ตามกฎ Zero-Trust
    const userDoc = await adminDb.collection("users").doc(decodedToken.uid).get();
    const userData = userDoc.data();

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name || userData?.displayName || "ผู้ใช้งาน",
      role: (userData?.role as "student" | "teacher" | "admin") || "student",
      classIds: userData?.classIds || [],
    };
  } catch (error) {
    console.error("Session verification failed:", error);
    return null;
  }
}
