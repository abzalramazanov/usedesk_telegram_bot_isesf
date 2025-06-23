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

// 🔁 Пинг для проверки работы
app.get('/ping', (req, res) => {
  const now = new Date().toISOString();
  console.log(`👋 Ping получен в ${now}`);
  res.send(`✅ Сервер проснулся в ${now}`);
});

// 🚀 /send с авто-пингом и логами
app.get('/send', async (req, res) => {
  const { client_name, ticket_id, status_text } = req.query;

  if (!client_name || !ticket_id || !status_text) {
    console.warn('❗️Не хватает параметров в /send');
    return res.status(400).send('Missing required params');
  }

  console.log(`📩 Получен запрос на /send: ${client_name}, тикет ${ticket_id}`);
  res.send('⏳ Пингуем себя и ждём 15 секунд перед отправкой...');

  try {
    console.log('📡 Пингуем /ping локально...');
    await fetch(`http://localhost:${PORT}/ping`);
  } catch (e) {
    console.warn('⚠️ Локальный ping не сработал, продолжаем без него...');
  }

  console.log('⏱ Таймер 15 секунд перед отправкой...');
  setTimeout(async () => {
    console.log('⚙️ Запускаем отправку в Telegram...');

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
      console.log('✅ Результат отправки в Telegram:', result);

      if (result.ok) {
        sentMessages[result.result.message_id] = ticket_id;
      } else {
        console.error('❌ Telegram вернул ошибку:', result.description);
      }
    } catch (err) {
      console.error('❌ Ошибка при fetch в Telegram:', err);
    }
  }, 15000); // 15 секунд пауза
});

// 📥 Ответы из Telegram → UseDesk
app.post('/', async (req, res) => {
  const update = req.body;
  const message = update?.message;
  const reply = message?.reply_to_message;

  if (reply && sentMessages[reply.message_id]) {
    const ticket_id = sentMessages[reply.message_id];
    const user_reply = message.text;

    console.log(`📬 Ответ на сообщение ${reply.message_id}, тикет ${ticket_id}`);

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

      console.log(`💬 Комментарий добавлен, тикет обновлён. Ответ от: @${message.from?.username || 'неизвестно'}`);
    } catch (err) {
      console.error('❌ Ошибка при обработке ответа из Telegram:', err);
    }
  }

  res.send('ok');
});

// 🌐 Старт сервера
app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
