const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Telegram bot config (TS - Payda)
const TELEGRAM_BOT_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_CHAT_ID = "-1002876052091"; // TS - Payda
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

app.get("/send", async (req, res) => {
  const { client_name, ticket_id } = req.query;

  console.log("🔥 Новый запрос от UseDesk:");
  console.log("🔸 Метод:", req.method);
  console.log("🔸 Query:", req.query);
  console.log("🔸 Body:", req.body);

  if (!client_name || !ticket_id) {
    return res.status(400).send("❌ Не хватает параметров client_name или ticket_id");
  }

  const text = `👤 ${client_name}\n📝 Неизвестный статус, @joeskar чекни плз.\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const response = await axios.post(TELEGRAM_API_URL, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text
    });

    console.log("✅ Отправлено в Telegram:", response.data);
    res.status(200).send("✅ Улетело в телегу");
  } catch (error) {
    console.error("❌ Ошибка при отправке:", error.response?.data || error.message);
    res.status(500).send("❌ Ошибка при отправке в Telegram");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("🚀 Сервер прокладка запущен");
});
