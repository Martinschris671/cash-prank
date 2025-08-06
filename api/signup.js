// We'll use 'lowdb', a simple file-based database perfect for Vercel's environment.
const { Low } = require("lowdb");
const { JSONFile } = require("lowdb/node");
const path = require("path");

// Vercel's serverless functions have a temporary writable directory at /tmp.
// This is where we will store our simple database file of fingerprints.
const dbPath = path.join("/tmp", "db.json");
const adapter = new JSONFile(dbPath);
const db = new Low(adapter, { trials: [] }); // Default data: an empty array of trials

// This is the main function Vercel will run.
module.exports = async (req, res) => {
  // We only accept POST requests for this action.
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

    // Load the database from the file into memory.
    await db.read();

    // Check if a trial with this fingerprint already exists.
    const existingTrial = db.data.trials.find(
      (trial) => trial.fingerprint === fingerprint
    );

    if (existingTrial) {
      // FINGERPRINT EXISTS: Deny the request with a "Forbidden" status.
      return res
        .status(403)
        .json({
          message:
            "This device is not eligible for a new free trial. Please sign in.",
        });
    } else {
      // FINGERPRINT IS NEW: Add it to our database array.
      db.data.trials.push({
        email: email,
        fingerprint: fingerprint,
        signup_date: new Date().toISOString(),
      });

      // Save the updated array back to the file.
      await db.write();

      // Send a "Created" success response.
      return res
        .status(201)
        .json({ message: "Free trial successfully started!" });
    }
  } catch (error) {
    console.error("Internal Server Error:", error);
    return res
      .status(500)
      .json({ message: "An error occurred on the server." });
  }
};
