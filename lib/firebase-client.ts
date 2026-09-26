import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDummyKeyForLocalDevelopmentOnly",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "practice-hub.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "practice-hub",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "practice-hub.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:abcdef",
};

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
