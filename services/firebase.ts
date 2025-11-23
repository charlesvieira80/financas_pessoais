import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Substitua estas configurações pelas chaves do seu projeto Firebase Console
// Em um projeto Vite real, você usaria import.meta.env.VITE_FIREBASE_API_KEY, etc.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "SUA_API_KEY_AQUI",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "seu-projeto.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "seu-projeto",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "seu-projeto.appspot.com",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);