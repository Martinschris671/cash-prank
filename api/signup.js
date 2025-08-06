// This is the full, corrected code for api/signup.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

// The path to the database file in Vercel's temporary directory
const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

// Set default data if the database file doesn't exist
db.defaults({ trials: [] }).write();

module.exports = (req, res) => {
  // We only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { email, fingerprint } = req.body;

    if (!email || !fingerprint) {
      return res
        .status(400)
        .json({ message: "Email and fingerprint are required." });
    }

    // Find a trial where the fingerprint matches the one from the request
    const existingTrial = db
      .get("trials")
      .find({ fingerprint: fingerprint })
      .value();

    if (existingTrial) {
      // FINGERPRINT FOUND: Deny access
      return res.status(403).json({
        message:
          "This device is not eligible for a new free trial. Please sign in.",
      });
    } else {
      // FINGERPRINT NOT FOUND: Approve the trial and add it to the database
      db.get("trials")
        .push({
          email: email,
          fingerprint: fingerprint,
          signup_date: new Date().toISOString(),
        })
        .write(); // Save the changes to the file

      // Send success response
      return res.status(201).json({ message: "Trial approved by server." });
    }
  } catch (error) {
    console.error("Function Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
