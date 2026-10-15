import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5050;

async function startServer() {
  // Attempt DB connection (handles unconfigured state gracefully)
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[Green Gate Advisory API] Running on http://localhost:${PORT}`);
    console.log(`[Environment]: ${process.env.NODE_ENV || 'development'}`);
    console.log(`[Allowed Client Origin]: ${process.env.CLIENT_URL || 'http://localhost:5173'}`);
  });
}

startServer();
