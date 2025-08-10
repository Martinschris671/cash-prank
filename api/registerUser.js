// api/registerUser.js
import { db, auth } from "./_firebaseAdmin.js";
import admin from "firebase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { email, password, deviceId } = req.body;

  if (!deviceId || !email || !password) {
    return res.status(400).json({ error: "Missing required fields." });
  }

  // 1. Check if deviceId is already in use
  const deviceSnapshot = await db
    .collection("users")
    .where("deviceId", "==", deviceId)
    .get();
  if (!deviceSnapshot.empty) {
    return res
      .status(409)
      .json({ message: "This device is already associated with an account." });
  }

  // 2. Create the user in Firebase Authentication
  try {
    const userRecord = await auth.createUser({ email, password });

    // 3. Create the user document in Firestore
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 2);

    await db
      .collection("users")
      .doc(userRecord.uid)
      .set({
        email: userRecord.email,
        deviceId: deviceId,
        subscription: {
          status: "TRIAL",
          endDate: admin.firestore.Timestamp.fromDate(trialEndDate),
        },
      });

    return res.status(201).json({ uid: userRecord.uid });
  } catch (error) {
    if (error.code === "auth/email-already-exists") {
      return res.status(409).json({ message: "This email is already in use." });
    }
    console.error(error);
    return res.status(500).json({ message: "An internal error occurred." });
  }
}
