// ===================================================================
// BUG-16: Firebase Dummy Config → ใช้ required env ไม่มี fallback
// ===================================================================

import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ทุก config ต้องมี — ถ้าหาย app จะไม่ทำงาน (fail-closed)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Validate ว่ามีค่า config ครบ — ถ้าไม่ครบ throw error ทันที
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
for (const key of requiredKeys) {
  if (!firebaseConfig[key]) {
    throw new Error(
      `Missing required Firebase client config: NEXT_PUBLIC_FIREBASE_${key
        .replace(/([A-Z])/g, "_$1")
        .toUpperCase()}`
    );
  }
}

// Initialize Firebase Client
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const clientAuth = getAuth(app);
export const clientDb = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
// แนะนำตั้งค่าจำกัด hosted domain ของโรงเรียน เช่น "schooldomain.ac.th"
if (process.env.NEXT_PUBLIC_SCHOOL_DOMAIN) {
  googleProvider.setCustomParameters({
    hd: process.env.NEXT_PUBLIC_SCHOOL_DOMAIN,
    prompt: "select_account",
  });
}

export default app;
