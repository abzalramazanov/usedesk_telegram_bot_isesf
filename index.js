import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

const TELEGRAM_BOT_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = -1002876052091; // TS - Payda
const USEDESK_TOKEN = "12ff4f2af60aee0fe6869cec6e2c8401df7980b7";

// Мапа для сопоставления message_id и ticket_id
const messageMap = new Map();

app.get("/send", async (req, res) => {
  const { client_name, ticket_id, status_text } = req.query;

  if (!client_name || !ticket_id) {
    return res.status(400).send("Missing client_name or ticket_id");
  }

  const status = status_text || "Неизвестный статус";
  const text = `👤 ${client_name}
📝 ${status}, @joeskar чекни плз.
🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const response = await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text,
      link_preview_options: { is_disabled: true }
    });

    const message_id = response.data.result.message_id;
    messageMap.set(message_id, ticket_id);
    res.send("✅ Сообщение отправлено");
  } catch (error) {
    res.status(500).send("❌ Ошибка при отправке в Telegram");
  }
});

app.post("/tg-hook", async (req, res) => {
  const msg = req.body?.message;
  const reply = msg?.reply_to_message;
  const text = msg?.text;

  if (!reply || !text) return res.send("ok");

  const ticket_id_raw = messageMap.get(reply.message_id);
  const ticket_id = ticket_id_raw?.toString().replace(/[^0-9]/g, "");

  if (!ticket_id) return res.send("ok");

  try {
    await axios.post("https://api.usedesk.ru/update/ticket", {
      api_token: USEDESK_TOKEN,
      ticket_id,
      status: 1
    });

    await axios.post("https://api.usedesk.ru/create/comment", {
      api_token: USEDESK_TOKEN,
      ticket_id,
      message: text,
      private_comment: true,
      private: "private"
    });

    await axios.post(`${TELEGRAM_API}/sendMessage`, {
      chat_id: CHAT_ID,
      text: "✅ Открыл тикет, спасибо!",
      reply_to_message_id: msg.message_id
    });
  } catch (err) {
    // пропускаем ошибки
  }

  res.send("ok");
});

app.listen(3000, () => {
  console.log("🚀 Server started");
});
