import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

const TELEGRAM_BOT_TOKEN = '7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU';
const TELEGRAM_CHAT_ID = '-1001517811601'; // DevTeam
const TELEGRAM_TOPIC_ID = 8282; // Topic: Support
const USEDESK_TOKEN = '12ff4f2af60aee0fe6869cec6e2c8401df7980b7';

app.use(express.json());

let sentMessages = {}; // { message_id: ticket_id }

function stripHTML(html) {
  return html.replace(/<[^>]*>?/gm, '').trim();
}

// Ping endpoint (на случай, если отдельно понадобится)
app.get('/ping', (req, res) => {
  console.log(`👋 Ping получен в ${new Date().toISOString()}`);
  res.send('✅ Сервер проснулся');
});

// /send — теперь с авто-пингом и задержкой
app.get('/send', async (req, res) => {
  const { client_name, ticket_id, status_text } = req.query;

  if (!client_name || !ticket_id || !status_text) {
    return res.status(400).send('Missing required params');
  }

  res.send('⏳ Пингуем сервер и ждём 5 секунд перед отправкой...');

  // 🟢 Пингуем свой же endpoint
  try {
    await fetch(`http://localhost:${PORT}/ping`);
  } catch (e) {
    console.warn('⚠️ Не удалось сделать ping локально, но продолжаем...');
  }

  setTimeout(async () => {
    const raw = status_text.replace(/@\S+\s*/, '').trim();
    const cleanStatus = stripHTML(raw);

    const text = `👤 ${client_name}\n📝 @joeskar чекни плз, "${cleanStatus}"\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_thread_id: TELEGRAM_TOPIC_ID,
          text,
          link_preview_options: { is_disabled: true }
        })
      });

      const result = await response.json();
      console.log('✅ Отправлено в Telegram:', result);

      if (result.ok) {
        sentMessages[result.result.message_id] = ticket_id;
      }
    } catch (err) {
      console.error('❌ Ошибка при отправке в Telegram:', err);
    }
  }, 20000); // ⏱ Ждём 5 секунд после ping-а
});

// Ответы из Telegram → UseDesk
app.post('/', async (req, res) => {
  const update = req.body;
  const message = update?.message;
  const reply = message?.reply_to_message;

  if (reply && sentMessages[reply.message_id]) {
    const ticket_id = sentMessages[reply.message_id];
    const user_reply = message.text;

    try {
      await fetch('https://api.usedesk.ru/update/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: USEDESK_TOKEN,
          ticket_id,
          status: 1
        })
      });

      await fetch('https://api.usedesk.ru/create/comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: USEDESK_TOKEN,
          ticket_id,
          message: user_reply,
          private_comment: true,
          private: true
        })
      });

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          message_thread_id: TELEGRAM_TOPIC_ID,
          text: "✅ Открыл тикет, спасибо!",
          reply_to_message_id: message.message_id
        })
      });

      console.log(`💬 Ответ на сообщение бота от: ${message.from.username}`);
    } catch (err) {
      console.error('❌ Ошибка в UseDesk:', err);
    }
  }

  res.send('ok');
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
