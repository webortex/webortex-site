// Import necessary functions
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase configuration
const firebaseConfig = {
  // apiKey: process.env.REACT_APP_API_KEY,
  // authDomain: process.env.REACT_APP_AUTH_DOMAIN,
  // databaseURL: process.env.REACT_APP_DATABASE_URL,
  // projectId: process.env.REACT_APP_PROJECT_ID,
  // storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
  // messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
  // appId: process.env.REACT_APP_APP_ID,
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
