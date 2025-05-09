// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCZCOQDp6LFehxraGRSZH25h68cpNpuYI8",
  authDomain: "quizshow-8ded7.firebaseapp.com",
  projectId: "quizshow-8ded7",
  storageBucket: "quizshow-8ded7.firebasestorage.app",
  messagingSenderId: "952379230327",
  appId: "1:952379230327:web:eabeb86c0e5c4b03451e72",
  measurementId: "G-FVRVZENGSQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, analytics, auth, db }; 