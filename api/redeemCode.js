// api/redeemCode.js
import { db, auth } from "./_firebaseAdmin.js";
import admin from "firebase-admin";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // 1. Authenticate the user
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const idToken = authorization.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await auth.verifyIdToken(idToken);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token or unauthorized." });
  }
  const uid = decodedToken.uid;

  // 2. Process the code
  const { code } = req.body;
  const normalizedCode = code.trim().toUpperCase();
  const codes = {
    "WEEKLY-123": "weekly",
    "MONTHLY-456": "monthly",
    "LIFETIME-789": "lifetime",
  };
  const planType = codes[normalizedCode];
  if (!planType) {
    return res.status(404).json({ message: "Invalid code." });
  }

  // 3. Check if code has been redeemed
  const redeemedCodeRef = db.collection("redeemedCodes").doc(normalizedCode);
  const redeemedCodeDoc = await redeemedCodeRef.get();
  if (redeemedCodeDoc.exists) {
    return res
      .status(409)
      .json({ message: "This code has already been used." });
  }

  // 4. Update user subscription
  let newEndDate = new Date();
  let newStatus = "ACTIVE";
  if (planType === "weekly") newEndDate.setDate(newEndDate.getDate() + 7);
  else if (planType === "monthly")
    newEndDate.setDate(newEndDate.getDate() + 30);
  else {
    newStatus = "LIFETIME";
    newEndDate = new Date("9999-12-31T23:59:59Z");
  }

  await db
    .collection("users")
    .doc(uid)
    .update({
      "subscription.status": newStatus,
      "subscription.endDate": admin.firestore.Timestamp.fromDate(newEndDate),
    });

  // 5. Mark code as used
  await redeemedCodeRef.set({
    userId: uid,
    redeemedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return res.status(200).json({ status: "success" });
}
