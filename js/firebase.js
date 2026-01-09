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
  where,
  orderBy,
  limit,
  deleteDoc,
  addDoc
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

// Search products by query using search_tokens
export async function searchProducts(searchTerm, maxResults = 50) {
  if (!searchTerm || !searchTerm.trim()) {
    return await getProducts();
  }

  const searchLower = searchTerm.toLowerCase().trim();
  const productsRef = collection(db, 'products');
  
  try {
    // Search using array-contains on search_tokens
    const q = query(
      productsRef,
      where('search_tokens', 'array-contains', searchLower),
      orderBy('search_score', 'desc'),
      limit(maxResults)
    );
    
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    
    // If no results from token search, try partial name/category match
    if (items.length === 0) {
      const allProducts = await getProducts();
      const filtered = allProducts.filter(p => {
        const name = (p.name_lower || p.name || '').toLowerCase();
        const category = (p.category_lower || p.category || '').toLowerCase();
        return name.includes(searchLower) || category.includes(searchLower);
      });
      
      // Sort by relevance
      filtered.sort((a, b) => {
        const aName = (a.name_lower || a.name || '').toLowerCase();
        const bName = (b.name_lower || b.name || '').toLowerCase();
        const aScore = a.search_score || 0;
        const bScore = b.search_score || 0;
        
        // Exact match gets priority
        if (aName === searchLower) return -1;
        if (bName === searchLower) return 1;
        
        // Starts with gets priority
        const aStarts = aName.startsWith(searchLower) ? 1 : 0;
        const bStarts = bName.startsWith(searchLower) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        
        // Then by search score
        return bScore - aScore;
      });
      
      return filtered.slice(0, maxResults);
    }
    
    return items;
  } catch (error) {
    console.error('Search error, falling back to client-side:', error);
    // Fallback to client-side search
    const allProducts = await getProducts();
    return allProducts.filter(p => {
      const name = (p.name_lower || p.name || '').toLowerCase();
      const category = (p.category_lower || p.category || '').toLowerCase();
      return name.includes(searchLower) || category.includes(searchLower);
    }).slice(0, maxResults);
  }
}

// Search products by category
export async function searchByCategory(category, maxResults = 100) {
  const productsRef = collection(db, 'products');
  
  try {
    const q = query(
      productsRef,
      where('category_lower', '==', category.toLowerCase()),
      orderBy('search_score', 'desc'),
      limit(maxResults)
    );
    
    const snap = await getDocs(q);
    const items = [];
    snap.forEach(d => items.push({ id: d.id, ...d.data() }));
    return items;
  } catch (error) {
    console.error('Category search error:', error);
    const allProducts = await getProducts();
    return allProducts.filter(p => 
      (p.category_lower || p.category || '').toLowerCase() === category.toLowerCase()
    );
  }
}

// Get all categories
export async function getCategories() {
  try {
    const configDoc = await getDoc(doc(db, 'config', 'search'));
    if (configDoc.exists()) {
      const data = configDoc.data();
      return data.categories || [];
    }
  } catch (error) {
    console.error('Error fetching categories from config:', error);
  }
  
  // Fallback: get unique categories from all products
  const products = await getProducts();
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  return categories.sort();
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

// Recommendation reports for a user
export async function saveRecommendationReport(uid, report) {
  const reportRef = doc(db, 'users', uid, 'reports', report.id);
  await setDoc(reportRef, {
    ...report,
    createdAt: Date.now()
  });
}

export async function getRecommendationReports(uid) {
  const reportsRef = collection(db, 'users', uid, 'reports');
  const q = query(reportsRef, orderBy('createdAt', 'desc'), limit(50));
  const snap = await getDocs(q);
  const reports = [];
  snap.forEach(d => reports.push({ id: d.id, ...d.data() }));
  return reports;
}

export async function getRecommendationReport(uid, reportId) {
  const reportRef = doc(db, 'users', uid, 'reports', reportId);
  const snap = await getDoc(reportRef);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function deleteRecommendationReport(uid, reportId) {
  const reportRef = doc(db, 'users', uid, 'reports', reportId);
  await deleteDoc(reportRef);
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  const data = snap.exists() ? snap.data() : {};
  return data.profile ?? null;
}

// Admin: CRUD operations for products
export async function addProduct(productData) {
  const productsRef = collection(db, 'products');
  const original = Number(productData.original_price) || 0;
  const discounted = Number(productData.discounted_price) || 0;
  const pct = original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;
  const discountStr = (productData.discount && productData.discount.trim()) ? productData.discount : (pct > 0 ? `${pct}%` : '');
  const uid = (auth && auth.currentUser) ? auth.currentUser.uid : null;

  const docRef = await addDoc(productsRef, {
    ...productData,
    original_price: original,
    discounted_price: discounted,
    discount: discountStr,
    name_lower: (productData.name || '').toLowerCase(),
    category_lower: (productData.category || '').toLowerCase(),
    search_tokens: generateSearchTokens(productData.name),
    search_score: 100,
    created_by: uid,
    created_at: Date.now(),
    updated_at: Date.now()
  });
  return docRef.id;
}

export async function updateProduct(productId, productData) {
  const productRef = doc(db, 'products', productId);
  const original = Number(productData.original_price) || 0;
  const discounted = Number(productData.discounted_price) || 0;
  const pct = original > 0 ? Math.round(((original - discounted) / original) * 100) : 0;
  const discountStr = (productData.discount && productData.discount.trim()) ? productData.discount : (pct > 0 ? `${pct}%` : '');

  await setDoc(productRef, {
    ...productData,
    original_price: original,
    discounted_price: discounted,
    discount: discountStr,
    name_lower: (productData.name || '').toLowerCase(),
    category_lower: (productData.category || '').toLowerCase(),
    search_tokens: generateSearchTokens(productData.name),
    updated_at: Date.now()
  }, { merge: true });
}

export async function deleteProduct(productId) {
  const productRef = doc(db, 'products', productId);
  await deleteDoc(productRef);
}

// Helper to generate search tokens
function generateSearchTokens(name) {
  if (!name) return [];
  const tokens = new Set();
  const clean = name.toLowerCase().trim();
  tokens.add(clean);
  
  // Add individual words
  const words = clean.split(/\s+/);
  words.forEach(w => {
    if (w.length > 2) tokens.add(w);
  });
  
  // Add prefixes
  for (let i = 2; i <= clean.length && i <= 10; i++) {
    tokens.add(clean.substring(0, i));
  }
  
  return Array.from(tokens);
}

// Admin: CRUD operations for deals of the day
export async function getDeals() {
  const col = collection(db, 'deals');
  const q = query(col, orderBy('priority', 'desc'));
  const snap = await getDocs(q);
  const items = [];
  snap.forEach(d => items.push({ id: d.id, ...d.data() }));
  return items;
}

export async function addDeal(dealData) {
  const dealsRef = collection(db, 'deals');
  const docRef = await addDoc(dealsRef, {
    ...dealData,
    created_at: Date.now(),
    updated_at: Date.now()
  });
  return docRef.id;
}

export async function updateDeal(dealId, dealData) {
  const dealRef = doc(db, 'deals', dealId);
  await setDoc(dealRef, {
    ...dealData,
    updated_at: Date.now()
  }, { merge: true });
}

export async function deleteDeal(dealId) {
  const dealRef = doc(db, 'deals', dealId);
  await deleteDoc(dealRef);
}
