// ===================================================================
// BUG-04: Authentication Fail-open → ตรวจ email, domain, verified
// BUG-17: Error Leakage → ไม่ส่ง internal error ให้ client
// ===================================================================

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth, adminDb, FieldValue } from "@/lib/firebase-admin";

const EXPIRES_IN_MS = 60 * 60 * 24 * 5 * 1000; // 5 วัน

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    const cookieStore = await cookies();

    if (!idToken) {
      return NextResponse.json(
        { error: "idToken is required" },
        { status: 400 }
      );
    }

    // 2. ตรวจสอบ ID Token
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // BUG-04: ต้องมี email
    if (!decodedToken.email) {
      return NextResponse.json(
        { error: "ต้องใช้บัญชีที่มีอีเมล" },
        { status: 403 }
      );
    }

    // BUG-04: ตรวจ email verification
    if (!decodedToken.email_verified) {
      return NextResponse.json(
        { error: "กรุณายืนยันความถูกต้องของอีเมลก่อนเข้าสู่ระบบ" },
        { status: 403 }
      );
    }

    // BUG-04: ตรวจ domain โรงเรียน — ใช้ env variable ฝั่ง server (ไม่ใช่ NEXT_PUBLIC)
    const schoolDomain = process.env.SCHOOL_DOMAIN || process.env.NEXT_PUBLIC_SCHOOL_DOMAIN;
    if (schoolDomain) {
      const email = decodedToken.email.toLowerCase();
      if (!email.endsWith(`@${schoolDomain.toLowerCase()}`)) {
        return NextResponse.json(
          { error: `กรุณาใช้อีเมลของโรงเรียน (@${schoolDomain}) เท่านั้น` },
          { status: 403 }
        );
      }
    }

    // 3. Server Provisioning: สร้าง document /users/{uid} หากล็อกอินครั้งแรก
    // (ห้าม client สร้างเองเด็ดขาด เพื่อป้องกัน self-assign role)
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    // เช็คว่าอยู่ในรายการครูจาก TEACHER_EMAILS หรือไม่
    const teacherEmails = (process.env.TEACHER_EMAILS || "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    const isConfiguredTeacher =
      !!decodedToken.email &&
      teacherEmails.includes(decodedToken.email.toLowerCase());

    let role: "student" | "teacher" | "admin" = isConfiguredTeacher ? "teacher" : "student";
    let classIds: string[] = isConfiguredTeacher ? [] : ["class-m4-1"];

    if (!userDoc.exists) {
      await userRef.set({
        email: decodedToken.email || "",
        displayName: decodedToken.name || (isConfiguredTeacher ? "คุณครู" : "นักเรียน"),
        role,
        classIds,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      const existingData = userDoc.data();
      role = (existingData?.role as "student" | "teacher" | "admin") || role;
      if (isConfiguredTeacher && role === "student") {
        role = "teacher";
        await userRef.update({
          role: "teacher",
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
      classIds = existingData?.classIds || classIds;
      if (role === "student" && (!classIds || classIds.length === 0)) {
        classIds = ["class-m4-1"];
        await userRef.update({
          classIds,
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    // 4. สร้าง Session Cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN_MS,
    });

    cookieStore.set("session", sessionCookie, {
      maxAge: EXPIRES_IN_MS / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return NextResponse.json({
      status: "success",
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        role,
      },
    });
  } catch (error: unknown) {
    // BUG-17: Error Leakage → log จริง แต่ส่ง generic message ให้ client
    console.error("Session creation error:", error);
    return NextResponse.json(
      { error: "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่" },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ status: "logged_out" });
}
