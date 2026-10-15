import dns from 'node:dns';
import mongoose from 'mongoose';

// Fix for Node.js querySrv ECONNREFUSED on local ISP DNS resolvers
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore in environments where setServers is restricted
}

/**
 * Connect to MongoDB database with graceful fallback
 */
export async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!uri || uri.trim() === '' || uri.includes('<username>')) {
    console.warn('\n-------------------------------------------------------------');
    console.warn('[NOTICE] MongoDB URI is not configured in server/.env.');
    console.warn('Backend is running in mock/unconnected mode.');
    console.warn('To connect a database:');
    console.warn('1. Copy server/.env.example to server/.env');
    console.warn('2. Provide a valid MONGODB_URI (e.g. from MongoDB Atlas)');
    console.warn('-------------------------------------------------------------\n');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    return false;
  }
}
