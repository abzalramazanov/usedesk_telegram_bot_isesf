import express from 'express';
import fetch from 'node-fetch';

const app = express();
const PORT = process.env.PORT || 3000;

// Telegram config
const TELEGRAM_BOT_TOKEN = '7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU';
const TELEGRAM_CHAT_ID = '-1002876052091'; // TS - Payda

// UseDesk config
const USEDESK_TOKEN = '12ff4f2af60aee0fe6869cec6e2c8401df7980b7';

// Парсим Telegram updates (для получения ответов)
app.use(express.json());

let sentMessages = {}; // { message_id: ticket_id }

app.get('/send', async (req, res) => {
  const { client_name, ticket_id, status_text } = req.query;

  if (!client_name || !ticket_id || !status_text) {
    return res.status(400).send('Missing required params');
  }

const cleanStatus = status_text.replace(/@\S+\s*/, '').trim();
const text = `👤 ${client_name}\n📝 @joeskar чекни плз, "${cleanStatus}"\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
        link_preview_options: { is_disabled: true }
      })
    });

    const result = await response.json();
    console.log('✅ Отправлено в Telegram:', result);

    if (result.ok) {
      sentMessages[result.result.message_id] = ticket_id;
    }

    res.send('OK');
  } catch (err) {
    console.error('❌ Ошибка при отправке в Telegram:', err);
    res.status(500).send('Ошибка');
  }
});

app.post(`/`, async (req, res) => {
  const update = req.body;
  console.log('📥 Telegram update:\n', JSON.stringify(update, null, 2));

  try {
    const message = update?.message;
    const reply = message?.reply_to_message;

    if (reply && sentMessages[reply.message_id]) {
      const ticket_id = sentMessages[reply.message_id];
      const user_reply = message.text;

      // 1. Закрываем тикет
      await fetch('https://api.usedesk.ru/update/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_token: USEDESK_TOKEN,
          ticket_id,
          status: 1
        })
      });

      // 2. Добавляем приватный коммент
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

      console.log(`💬 Ответ на сообщение бота от: ${message.from.username}`);
      console.log(`💬 Текст: ${user_reply}`);
    }

    res.send('ok');
  } catch (err) {
    console.error('❌ Ошибка при обработке update:', err);
    res.status(500).send('Ошибка');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
