// dashboard.js - Firebase Authentication

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword,
    signInWithPopup, 
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    deleteUser
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { 
    getFirestore, 
    collection, 
    getDocs, 
    doc, 
    setDoc, 
    getDoc,
    deleteDoc,
    query,
    where
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
// ADMIN LIST (Add admin emails here)
// ============================================
const adminEmails = [
    "shanshahwebdev@gmail.com",  // Admin email
    // Add more admin emails here if needed
];

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

// Check if current user is admin
window.isAdmin = function() {
    const user = auth.currentUser;
    if (!user) return false;
    return adminEmails.includes(user.email);
};

// Get current user role
window.getUserRole = function() {
    if (window.isAdmin()) return 'admin';
    return 'user';
};

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
            createdAt: new Date().toISOString(),
            role: 'user'
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
                createdAt: new Date().toISOString(),
                role: adminEmails.includes(user.email) ? 'admin' : 'user'
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
// CHECK IF USER CAN DELETE ITEM (Admin OR Owner)
// ============================================
window.canDelete = function(itemUserId) {
    if (window.isAdmin()) return true;
    const currentUserId = getCurrentUserId();
    return currentUserId && currentUserId === itemUserId;
};

// ============================================
// DELETE USER OWN ACCOUNT (Self Delete)
// ============================================
window.deleteMyAccount = async function() {
    const user = auth.currentUser;
    if (!user) {
        alert('You are not logged in');
        return;
    }
    
    const confirmDelete = confirm('⚠️ WARNING: This will permanently delete your account and ALL your data (notes, papers, blogs, events, chat messages). This action cannot be undone. Are you sure?');
    if (!confirmDelete) return;
    
    const userId = user.uid;
    
    try {
        // 1. Delete user's notes
        const notesSnapshot = await getDocs(query(collection(db, "notes"), where("userId", "==", userId)));
        for (const doc of notesSnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        
        // 2. Delete user's past papers
        const papersSnapshot = await getDocs(query(collection(db, "pastpapers"), where("userId", "==", userId)));
        for (const doc of papersSnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        
        // 3. Delete user's blogs
        const blogsSnapshot = await getDocs(query(collection(db, "blogs"), where("userId", "==", userId)));
        for (const doc of blogsSnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        
        // 4. Delete user's events
        const eventsSnapshot = await getDocs(query(collection(db, "events"), where("userId", "==", userId)));
        for (const doc of eventsSnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        
        // 5. Delete user's chat messages
        const chatsSnapshot = await getDocs(query(collection(db, "chats"), where("userId", "==", userId)));
        for (const doc of chatsSnapshot.docs) {
            await deleteDoc(doc.ref);
        }
        
        // 6. Delete user document from Firestore
        await deleteDoc(doc(db, "users", userId));
        
        // 7. Delete user from Firebase Authentication
        await deleteUser(user);
        
        alert('Your account has been permanently deleted.');
        window.location.href = 'Login.html';
    } catch (error) {
        console.error("Error deleting account:", error);
        alert('Error deleting account: ' + error.message);
    }
};

// ============================================
// ADMIN: DELETE ANY USER ACCOUNT
// ============================================
window.adminDeleteUser = async function(userId, userEmail) {
    if (!window.isAdmin()) {
        alert('Only admin can delete user accounts');
        return;
    }
    
    const confirmDelete = confirm(`⚠️ Delete user: ${userEmail}? This will delete ALL their data.`);
    if (!confirmDelete) return;
    
    try {
        // Note: Deleting other users via client SDK is limited
        // For full admin delete, you'd need Cloud Function
        // This will delete user's data from Firestore
        
        const notesSnapshot = await getDocs(query(collection(db, "notes"), where("userId", "==", userId)));
        for (const doc of notesSnapshot.docs) await deleteDoc(doc.ref);
        
        const papersSnapshot = await getDocs(query(collection(db, "pastpapers"), where("userId", "==", userId)));
        for (const doc of papersSnapshot.docs) await deleteDoc(doc.ref);
        
        const blogsSnapshot = await getDocs(query(collection(db, "blogs"), where("userId", "==", userId)));
        for (const doc of blogsSnapshot.docs) await deleteDoc(doc.ref);
        
        const eventsSnapshot = await getDocs(query(collection(db, "events"), where("userId", "==", userId)));
        for (const doc of eventsSnapshot.docs) await deleteDoc(doc.ref);
        
        const chatsSnapshot = await getDocs(query(collection(db, "chats"), where("userId", "==", userId)));
        for (const doc of chatsSnapshot.docs) await deleteDoc(doc.ref);
        
        await deleteDoc(doc(db, "users", userId));
        
        alert(`User ${userEmail} data has been deleted. Note: Authentication account needs to be disabled via Firebase Console.`);
    } catch (error) {
        console.error("Error deleting user data:", error);
        alert('Error deleting user data');
    }
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
// GET ALL USERS (Admin only)
// ============================================
window.getAllUsers = async function() {
    if (!window.isAdmin()) return [];
    try {
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = [];
        usersSnapshot.forEach((doc) => {
            users.push({ id: doc.id, ...doc.data() });
        });
        return users;
    } catch (error) {
        console.error("Error getting users:", error);
        return [];
    }
};

// ============================================
// AUTH STATE LISTENER (WITH EXISTING USER FIX)
// ============================================
onAuthStateChanged(auth, async (user) => {
    const userNameSpan = document.getElementById('userName');
    const adminBadgeSpan = document.getElementById('adminBadge');
    
    if (user) {
        const userName = formatUserName(user);
        if (userNameSpan) userNameSpan.innerText = userName;
        
        // Show admin badge if user is admin
        if (adminBadgeSpan) {
            if (adminEmails.includes(user.email)) {
                adminBadgeSpan.style.display = 'inline-block';
                adminBadgeSpan.innerText = '👑 Admin';
            } else {
                adminBadgeSpan.style.display = 'none';
            }
        }
        
        // Ensure user document exists for existing users
        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (!userDoc.exists()) {
                await setDoc(doc(db, "users", user.uid), {
                    name: user.displayName || user.email.split('@')[0],
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    role: adminEmails.includes(user.email) ? 'admin' : 'user'
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
export { auth, db, formatUserName, adminEmails };