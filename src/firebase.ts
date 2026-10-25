import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager,
  memoryLocalCache,
  getFirestore,
  enableNetwork
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with multi-tab coordination (avoids tab lease conflicts and stream freezing) and memory fallback
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  }, databaseId);
} catch (err) {
  console.warn('[Firestore] Initializing memory cache fallback:', err);
  try {
    firestoreDb = initializeFirestore(app, {
      localCache: memoryLocalCache()
    }, databaseId);
  } catch {
    firestoreDb = getFirestore(app, databaseId);
  }
}

// Automatic connection recovery when returning online or waking from system sleep
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    try {
      enableNetwork(firestoreDb).catch(() => {});
    } catch {}
  });
}

export const db = firestoreDb;
export const auth = getAuth(app);
export { firebaseConfig };

