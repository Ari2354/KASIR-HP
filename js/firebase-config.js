// Firebase configuration for project "KASIR"
const firebaseConfig = {
  apiKey: "AIzaSyDjqaZdC7JtSGGsdyMirZnJhJWod2fYbPM",
  authDomain: "kasir-8a71a.firebaseapp.com",
  projectId: "kasir-8a71a",
  storageBucket: "kasir-8a71a.firebasestorage.app",
  messagingSenderId: "977521515721",
  appId: "1:977521515721:web:596b98f5510c14a6dd0118",
  measurementId: "G-VQBE7H6SHP"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
