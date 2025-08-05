// Import the functions
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyDPpG5ATbt8qzLFw_UrWESf8LeXamwSgaU",
  authDomain: "skillshield-122d0.firebaseapp.com",
  projectId: "skillshield-122d0",
  storageBucket: "skillshield-122d0.firebasestorage.app",
  messagingSenderId: "354444812391",
  appId: "1:354444812391:web:e439ff0106e5cca2d574c2",
  measurementId: "G-Q0TT6S27HM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
