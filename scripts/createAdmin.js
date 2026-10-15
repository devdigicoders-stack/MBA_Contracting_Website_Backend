/**
 * One-Time Admin Creation Script for Green Gate Advisory
 * Usage:
 *   node scripts/createAdmin.js <username> <email> <password>
 * Example:
 *   node scripts/createAdmin.js admin admin@greengateadvisory.com SecurePass123!
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';

dotenv.config();

async function createAdmin() {
  const args = process.argv.slice(2);
  const username = (args[0] || process.env.INITIAL_ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const email = (args[1] || process.env.INITIAL_ADMIN_EMAIL || 'admin@greengateadvisory.com').trim().toLowerCase();
  const password = args[2] || process.env.INITIAL_ADMIN_PASSWORD || 'Admin@123456';

  if (!username || !email || !password) {
    console.error('Error: Username, email, and password must be provided.');
    console.error('Usage: node scripts/createAdmin.js <username> <email> <password>');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters long.');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('Error: MONGO_URI is not set in server/.env.');
    console.error('Please configure your MongoDB connection string before running this script.');
    process.exit(1);
  }

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(mongoUri);
    console.log(`Connected to MongoDB successfully.`);

    const existing = await Admin.findOne({
      $or: [{ username }, { email }]
    });

    if (existing) {
      console.log(`Admin user "${existing.username}" (${existing.email}) already exists. Updating password...`);
      existing.password = password;
      existing.isActive = true;
      await existing.save();
      console.log(`Password successfully updated for admin: ${existing.username}`);
    } else {
      console.log(`Creating new administrator account: "${username}" (${email})...`);
      const newAdmin = new Admin({
        username,
        email,
        password,
        role: 'superadmin',
        isActive: true
      });
      await newAdmin.save();
      console.log(`Administrator account created successfully!`);
    }

    console.log('----------------------------------------------------');
    console.log(`Login Username: ${username}`);
    console.log(`Login Email:    ${email}`);
    console.log('----------------------------------------------------');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error(`Admin creation failed: ${error.message}`);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

createAdmin();
