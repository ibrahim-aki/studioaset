import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check if config is valid (not undefined and not placeholder)
const isValidConfig = firebaseConfig.apiKey &&
    firebaseConfig.apiKey !== "your_api_key_here" &&
    !firebaseConfig.apiKey.includes("your_");

let app: FirebaseApp | undefined;
let auth: Auth | any;
let db: Firestore | any;

if (isValidConfig) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
} else {
    // Provide fallback for build time / demo mode
    auth = { onAuthStateChanged: () => (() => { }) } as any;
    db = {} as any;
}

export { app, auth, db };
