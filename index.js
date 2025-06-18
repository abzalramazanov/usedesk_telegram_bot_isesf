import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const CHAT_ID = -1002876052091; // TS - Payda

const USEDESK_TOKEN = "12ff4f2af60aee0fe6869cec6e2c8401df7980b7";

// Карта для хранения связи message_id ↔ ticket_id
const messageMap = new Map();

// Отправка сообщения в Telegram
app.get("/send", async (req, res) => {
  const { client_name, ticket_id } = req.query;

  if (!client_name || !ticket_id) {
    return res.status(400).send("Missing client_name or ticket_id");
  }

  const text = `👤 ${client_name}\n📝 Неизвестный статус, @joeskar чекни плз.\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      link_preview_options: { is_disabled: true }
    });

    const message_id = response.data.result.message_id;
    messageMap.set(message_id, ticket_id); // Сохраняем для обработки ответов

    console.log("✅ Отправлено в Telegram:", response.data);
    res.send("OK");
  } catch (error) {
    console.error("❌ Ошибка при отправке в Telegram:", error.response?.data || error.message);
    res.status(500).send("Ошибка при отправке в Telegram");
  }
});

// Вебхук для Telegram (ловим ответы)
app.post("/tg-hook", async (req, res) => {
  const update = req.body;

  console.log("📥 Telegram update:\n", JSON.stringify(update, null, 2));

  const message = update?.message;
  const reply = message?.reply_to_message;
  const text = message?.text;

  if (reply && reply.message_id && text) {
    const original_ticket_id = messageMap.get(reply.message_id);
    const cleanTicketId = original_ticket_id?.toString().replace(/[^0-9]/g, "");

    if (!cleanTicketId) return res.send("ticket_id not found");

    console.log(`💬 Ответ на сообщение бота от: ${message.from.username}`);
    console.log(`💬 Текст: ${text}`);

    try {
      // Обновить статус тикета
      await axios.post("https://api.usedesk.ru/update/ticket", {
        api_token: USEDESK_TOKEN,
        ticket_id: cleanTicketId,
        status: 1
      });

      // Добавить приватный комментарий
      await axios.post("https://api.usedesk.ru/create/comment", {
        api_token: USEDESK_TOKEN,
        ticket_id: cleanTicketId,
        message: text,
        private_comment: true,
        private: "private"
      });

      console.log("✅ UseDesk обновлён");
    } catch (err) {
      console.error("❌ Ошибка при работе с UseDesk API:", err.response?.data || err.message);
    }
  }

  res.send("ok");
});

// Старт сервера
app.listen(3000, () => {
  console.log("🚀 Server running on http://localhost:3000");
});
