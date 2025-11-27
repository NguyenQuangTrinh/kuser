import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyD6rDwh18_xJEiX7CwdsAc1UrgmNbveBdM",
    authDomain: "kusernew-bffb0.firebaseapp.com",
    projectId: "kusernew-bffb0",
    storageBucket: "kusernew-bffb0.firebasestorage.app",
    messagingSenderId: "401831580822",
    appId: "1:401831580822:web:95ace809bd9965a57f1eb7",
    measurementId: "G-ND1ZQGF672"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { auth, googleProvider };
