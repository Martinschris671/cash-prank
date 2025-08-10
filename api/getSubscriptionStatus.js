// api/getSubscriptionStatus.js
import { db, auth } from "./_firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { authorization } = req.headers;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const idToken = authorization.split("Bearer ")[1];

  try {
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ message: "User not found." });
    }

    return res.status(200).json(userDoc.data().subscription);
  } catch (error) {
    return res.status(401).json({ message: "Invalid token or unauthorized." });
  }
}
