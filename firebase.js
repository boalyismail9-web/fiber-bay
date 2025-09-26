// Firebase initialization for User (Fiber Bay)
// Loads Firebase using ESM CDN and exposes references for other modules.

// IMPORTANT: Verify storageBucket value in your Firebase Console > Project settings.
// It commonly looks like "<project-id>.appspot.com".

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-analytics.js";
// Firestore services
import {
  getFirestore,
  collection,
  addDoc,
  getDoc,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  query,
  where,
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
// import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
// import { getStorage } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyAESP0qiJzn8UtxdYDg5hiJr9THMnuvLC8",
  authDomain: "web-admin-57b18.firebaseapp.com",
  projectId: "web-admin-57b18",
  storageBucket: "web-admin-57b18.appspot.com", // Verify in Firebase Console if needed
  messagingSenderId: "302272792731",
  appId: "1:302272792731:web:5f8fc591422b3080fd9e3e",
  measurementId: "G-PHSMKH7G8N"
};

const app = initializeApp(firebaseConfig);
let analytics = null;
try {
  analytics = getAnalytics(app);
} catch (e) {
  // Analytics may be unavailable in some environments; keep going.
  analytics = null;
}
const db = getFirestore(app);
// const auth = getAuth?.(app);
// const storage = getStorage?.(app);

// Expose globally (optional) for non-module scripts or quick debugging.
window.fb = {
  app,
  analytics,
  db,
  // auth,
  // storage,
  fs: {
    collection,
    addDoc,
    getDoc,
    doc,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    query,
    where,
  },
};

export { app, analytics, db };
