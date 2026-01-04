const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const app = express();

// ================= CONFIG =================
const BOT_TOKEN = '8596224787:AAF3sfvslPI8o37HOIy2JX9CeQV0YD80rxQ';
const bot = new Telegraf(BOT_TOKEN);

const PORT = process.env.PORT || 3000;

// ================= CHANNELS =================

// MAIN CHANNEL (PRIVATE)
const MAIN_CHANNEL_ID = -1002252811755;
const MAIN_CHANNEL_LINK = 'https://t.me/+HV8FCBr6RcA4ZTc6';

// ALL CHANNELS
const allChannels = [
  {
    id: MAIN_CHANNEL_ID,
    title: 'First Channel',
    link: MAIN_CHANNEL_LINK
  },
  {
    id: '@abdurahmonielts',
    title: 'Second Channel',
    link: 'https://t.me/abdurahmonielts'
  }
];

// Referral tekshiruv uchun
const otherChannels = ['@abdurahmonielts'];

// ================= STORAGE =================
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

  // Agar hali hamma kanalga qo‘shilmagan bo‘lsa
  if (!allJoined) {
    allChannels.forEach((ch, i) => {
      if (!joinedStatus[i]) {
        buttons.push([
          Markup.button.url(ch.title, ch.link)
        ]);
      }
    });

    buttons.push([
      Markup.button.callback('Kanallarni tekshirish ✅', 'final_check')
    ]);

    return ctx.reply(
      '📌 Quyidagi kanallarga a’zo bo‘ling:',
      Markup.inlineKeyboard(buttons)
    );
  }

  // Agar hamma kanalga qo‘shilgan bo‘lsa
  buttons.push([
    Markup.button.callback('Referral havolangiz', 'show_referral')
  ]);

  buttons.push([
    Markup.button.callback('Qo‘shilganlar soni', 'check_friends')
  ]);

  return ctx.reply(
    '✅ Siz barcha kanallarga muvaffaqiyatli qo‘shildingiz!',
    Markup.inlineKeyboard(buttons)
  );
}

// ================= START =================
bot.start(async (ctx) => {
  const userId = ctx.from.id;
  const payload = ctx.startPayload;

  if (payload && payload.startsWith('ref')) {
    const invitedBy = Number(payload.slice(3));
    if (!invitations[invitedBy]) invitations[invitedBy] = [];
    if (!invitations[invitedBy].includes(userId)) {
      invitations[invitedBy].push(userId);
    }
    users[userId] = { invitedBy };
  } else {
    users[userId] = {};
  }

  await showButtons(ctx);
});

// ================= ACTIONS =================
bot.action('final_check', async (ctx) => {
  await ctx.answerCbQuery();
  await showButtons(ctx);
});

bot.action('show_referral', async (ctx) => {
  const userId = ctx.from.id;
  const botUsername = ctx.botInfo.username;
  const referralLink = `https://t.me/${botUsername}?start=ref${userId}`;

  await ctx.answerCbQuery();

  await ctx.reply(
    `🎯 *Do‘stlaringizni taklif qiling!*\n\nQuyidagi tugma orqali botga kirish mumkin 👇`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.url('🚀 Botga kirish', referralLink)]
      ])
    }
  );
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
  await ctx.reply(`👥 Barcha kanallarga qo‘shilgan do‘stlaringiz: ${ready}`);
});

// ================= BOT LAUNCH (POLLING) =================
bot.launch();
console.log('🤖 Bot polling orqali ishga tushdi');

// ================= EXPRESS (Render uchun) =================
app.get('/', (req, res) => {
  res.send('🤖 Telegram bot is running');
});

app.listen(PORT, () => {
  console.log(`🌐 Express server ${PORT}-portda ishlayapti`);
});

// ================= GRACEFUL STOP =================
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
