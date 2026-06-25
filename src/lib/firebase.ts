// Firebase initialization. This config is PUBLIC client config (not a secret)
// and is safe to commit. The Claude API key is NOT here — it lives server-side.
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBuVyjLJggJ07vZi9eZRhCzgxSqboHaI0A",
  authDomain: "transcribe-78477.firebaseapp.com",
  projectId: "transcribe-78477",
  storageBucket: "transcribe-78477.firebasestorage.app",
  messagingSenderId: "872347996971",
  appId: "1:872347996971:web:bf64c0ceacf945f5e46b6e",
  measurementId: "G-KXRP24LQS6",
};

const app: FirebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
