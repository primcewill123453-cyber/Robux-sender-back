const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    maintenanceMode: { type: Boolean, default: false },
    maintenanceMessage: { type: String, default: 'The site is down for maintenance. Check back soon.' },
    requireKey: { type: Boolean, default: true },
    requireDiscordLogin: { type: Boolean, default: false },
    discordInviteUrl: { type: String, default: '' },
    siteTitle: { type: String, default: 'prx scripts' },
    gateSubtitle: { type: String, default: 'You must be a member of our Discord server to claim a code.' },
    promoImageUrl: { type: String, default: '' },
    promoCaption: { type: String, default: '' },
    promoHandle: { type: String, default: '' },
  },
  { timestamps: true },
);

SettingsSchema.statics.getGlobal = async function getGlobal() {
  let doc = await this.findOne({ key: 'global' });
  if (!doc) doc = await this.create({ key: 'global' });
  return doc;
};

module.exports = mongoose.model('Settings', SettingsSchema);
