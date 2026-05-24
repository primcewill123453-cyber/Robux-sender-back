const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function block(len = 4) {
  let s = '';
  const bytes = crypto.randomBytes(len);
  for (let i = 0; i < len; i++) s += ALPHABET[bytes[i] % ALPHABET.length];
  return s;
}

function generateCode() {
  return `${block()}-${block()}-${block()}-${block()}`;
}

function normalizeCode(raw) {
  if (!raw) return '';
  return String(raw).trim().toUpperCase().replace(/\s+/g, '');
}

module.exports = { generateCode, normalizeCode };
