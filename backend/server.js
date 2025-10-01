// ---- RoamWise Backend Server ----
// Lightweight multi-tenant auth + user profiles

import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { migrate } from './db.js';
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----

// CORS - allow frontend on different port (dev mode)
app.use(cors({
  origin: ['http://localhost:8080', 'http://127.0.0.1:8080', 'http://localhost:5173'],
  credentials: true // Allow cookies
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Request logging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ---- Routes ----

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (dev login/logout)
app.use('/api/dev', authRoutes);

// Profile routes (requires auth)
app.use('/api/profile', profileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---- Startup ----

// Run database migrations
try {
  migrate();
} catch (error) {
  console.error('[Server] Migration failed:', error);
  process.exit(1);
}

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 RoamWise Backend running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Login: POST http://localhost:${PORT}/api/dev/login`);
  console.log(`   Profile: GET http://localhost:${PORT}/api/profile\n`);
});
