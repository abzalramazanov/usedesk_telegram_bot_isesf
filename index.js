import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const CHAT_ID = -1002876052091; // TS - Payda
const USEDESK_TOKEN = "12ff4f2af60aee0fe6869cec6e2c8401df7980b7";

// Для сопоставления message_id и ticket_id
const messageMap = new Map();

app.get("/send", async (req, res) => {
  const { client_name, ticket_id } = req.query;

  if (!client_name || !ticket_id) {
    return res.status(400).send("Missing client_name or ticket_id");
  }

  const text = `👤 ${client_name}\n📝 Неизвестный статус, @joeskar чекни плз.\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const tgRes = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      link_preview_options: { is_disabled: true }
    });

    const message_id = tgRes.data.result.message_id;
    messageMap.set(message_id, ticket_id);

    console.log("✅ Отправлено в Telegram:", tgRes.data);
    res.send("OK");
  } catch (err) {
    console.error("❌ Ошибка при отправке в Telegram:", err?.response?.data || err.message);
    res.status(500).send("Telegram error");
  }
});

app.post("/tg-hook", async (req, res) => {
  const update = req.body;
  const msg = update.message;
  if (!msg) return res.send("No message");

  const reply = msg.reply_to_message;
  const text = msg.text;

  console.log("📥 Telegram update:", JSON.stringify(update, null, 2));

  if (reply) {
    const ticket_id = messageMap.get(reply.message_id);
    const cleanTicketId = ticket_id?.toString().replace(/[^0-9]/g, "");

    if (cleanTicketId) {
      try {
        await axios.post("https://api.usedesk.ru/update/ticket", {
          api_token: USEDESK_TOKEN,
          ticket_id: cleanTicketId,
          status: 1
        });

        await axios.post("https://api.usedesk.ru/create/comment", {
          api_token: USEDESK_TOKEN,
          ticket_id: cleanTicketId,
          message: text,
          private_comment: true,
          private: "private"
        });

        console.log(`💬 Ответ на сообщение бота от: ${msg.from.username}`);
        console.log(`💬 Текст: ${text}`);

        // ➕ Ответить в телегу на это сообщение
        await axios.post(`${TELEGRAM_API}/sendMessage`, {
          chat_id: CHAT_ID,
          text: "✅ Открыл тикет, спасибо!",
          reply_to_message_id: msg.message_id
        });

      } catch (err) {
        console.error("❌ Ошибка при работе с UseDesk API:", err?.response?.data || err.message);
      }
    }
  }

  res.send("ok");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
