// Configurazione Firebase (sostituisci con i tuoi dati)
const firebaseConfig = {
  apiKey: "AIzaSyB5hVziQ8VrmtxPUhGB_LdI6KTYOJEMZxs",
  authDomain: "sito-chiesa-ab80a.firebaseapp.com",
  projectId: "sito-chiesa-ab80a",
  storageBucket: "sito-chiesa-ab80a.firebasestorage.app",
  messagingSenderId: "270391022356",
  appId: "1:270391022356:web:f9a2e0dc0f61f56c69e801",
  measurementId: "G-XD6CKT8WFC"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);