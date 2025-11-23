import { initializeApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

// Acessamos via process.env que é injetado pelo vite.config.ts
const firebaseConfig = {
  apiKey: "AIzaSyAm7ZtpTr6a--Knx5rqXZiZ5v2YUTlpMkk",
  authDomain: "minhas-financas-aistudio.firebaseapp.com",
  projectId: "minhas-financas-aistudio",
  storageBucket: "minhas-financas-aistudio.firebasestorage.app",
  messagingSenderId: "671024450428",
  appId: "1:671024450428:web:4fefbba580e656c6e3f2f9",
  measurementId: "G-CW39CX7F5W"
};

let app;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Verifica se a API KEY existe e não é um placeholder antes de tentar inicializar
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && firebaseConfig.apiKey !== "") {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
} else {
  console.warn("Firebase não inicializado: Chaves de API ausentes ou inválidas. Verifique o arquivo .env");
}

export { auth, db };