
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Safely retrieves environment variables from the globally defined process.env object.
 * This prevents crashes if process or process.env is missing in certain contexts.
 */
const getEnv = (key: string): string | undefined => {
  try {
    return (process.env as any)[key];
  } catch (e) {
    return undefined;
  }
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY') || getEnv('API_KEY') || "AIzaSyAs-Replace-With-Actual-Key",
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN') || "farmtrack-enterprise.firebaseapp.com",
  projectId: getEnv('FIREBASE_PROJECT_ID') || "farmtrack-enterprise",
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET') || "farmtrack-enterprise.appspot.com",
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID') || "123456789",
  appId: getEnv('FIREBASE_APP_ID') || "1:123456789:web:abcdef"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

/**
 * Persists full user state to Firestore
 */
export const syncToCloud = async (userId: string, data: any) => {
  try {
    const userDoc = doc(db, 'users', userId);
    await setDoc(userDoc, {
      ...data,
      lastUpdated: Date.now()
    }, { merge: true });
  } catch (error) {
    console.error("Firestore Sync Error:", error);
  }
};

/**
 * Fetches user state once
 */
export const fetchFromCloud = async (userId: string) => {
  const userDoc = doc(db, 'users', userId);
  const snap = await getDoc(userDoc);
  return snap.exists() ? snap.data() : null;
};
