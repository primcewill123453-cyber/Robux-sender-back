const express = require('express');

const router = express.Router();

const SCOPE = 'identify guilds';

router.get('/discord/url', (req, res) => {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const redirect = process.env.DISCORD_REDIRECT_URI;
  if (!clientId || !redirect) {
    return res.status(500).json({ error: 'Discord OAuth not configured' });
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirect,
    response_type: 'code',
    scope: SCOPE,
    prompt: 'consent',
  });
  res.json({ url: `https://discord.com/api/oauth2/authorize?${params.toString()}` });
});

router.post('/discord/exchange', async (req, res) => {
  try {
    const code = String(req.body?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Missing code' });
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirect = process.env.DISCORD_REDIRECT_URI;
    const requiredGuildId = process.env.DISCORD_GUILD_ID || '';
    if (!clientId || !clientSecret || !redirect) {
      return res.status(500).json({ error: 'Discord OAuth not configured' });
    }
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirect,
      }).toString(),
    });
    if (!tokenRes.ok) return res.status(400).json({ error: 'Token exchange failed' });
    const tokens = await tokenRes.json();

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    if (!userRes.ok) return res.status(400).json({ error: 'User fetch failed' });
    const user = await userRes.json();

    let inGuild = !requiredGuildId;
    if (requiredGuildId) {
      const guildsRes = await fetch('https://discord.com/api/users/@me/guilds', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (guildsRes.ok) {
        const guilds = await guildsRes.json();
        inGuild = Array.isArray(guilds) && guilds.some((g) => g.id === requiredGuildId);
      }
    }

    return res.json({
      ok: true,
      user: {
        id: user.id,
        username: user.username,
        global_name: user.global_name,
        avatar: user.avatar
          ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
          : null,
      },
      inGuild,
    });
  } catch (e) {
    res.status(500).json({ error: String(e.message || e) });
  }
});

module.exports = router;
