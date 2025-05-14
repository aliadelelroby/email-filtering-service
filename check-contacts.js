const mongoose = require("mongoose");

async function checkContacts() {
  try {
    // Connect to MongoDB
    await mongoose.connect("mongodb://localhost:27017/email-marketing");
    console.log("Connected to MongoDB");

    // Get the contacts collection
    const contactsCollection = mongoose.connection.db.collection("contacts");

    // Count contacts
    const count = await contactsCollection.countDocuments();
    console.log(`Total contacts in database: ${count}`);

    // Get 5 sample contacts
    if (count > 0) {
      const contacts = await contactsCollection.find().limit(5).toArray();
      console.log("Sample contacts:");
      console.log(JSON.stringify(contacts, null, 2));
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log("Connection closed");
  }
}

checkContacts();
