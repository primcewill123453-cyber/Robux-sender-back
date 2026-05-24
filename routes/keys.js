const express = require('express');
const Key = require('../models/Key');
const Settings = require('../models/Settings');
const { normalizeCode } = require('../util/key-code');

const router = express.Router();

function clientIp(req) {
  const fwd = (req.headers['x-forwarded-for'] || '').toString().split(',')[0].trim();
  return fwd || req.ip || '';
}

router.post('/redeem', async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const deviceId = String(req.body?.deviceId || '').trim();
    const discordId = String(req.body?.discordId || '').trim();
    const discordTag = String(req.body?.discordTag || '').trim();
    if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });
    if (!deviceId) return res.status(400).json({ ok: false, error: 'Missing device id' });

    const settings = await Settings.getGlobal();
    if (settings.maintenanceMode) {
      return res.status(503).json({ ok: false, error: 'maintenance', message: settings.maintenanceMessage });
    }
    if (!settings.requireKey) return res.json({ ok: true, expiresAt: null, bypass: true });

    const key = await Key.findOne({ code });
    if (!key) return res.status(404).json({ ok: false, error: 'invalid' });

    const check = key.isValid();
    if (!check.ok) return res.status(403).json({ ok: false, error: check.reason });

    const ip = clientIp(req);

    if (!key.boundDeviceId) {
      key.boundDeviceId = deviceId;
      key.boundIp = ip;
      if (discordId) key.boundDiscordId = discordId;
      if (discordTag) key.boundDiscordTag = discordTag;
      key.firstUsedAt = new Date();
      if (key.durationMs && !key.expiresAt) {
        key.expiresAt = new Date(Date.now() + key.durationMs);
      }
      key.usedCount += 1;
    } else {
      if (key.boundDeviceId !== deviceId) {
        return res.status(403).json({ ok: false, error: 'wrong_device' });
      }
      if (key.boundIp && ip && key.boundIp !== ip) {
        return res.status(403).json({ ok: false, error: 'wrong_ip' });
      }
      if (key.boundDiscordId && discordId && key.boundDiscordId !== discordId) {
        return res.status(403).json({ ok: false, error: 'wrong_discord' });
      }
    }

    key.lastUsedAt = new Date();
    key.lastIp = ip;
    key.lastUserAgent = String(req.headers['user-agent'] || '').slice(0, 300);
    await key.save();

    return res.json({ ok: true, expiresAt: key.expiresAt, hardExpiresAt: key.hardExpiresAt });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

router.post('/check', async (req, res) => {
  try {
    const code = normalizeCode(req.body?.code);
    const deviceId = String(req.body?.deviceId || '').trim();
    if (!code) return res.status(400).json({ ok: false, error: 'Missing code' });

    const settings = await Settings.getGlobal();
    if (settings.maintenanceMode) {
      return res.status(503).json({ ok: false, error: 'maintenance', message: settings.maintenanceMessage });
    }

    const key = await Key.findOne({ code });
    if (!key) return res.status(404).json({ ok: false, error: 'invalid' });
    const check = key.isValid();
    if (!check.ok) return res.status(403).json({ ok: false, error: check.reason });
    if (key.boundDeviceId && deviceId && key.boundDeviceId !== deviceId) {
      return res.status(403).json({ ok: false, error: 'wrong_device' });
    }
    const ip = clientIp(req);
    if (key.boundIp && ip && key.boundIp !== ip) {
      return res.status(403).json({ ok: false, error: 'wrong_ip' });
    }

    return res.json({ ok: true, expiresAt: key.expiresAt, hardExpiresAt: key.hardExpiresAt });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e.message || e) });
  }
});

router.get('/settings', async (req, res) => {
  const settings = await Settings.getGlobal();
  res.json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage: settings.maintenanceMessage,
    requireKey: settings.requireKey,
    requireDiscordLogin: settings.requireDiscordLogin,
    discordInviteUrl: settings.discordInviteUrl,
    siteTitle: settings.siteTitle,
    gateSubtitle: settings.gateSubtitle,
    promoImageUrl: settings.promoImageUrl,
    promoCaption: settings.promoCaption,
    promoHandle: settings.promoHandle,
  });
});

module.exports = router;
