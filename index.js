const { Telegraf, Markup } = require('telegraf');
const express = require('express');

// ================= CONFIG =================
// Tokenni Render Environment Variables'ga BOT_TOKEN nomi bilan qo'shing
const BOT_TOKEN = process.env.BOT_TOKEN || '8596224787:AAF3sfvslPI8o37HOIy2JX9CeQV0YD80rxQ';
const bot = new Telegraf(BOT_TOKEN);

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.RENDER_EXTERNAL_URL; // Render avtomatik taqdim etadi

// ================= CHANNELS =================
const MAIN_CHANNEL_ID = -1002252811755;
const MAIN_CHANNEL_LINK = 'https://t.me/+HV8FCBr6RcA4ZTc6';

const allChannels = [
  { id: MAIN_CHANNEL_ID, title: 'First Channel', link: MAIN_CHANNEL_LINK },
  { id: '@abdurahmonielts', title: 'Second Channel', link: 'https://t.me/abdurahmonielts' }
];

const otherChannels = ['@abdurahmonielts'];

// ================= STORAGE (Vaqtinchalik) =================
// Eslatma: Render har safar restart bo'lganda bu ma'lumotlar o'chib ketadi.
// Doimiy saqlash uchun MongoDB yoki PostgreSQL ulanishi kerak.
const users = {};
const invitations = {};

// ================= FUNCTIONS =================
async function checkMembership(userId, channel) {
  try {
    const member = await bot.telegram.getChatMember(channel, userId);
    return ['member', 'administrator', 'creator'].includes(member.status);
  } catch (e) {
    return false;
  }
}

async function showButtons(ctx) {
  const userId = ctx.from.id;
  const buttons = [];

  const joinedStatus = await Promise.all(
    allChannels.map(ch => checkMembership(userId, ch.id))
  );

  const allJoined = joinedStatus.every(Boolean);

  if (!allJoined) {
    allChannels.forEach((ch, i) => {
      if (!joinedStatus[i]) {
        buttons.push([Markup.button.url(ch.title, ch.link)]);
      }
    });

    buttons.push([Markup.button.callback('Kanallarni tekshirish ✅', 'final_check')]);

    return ctx.reply('📌 Botdan foydalanish uchun quyidagi kanallarga a’zo bo‘ling:', Markup.inlineKeyboard(buttons));
  }

  buttons.push([Markup.button.callback('Referral havolangiz 🔗', 'show_referral')]);
  buttons.push([Markup.button.callback('Qo‘shilganlar soni 👥', 'check_friends')]);

  return ctx.reply('✅ Siz barcha kanallarga muvaffaqiyatli qo‘shildingiz!', Markup.inlineKeyboard(buttons));
}

// ================= BOT LOGIC =================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const payload = ctx.startPayload;

  if (payload && payload.startsWith('ref')) {
    const invitedBy = Number(payload.slice(3));
    if (invitedBy !== userId) { // O'zini o'zi taklif qilmasligi uchun
      if (!invitations[invitedBy]) invitations[invitedBy] = [];
      if (!invitations[invitedBy].includes(userId)) {
        invitations[invitedBy].push(userId);
      }
    }
  }
  await showButtons(ctx);
});

bot.action('final_check', async (ctx) => {
  await ctx.answerCbQuery('Tekshirilmoqda...');
  await showButtons(ctx);
});

bot.action('show_referral', async (ctx) => {
  const userId = ctx.from.id;
  const botUsername = ctx.botInfo.username;
  const referralLink = `https://t.me/${botUsername}?start=ref${userId}`;

  await ctx.answerCbQuery();
  await ctx.reply(`🎯 *Do‘stlaringizni taklif qiling!*\n\nSizning referral havolangiz:\n${referralLink}`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([[Markup.button.url('🚀 Botga kirish', referralLink)]])
  });
});

bot.action('check_friends', async (ctx) => {
  const userId = ctx.from.id;
  const invited = invitations[userId] || [];
  let ready = 0;

  for (const fId of invited) {
    let ok = true;
    for (const ch of otherChannels) {
      if (!(await checkMembership(fId, ch))) {
        ok = false;
        break;
      }
    }
    if (ok) ready++;
  }

  await ctx.answerCbQuery();
  await ctx.reply(`👥 Barcha kanallarga qo‘shilgan do‘stlaringiz soni: ${ready}`);
});

// ================= SERVER & WEBHOOK =================

// Render botni "tirik" deb hisoblashi uchun asosiy sahifa
app.get('/', (req, res) => {
  res.send('🤖 Bot is running 24/7 with Webhook!');
});

// Webhook yoki Pollingni tanlash
if (DOMAIN) {
  // Render'da ishlayotganda (Webhook)
  app.use(bot.webhookCallback(`/bot${BOT_TOKEN}`));
  bot.telegram.setWebhook(`${DOMAIN}/bot${BOT_TOKEN}`);
  console.log(`🚀 Webhook o'rnatildi: ${DOMAIN}`);
} else {
  // Lokal kompyuterda (Polling)
  bot.launch();
  console.log('🤖 Polling ishga tushdi (Local)');
}

app.listen(PORT, () => {
  console.log(`🌐 Express server ${PORT}-portda ishlayapti`);
});

// To'g'ri o'chirish (Graceful shutdown)
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));