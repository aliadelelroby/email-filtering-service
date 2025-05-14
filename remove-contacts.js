const mongoose = require("mongoose");

/**
 * Script to remove all contacts from the MongoDB database
 */
async function removeAllContacts() {
  try {
    // Connect to MongoDB
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/email-marketing";
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    // Get the contacts collection
    const contactsCollection = mongoose.connection.db.collection("contacts");

    // Count contacts before deletion
    const countBefore = await contactsCollection.countDocuments();
    console.log(`Total contacts before deletion: ${countBefore}`);

    // Delete all contacts
    const result = await contactsCollection.deleteMany({});

    console.log(`Successfully deleted ${result.deletedCount} contacts`);
  } catch (error) {
    console.error("Error removing contacts:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");
  }
}

// Execute the function
removeAllContacts();
