// api/_firebaseAdmin.js
import admin from "firebase-admin";

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      ),
    });
  } catch (error) {
    console.error("Firebase admin initialization error", error.stack);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
