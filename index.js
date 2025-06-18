const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const TELEGRAM_BOT_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_CHAT_ID = "-1002876052091";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const USEDESK_TOKEN = "12ff4f2af60aee0fe6869cec6e2c8401df7980b7";

// Сохраняем message_id -> ticket_id
const messageMap = new Map();

// 1. Получаем запрос от UseDesk и отправляем в Telegram
app.get("/send", async (req, res) => {
  const { client_name, ticket_id } = req.query;

  console.log("🔥 Новый запрос от UseDesk:");
  console.log("🔸 Query:", req.query);

  if (!client_name || !ticket_id) {
    return res.status(400).send("❌ Не хватает параметров client_name или ticket_id");
  }

  const text = `👤 ${client_name}\n📝 Неизвестный статус, @joeskar чекни плз.\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const tgRes = await axios.post(TELEGRAM_API_URL, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      disable_web_page_preview: true
    });

    const sentMessageId = tgRes.data.result.message_id;
    messageMap.set(sentMessageId, ticket_id);

    console.log("✅ Отправлено в Telegram. message_id:", sentMessageId);
    res.send("✅ Сообщение отправлено в Telegram");
  } catch (err) {
    console.error("❌ Ошибка отправки в Telegram:", err.response?.data || err.message);
    res.status(500).send("❌ Ошибка отправки в Telegram");
  }
});

// 2. Ловим входящие ответы от Telegram и пушим в UseDesk
app.post("/tg-hook", async (req, res) => {
  const update = req.body;
  console.log("📥 Telegram update:", JSON.stringify(update, null, 2));

  const message = update?.message;
  const reply = message?.reply_to_message;
  const text = message?.text;

  if (reply && reply.message_id && text) {
    const ticket_id = messageMap.get(reply.message_id);

    if (ticket_id) {
      try {
        // 2.1. Обновляем статус тикета на "1"
        await axios.post("https://api.usedesk.ru/update/ticket", {
          api_token: USEDESK_TOKEN,
          ticket_id,
          status: 1
        });

        console.log(`🔄 Статус тикета ${ticket_id} обновлён.`);

        // 2.2. Добавляем комментарий
        await axios.post("https://api.usedesk.ru/create/comment", {
          api_token: USEDESK_TOKEN,
          ticket_id,
          message: text,
          private_comment: true,
          private: "private"
        });

        console.log(`📝 Приватный комментарий добавлен в тикет ${ticket_id}`);
      } catch (err) {
        console.error("❌ Ошибка при работе с UseDesk API:", err.response?.data || err.message);
      }
    } else {
      console.log("⚠️ Ответ не на наше сообщение или не нашли ticket_id.");
    }
  }

  res.send("ok");
});

// Старт сервера
app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Сервер запущен и слушает порт 3000");
});
