import 'dotenv/config';
import express from 'express';
import connectDB from './config/database';
import authRoutes from './routes/auth';

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const start = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Endpoints:`);
    console.log(`   POST /api/auth/register`);
    console.log(`   POST /api/auth/login`);
    console.log(`   POST /api/auth/refresh-token`);
    console.log(`   POST /api/auth/logout`);
    console.log(`   GET  /api/auth/me  (protected)`);
  });
};

start().catch(console.error);
