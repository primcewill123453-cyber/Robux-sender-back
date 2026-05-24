const jwt = require('jsonwebtoken');

const SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, SECRET());
    if (!decoded || decoded.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.admin = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function requireBot(req, res, next) {
  const provided = req.headers['x-bot-secret'];
  if (!provided || provided !== process.env.BOT_API_SECRET) {
    return res.status(401).json({ error: 'Bad bot secret' });
  }
  return next();
}

function signAdminToken(payload) {
  return jwt.sign({ ...payload, role: 'admin' }, SECRET(), { expiresIn: '7d' });
}

module.exports = { requireAdmin, requireBot, signAdminToken };
