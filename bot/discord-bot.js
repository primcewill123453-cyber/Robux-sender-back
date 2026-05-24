require('dotenv').config();
const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const BACKEND_URL = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
const BOT_SECRET = process.env.BOT_API_SECRET || '';

if (!TOKEN) { console.error('DISCORD_BOT_TOKEN is required.'); process.exit(1); }

const commands = [
  new SlashCommandBuilder()
    .setName('key')
    .setDescription('Generate an access key for the site')
    .addIntegerOption((o) =>
      o.setName('duration').setDescription('Hours the key lasts after first use (default 24)').setMinValue(1).setMaxValue(720))
    .toJSON(),
];

async function registerCommands(clientId) {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(clientId, GUILD_ID), { body: commands });
    console.log('[bot] registered guild commands');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('[bot] registered global commands');
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  console.log(`[bot] logged in as ${client.user.tag}`);
  try { await registerCommands(client.user.id); }
  catch (e) { console.error('[bot] failed to register commands', e); }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== 'key') return;
  try {
    await interaction.deferReply({ ephemeral: true });
    const duration = interaction.options.getInteger('duration') ?? 24;
    const r = await fetch(`${BACKEND_URL}/api/bot/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': BOT_SECRET },
      body: JSON.stringify({
        discordId: interaction.user.id,
        discordTag: interaction.user.tag,
        durationHours: duration,
      }),
    });
    if (!r.ok) { await interaction.editReply(`Could not generate key (status ${r.status}).`); return; }
    const data = await r.json();
    const embed = new EmbedBuilder()
      .setTitle('Your access code')
      .setDescription(`\`${data.code}\``)
      .addFields(
        { name: 'Duration', value: `${data.durationHours} hours after first use`, inline: true },
        { name: 'Note', value: 'First device + IP to use it locks the key.', inline: true },
      )
      .setColor(0x8b5cf6);
    await interaction.editReply({ embeds: [embed] });
  } catch (err) {
    console.error('[bot] error', err);
    if (interaction.deferred || interaction.replied) await interaction.editReply('Something went wrong.');
    else await interaction.reply({ content: 'Something went wrong.', ephemeral: true });
  }
});

client.login(TOKEN);
