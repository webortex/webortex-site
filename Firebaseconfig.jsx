// Import necessary functions
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDi9A6eg7hKPYfV0SK3tHE87jH0vZQvXhc",
  authDomain: "webortex-7e798.firebaseapp.com",
  databaseURL: "https://webortex-7e798-default-rtdb.firebaseio.com",
  projectId: "webortex-7e798",
  storageBucket: "webortex-7e798.firebasestorage.app",
  messagingSenderId: "1095027363933",
  appId: "1:1095027363933:web:77358a1d5b12782c183db4",
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app);

// Export Firestore and Storage
export { db, storage };
