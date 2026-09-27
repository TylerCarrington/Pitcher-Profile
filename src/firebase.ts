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
    ...(typeof window !== 'undefined' ? { experimentalAutoDetectLongPolling: true } : {}),
  },
  customDbId ? customDbId : undefined,
);

export const googleProvider = new GoogleAuthProvider();

if (typeof window !== 'undefined') {
  // Test connection and gracefully handle offline state
  (async () => {
    try {
      const { doc, getDocFromServer } = await import('firebase/firestore');
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('Firestore is running in offline mode. Local caching active.');
      }
    }
  })();
}

