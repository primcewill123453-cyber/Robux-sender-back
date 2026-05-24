require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connectDB } = require('./db');

const robloxRouter = require('./routes/roblox');
const keysRouter = require('./routes/keys');
const adminRouter = require('./routes/admin');
const botRouter = require('./routes/bot');
const authRouter = require('./routes/auth');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '256kb' }));

const allowed = (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowed.includes('*') || allowed.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: false,
}));

app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.use('/api/roblox', robloxRouter);
app.use('/api/keys', keysRouter);
app.use('/api/admin', adminRouter);
app.use('/api/bot', botRouter);
app.use('/api/auth', authRouter);

const PORT = parseInt(process.env.PORT, 10) || 4000;

connectDB()
  .then(() => app.listen(PORT, () => console.log(`[server] listening on ${PORT}`)))
  .catch((err) => { console.error('[server] failed to start', err); process.exit(1); });
