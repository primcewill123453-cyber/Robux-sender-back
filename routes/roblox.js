const express = require('express');

const router = express.Router();

router.get('/search', async (req, res) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const limit = String(req.query.limit || '10');
    if (!keyword) return res.json({ data: [] });
    const r = await fetch(
      `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(keyword)}&limit=${encodeURIComponent(limit)}`,
      { headers: { 'User-Agent': 'robux-page-backend/1.0', Accept: 'application/json' } },
    );
    res.status(r.status).type('application/json').send(await r.text());
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

router.post('/usernames', async (req, res) => {
  try {
    const r = await fetch('https://users.roblox.com/v1/usernames/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'robux-page-backend/1.0', Accept: 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    res.status(r.status).type('application/json').send(await r.text());
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

router.get('/avatars', async (req, res) => {
  try {
    const ids = String(req.query.ids || '');
    const size = String(req.query.size || '150x150');
    const r = await fetch(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${ids}&size=${size}&format=Png&isCircular=true`,
      { headers: { 'User-Agent': 'robux-page-backend/1.0', Accept: 'application/json' } },
    );
    res.status(r.status).type('application/json').send(await r.text());
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

module.exports = router;
