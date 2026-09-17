import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const customDbId = (firebaseConfig as any).firestoreDatabaseId?.trim();
export const db = initializeFirestore(
  app,
  {
    ignoreUndefinedProperties: true,
  },
  customDbId ? customDbId : undefined,
);

export const googleProvider = new GoogleAuthProvider();

