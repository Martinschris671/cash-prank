// This is the final, corrected code for api/signup.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

db.defaults({ trials: [] }).write();

module.exports = (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    // We now get three things from the front-end
    const { email, fingerprint, checkOnly } = req.body;

    if (!fingerprint) {
      return res
        .status(400)
        .json({ message: "Device fingerprint is required." });
    }

    const existingTrial = db
      .get("trials")
      .find({ fingerprint: fingerprint })
      .value();

    if (existingTrial) {
      // FINGERPRINT FOUND: Always deny access for new trials.
      return res
        .status(403)
        .json({
          message: "This device already has an account. Please log in.",
        });
    }

    // --- NEW LOGIC FOR THE INITIAL CHECK ---
    // If the front-end is just checking and the device is new, send a success message
    // without creating a record.
    if (checkOnly) {
      return res
        .status(200)
        .json({ message: "Device is new and eligible for sign-up." });
    }
    // --- END OF NEW LOGIC ---

    // If it's a real sign-up attempt, ensure an email is present.
    if (!email) {
      return res
        .status(400)
        .json({ message: "Email is required for sign-up." });
    }

    // FINGERPRINT IS NEW and this is a REAL SIGN-UP: Approve and save.
    db.get("trials")
      .push({
        email: email,
        fingerprint: fingerprint,
        signup_date: new Date().toISOString(),
      })
      .write();

    return res
      .status(201)
      .json({ message: "Trial approved and user created." });
  } catch (error) {
    console.error("Function Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
