// This is the full code for the new file: api/redeem.js

const low = require("lowdb");
const FileSync = require("lowdb/adapters/FileSync");
const path = require("path");

const dbPath = path.join("/tmp", "db.json");
const adapter = new FileSync(dbPath);
const db = low(adapter);

// --- The "Master List" of all valid, purchasable codes ---
// This makes it easy to add or remove codes in the future.
const UNLOCK_CODES = {
  "WEEKLY-128": "weekly",
  "MONTHLY-456": "monthly",
  "LIFETIME-789": "lifetime",
};

// Set default data structure if the db file doesn't exist
db.defaults({ trials: [], users: {}, redeemedCodes: {} }).write();

module.exports = async (req, res) => {
  // 1. We only accept POST requests for this secure action.
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  try {
    const { email, code } = req.body;

    // 2. Validate the input from the user.
    if (!email || !code) {
      return res.status(400).json({ message: "Email and Code are required." });
    }

    // 3. Check if the provided code is a real, valid code.
    const planType = UNLOCK_CODES[code];
    if (!planType) {
      return res
        .status(404)
        .json({ message: "Invalid code. Please check and try again." });
    }

    // 4. CRITICAL: Check if this code has already been redeemed by anyone.
    // This is the global, cheat-proof check.
    const existingRedemption = db.get("redeemedCodes").get(code).value();
    if (existingRedemption) {
      return res
        .status(409)
        .json({ message: "This code has already been claimed." }); // 409 Conflict
    }

    // 5. If all checks pass, calculate the new subscription.
    let newEndDate = new Date();
    let newStatus = "ACTIVE";

    if (planType === "weekly") newEndDate.setDate(newEndDate.getDate() + 7);
    else if (planType === "monthly")
      newEndDate.setDate(newEndDate.getDate() + 30);
    else {
      newStatus = "LIFETIME";
      newEndDate = new Date("9999-12-31T23:59:59Z"); // A date far in the future
    }

    const newSubData = {
      status: newStatus,
      endDate: newEndDate.toISOString(),
    };

    // 6. Atomically update both the user's status and the redeemed codes list.
    db.set(`users.${email.replace(/\./g, "_")}`, newSubData) // Update the user's record
      .set(`redeemedCodes.${code}`, {
        // Mark the code as used
        redeemedBy: email,
        redeemedAt: new Date().toISOString(),
      })
      .write(); // Write both changes to the database file at once.

    // 7. Send a success response.
    return res
      .status(200)
      .json({ message: `Successfully activated ${planType} plan!` });
  } catch (error) {
    console.error("Redeem Function Crash:", error);
    return res
      .status(500)
      .json({ message: "An internal server error occurred." });
  }
};
