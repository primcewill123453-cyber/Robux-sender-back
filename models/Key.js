const mongoose = require('mongoose');

const KeySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    note: { type: String, default: '' },
    createdBy: { type: String, default: 'admin' },
    createdByDiscordId: { type: String, default: null },
    createdByDiscordTag: { type: String, default: null },
    durationMs: { type: Number, default: 1000 * 60 * 60 * 24 },
    expiresAt: { type: Date, default: null },
    hardExpiresAt: { type: Date, default: null },
    maxUses: { type: Number, default: 1 },
    usedCount: { type: Number, default: 0 },
    boundDeviceId: { type: String, default: null },
    boundIp: { type: String, default: null },
    boundDiscordId: { type: String, default: null },
    boundDiscordTag: { type: String, default: null },
    revoked: { type: Boolean, default: false },
    revokedReason: { type: String, default: '' },
    firstUsedAt: { type: Date, default: null },
    lastUsedAt: { type: Date, default: null },
    lastIp: { type: String, default: '' },
    lastUserAgent: { type: String, default: '' },
  },
  { timestamps: true },
);

KeySchema.methods.isValid = function isValid() {
  if (this.revoked) return { ok: false, reason: 'revoked' };
  if (this.hardExpiresAt && Date.now() > this.hardExpiresAt.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (this.expiresAt && Date.now() > this.expiresAt.getTime()) {
    return { ok: false, reason: 'expired' };
  }
  if (this.maxUses && this.usedCount >= this.maxUses && !this.boundDeviceId) {
    return { ok: false, reason: 'exhausted' };
  }
  return { ok: true };
};

module.exports = mongoose.model('Key', KeySchema);
