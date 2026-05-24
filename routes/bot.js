const express = require('express');
const Key = require('../models/Key');
const { requireBot } = require('../middleware/auth');
const { generateCode } = require('../util/key-code');

const router = express.Router();

router.post('/generate', requireBot, async (req, res) => {
  try {
    const hours = Math.max(1, parseInt(req.body?.durationHours, 10) || 24);
    const key = await Key.create({
      code: generateCode(),
      durationMs: hours * 3600 * 1000,
      note: String(req.body?.note || ''),
      createdBy: `discord:${req.body?.discordId || 'unknown'}`,
      createdByDiscordId: String(req.body?.discordId || ''),
      createdByDiscordTag: String(req.body?.discordTag || ''),
    });
    res.json({ code: key.code, durationHours: hours, expiresAfterFirstUse: true });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

module.exports = router;
