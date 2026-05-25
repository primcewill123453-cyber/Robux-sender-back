const express = require('express');
const bcrypt = require('bcryptjs');
const Key = require('../models/Key');
const Settings = require('../models/Settings');
const { requireAdmin, signAdminToken } = require('../middleware/auth');
const { generateCode, normalizeCode } = require('../util/key-code');

const router = express.Router();

router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || '';
  if (!expectedPass) return res.status(500).json({ error: 'Admin password not configured' });
  if (username !== expectedUser) return res.status(401).json({ error: 'Bad credentials' });
  let ok = password === expectedPass;
  if (!ok && expectedPass.startsWith('$2')) {
    try { ok = await bcrypt.compare(password, expectedPass); } catch { ok = false; }
  }
  if (!ok) return res.status(401).json({ error: 'Bad credentials' });
  return res.json({ token: signAdminToken({ user: username }) });
});

router.get('/me', requireAdmin, (req, res) => res.json({ ok: true, admin: req.admin }));

router.get('/keys', requireAdmin, async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const filter = {};
  if (req.query.q) filter.code = new RegExp(String(req.query.q).toUpperCase(), 'i');
  if (req.query.active === '1') filter.revoked = false;
  const keys = await Key.find(filter).sort({ createdAt: -1 }).limit(limit).lean();
  res.json({ keys });
});

router.post('/keys/generate', requireAdmin, async (req, res) => {
  const count = Math.max(1, Math.min(parseInt(req.body?.count, 10) || 1, 100));
  const rawHours = parseInt(req.body?.durationHours, 10);
  const hours = isNaN(rawHours) ? 24 : rawHours; // 0 = lifetime, no forced minimum
  const note = String(req.body?.note || '');
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({
      code: generateCode(),
      durationMs: hours === 0 ? null : hours * 3600 * 1000,
      expiresAt: hours === 0 ? null : new Date(Date.now() + hours * 3600 * 1000),
      note,
      createdBy: 'admin',
    });
  }
  const created = await Key.insertMany(docs);
  res.json({ created: created.map((k) => ({ code: k.code, durationHours: hours })) });
});

// Delete ALL keys — must be before /keys/:code
router.delete('/keys/all', requireAdmin, async (req, res) => {
  try {
    const result = await Key.deleteMany({});
    res.json({ ok: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/keys/:code', requireAdmin, async (req, res) => {
  await Key.deleteOne({ code: normalizeCode(req.params.code) });
  res.json({ ok: true });
});

router.post('/keys/:code/revoke', requireAdmin, async (req, res) => {
  const key = await Key.findOne({ code: normalizeCode(req.params.code) });
  if (!key) return res.status(404).json({ error: 'not found' });
  key.revoked = true;
  key.revokedReason = String(req.body?.reason || 'admin revoked');
  await key.save();
  res.json({ ok: true });
});

router.post('/keys/:code/extend', requireAdmin, async (req, res) => {
  const key = await Key.findOne({ code: normalizeCode(req.params.code) });
  if (!key) return res.status(404).json({ error: 'not found' });
  const hours = Math.max(0, parseInt(req.body?.hours, 10) || 0);
  const base = key.expiresAt ? key.expiresAt.getTime() : Date.now();
  key.expiresAt = new Date(base + hours * 3600 * 1000);
  await key.save();
  res.json({ ok: true, expiresAt: key.expiresAt });
});

router.post('/keys/:code/unbind', requireAdmin, async (req, res) => {
  const key = await Key.findOne({ code: normalizeCode(req.params.code) });
  if (!key) return res.status(404).json({ error: 'not found' });
  key.boundDeviceId = null;
  key.boundIp = null;
  await key.save();
  res.json({ ok: true });
});

router.get('/settings', requireAdmin, async (req, res) => {
  const settings = await Settings.getGlobal();
  res.json({ settings });
});

router.patch('/settings', requireAdmin, async (req, res) => {
  const settings = await Settings.getGlobal();
  const allowed = ['maintenanceMode','maintenanceMessage','requireKey','requireDiscordLogin','discordInviteUrl','siteTitle','gateSubtitle','promoImageUrl','promoCaption','promoHandle'];
  for (const k of allowed) if (req.body[k] !== undefined) settings[k] = req.body[k];
  await settings.save();
  res.json({ settings });
});

router.get('/stats', requireAdmin, async (req, res) => {
  const [total, active, redeemed, revoked] = await Promise.all([
    Key.countDocuments({}),
    Key.countDocuments({ revoked: false }),
    Key.countDocuments({ boundDeviceId: { $ne: null } }),
    Key.countDocuments({ revoked: true }),
  ]);
  res.json({ total, active, redeemed, revoked });
});

module.exports = router;
