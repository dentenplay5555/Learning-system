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

    // ตรวจสอบ domain โรงเรียนถ้ามีการกำหนดไว้
    const schoolDomain = process.env.NEXT_PUBLIC_SCHOOL_DOMAIN;
    if (schoolDomain && decodedToken.email && !decodedToken.email.endsWith(`@${schoolDomain}`)) {
      return NextResponse.json(
        { error: `กรุณาใช้อีเมลของโรงเรียน (@${schoolDomain}) เท่านั้น` },
        { status: 403 }
      );
    }

    // 3. Server Provisioning: สร้าง document /users/{uid} หากล็อกอินครั้งแรก
    // (ห้าม client สร้างเองเด็ดขาด เพื่อป้องกัน self-assign role)
    const userRef = adminDb.collection("users").doc(decodedToken.uid);
    const userDoc = await userRef.get();

    let role = "student";
    if (!userDoc.exists) {
      await userRef.set({
        email: decodedToken.email || "",
        displayName: decodedToken.name || "นักเรียน",
        role: "student", // ค่าเริ่มต้นเป็นนักเรียนเสมอ
        classIds: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      role = userDoc.data()?.role || "student";
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
    console.error("Session creation error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create session";
    return NextResponse.json(
      { error: errorMessage },
      { status: 401 }
    );
  }
}

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
  return NextResponse.json({ status: "logged_out" });
}
