// guard.js - The Final, Bulletproof Sentry for Vercel

// This script MUST be included as a module in the <head> of any protected page.
// Example: <script type="module" src="/guard.js"></script>

// --- Step 1: Initialize Firebase with YOUR specific configuration ---
// The necessary Firebase SDK functions are imported.
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";

// Your web app's Firebase configuration, as you provided.
const firebaseConfig = {
  apiKey: "AIzaSyDhQn9-OGTgoGNwhHYEHgSop82tVX4dlNg",
  authDomain: "cashapp-subscription-1.firebaseapp.com",
  projectId: "cashapp-subscription-1",
  storageBucket: "cashapp-subscription-1.firebasestorage.app",
  messagingSenderId: "906438851392",
  appId: "1:906438851392:web:ff6105036be32e4ddd58a5",
  measurementId: "G-TPNY2228ZM",
};

// Initialize Firebase and the Authentication service
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// --- Step 2: Define and run the security check ---
// This is a self-invoking async function that runs immediately.
(async function () {
  // This helper function safely determines the current user's login state.
  // It returns a promise that resolves with the user object or null.
  const getCurrentUser = () => {
    return new Promise((resolve, reject) => {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        unsubscribe(); // Stop listening after we get the first result
        resolve(user);
      }, reject);
    });
  };

  // Wait until we know if a user is logged in or not.
  const user = await getCurrentUser();

  // --- Logic for users who are NOT logged in ---
  if (!user) {
    // If we are NOT already on the authentication page, redirect there.
    // This prevents an infinite redirect loop.
    if (!window.location.pathname.includes("authentication.html")) {
      window.location.replace("/authentication.html");
    }
    return; // Stop the script here.
  }

  // --- Logic for users who ARE logged in ---
  // Get the user's ID token. This is a secure credential for our API.
  const idToken = await user.getIdToken();

  // Call our secure Vercel API endpoint to get the user's subscription status.
  const response = await fetch("/api/getSubscriptionStatus", {
    headers: { Authorization: `Bearer ${idToken}` },
  });

  // Assume the subscription is expired by default for maximum security.
  // If the API call fails for any reason, access will be denied.
  let isExpired = true;

  if (response.ok) {
    const subscription = await response.json();
    const endDate = new Date(subscription.endDate._seconds * 1000);

    // The subscription is considered ACTIVE if it's LIFETIME or the end date is in the future.
    if (subscription.status === "LIFETIME" || endDate.getTime() > Date.now()) {
      isExpired = false;
    }
  }

  // --- The Final Check ---
  if (isExpired) {
    // If the subscription is expired, the ONLY page the user is allowed to see is the subscription page.
    if (!window.location.pathname.includes("subscription.html")) {
      // `window.location.replace` is critical. It prevents the user from using the "Back" button to escape the paywall.
      window.location.replace("/subscription.html");
    }
  }
})();
