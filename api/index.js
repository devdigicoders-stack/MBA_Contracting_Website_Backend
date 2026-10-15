import app from '../app.js';
import { connectDB } from '../config/db.js';

// Initialize MongoDB connection on serverless execution
let isConnected = false;

async function handler(req, res) {
  if (!isConnected) {
    try {
      await connectDB();
      isConnected = true;
    } catch (err) {
      console.warn('[Vercel Serverless]: DB connection warning:', err.message);
    }
  }
  return app(req, res);
}

export default handler;
