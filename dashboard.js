// dashboard.js - Firebase Authentication

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup, 
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCGNckn0K7w2bqcsdHgZiE74qjQK-OdcYE",
    authDomain: "the-mcs-spot.firebaseapp.com",
    projectId: "the-mcs-spot",
    storageBucket: "the-mcs-spot.firebasestorage.app",
    messagingSenderId: "670130286214",
    appId: "1:670130286214:web:c480f810ac47d2e7d72b07"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// ============================================
// HELPER FUNCTIONS
// ============================================

// Format username (limit to 15 characters)
function formatUserName(user) {
    let name = user.displayName;
    if (!name) {
        name = user.email.split('@')[0];
    }
    if (name.length > 15) {
        name = name.substring(0, 12) + '...';
    }
    return name;
}

// ============================================
// EMAIL/PASSWORD SIGNUP
// ============================================
window.signUp = async function(event) {
    event.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const name = document.getElementById('signupName').value;

    if (!email || !password || !name) {
        alert('Please fill all fields');
        return;
    }

    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user document in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            name: name,
            email: email,
            createdAt: new Date().toISOString()
        });
        
        alert('Account created successfully! Please login.');
        window.location.href = 'Login.html';
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            alert('Email already in use. Please login.');
        } else {
            alert(error.message);
        }
    }
};

// ============================================
// EMAIL/PASSWORD LOGIN
// ============================================
window.login = async function(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        alert('Please fill email and password');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'Home.html';
    } catch (error) {
        alert('Invalid email or password');
    }
};

// ============================================
// GOOGLE SIGN-IN
// ============================================
window.googleSignIn = async function() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        
        // Check if user document already exists
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (!userDoc.exists()) {
            await setDoc(doc(db, "users", user.uid), {
                name: user.displayName || user.email.split('@')[0],
                email: user.email,
                createdAt: new Date().toISOString()
            });
        }
        
        window.location.href = 'Home.html';
    } catch (error) {
        console.error("Google sign-in error:", error);
        
        if (error.code === 'auth/popup-blocked') {
            alert('Popup was blocked by browser. Please allow popups for this site.');
        } else if (error.code === 'auth/popup-closed-by-user') {
            alert('Sign-in popup was closed before completing.');
        } else if (error.code === 'auth/unauthorized-domain') {
            alert('Domain not authorized. Please contact admin.');
        } else {
            alert('Google sign-in failed: ' + error.message);
        }
    }
};

// ============================================
// LOGOUT
// ============================================
window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = 'Login.html';
    } catch (error) {
        console.error("Logout error:", error);
        alert('Error logging out');
    }
};

// ============================================
// GET CURRENT USER
// ============================================
window.getCurrentUser = function() {
    return auth.currentUser;
};

// ============================================
// GET CURRENT USER ID
// ============================================
window.getCurrentUserId = function() {
    return auth.currentUser ? auth.currentUser.uid : null;
};

// ============================================
// CHECK IF USER IS OWNER OF ITEM
// ============================================
window.isOwner = function(itemUserId) {
    const currentUserId = getCurrentUserId();
    return currentUserId && currentUserId === itemUserId;
};

// ============================================
// GET TOTAL REGISTERED USERS COUNT (ACTIVE STUDENTS)
// ============================================
window.getTotalUsersCount = async function() {
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        return usersSnapshot.size;
    } catch (error) {
        console.error("Error getting users count:", error);
        return 0;
    }
};

// ============================================
// AUTH STATE LISTENER (WITH EXISTING USER FIX)
// ============================================
onAuthStateChanged(auth, async (user) => {
    const userNameSpan = document.getElementById('userName');
    if (user) {
        const userName = formatUserName(user);
        if (userNameSpan) userNameSpan.innerText = userName;
        
        // ✅ FIX: Ensure user document exists for existing users
        // Jab bhi user login karega, check karega ki users collection mein document hai ya nahi
        // Agar nahi hai toh create kar dega
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    createdAt: new Date().toISOString()
                });
                console.log("User document created for existing user:", user.uid);
            }
        } catch (error) {
            console.error("Error ensuring user document:", error);
        }
        
    } else {
        const currentPath = window.location.pathname;
        if (!currentPath.includes('Login.html') && !currentPath.includes('Signup.html')) {
            window.location.href = 'Login.html';
        }
    }
});

// ============================================
// EXPORTS
// ============================================
export { auth, db, formatUserName };