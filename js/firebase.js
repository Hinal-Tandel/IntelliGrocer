// Firebase core module: initializes app, exports auth and firestore helpers
// Imports Firebase ESM modules from the official CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = (window.__FIREBASE_CONFIG__ ?? {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME'
});

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Auth helpers
export { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup };

// User profile and preferences
export async function saveUserProfile(uid, profile) {
  await setDoc(doc(db, 'users', uid), { profile }, { merge: true });
}

export async function saveUserPreferences(uid, preferences) {
  await setDoc(doc(db, 'users', uid), { preferences }, { merge: true });
}

export async function getUserPreferences(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? snap.data() : {};
  return data.preferences ?? null;
}

export async function saveBudget(uid, budget) {
  await setDoc(doc(db, 'users', uid), { budget }, { merge: true });
}

// Grocery products
export async function getProducts() {
  const col = collection(db, 'products');
  const snap = await getDocs(col);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
}

// Recommendations for a user (if stored)
export async function getRecommendations(uid) {
  const col = collection(db, 'users', uid, 'recommendations');
  const snap = await getDocs(col);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
}

export async function saveRecommendations(uid, recs) {
  await setDoc(doc(db, 'users', uid, 'recommendations', 'latest'), {
    items: recs,
    ts: Date.now()
  });
}

// Analytics (optional precomputed charts as base64 strings)
export async function getAnalytics() {
  const snap = await getDoc(doc(db, 'analytics', 'latest'));
  return snap.exists() ? snap.data() : {};
}

// Essential items for a user
export async function saveEssentialItems(uid, items) {
  await setDoc(doc(db, 'users', uid), { essentialItems: items }, { merge: true });
}

export async function getEssentialItems(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? snap.data() : {};
  return data.essentialItems ?? [];
}
