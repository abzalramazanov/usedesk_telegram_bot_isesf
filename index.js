const express = require("express");
const axios = require("axios");
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Telegram config: TS - Payda
const TELEGRAM_BOT_TOKEN = "7321576020:AAEt-579ibyc5X1BOEQOymyLQ4Sil4pR1tU";
const TELEGRAM_CHAT_ID = "-1002876052091";
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

// 1. UseDesk → /send → Telegram
app.get("/send", async (req, res) => {
  const { client_name, ticket_id } = req.query;

  console.log("🔥 Новый запрос от UseDesk:");
  console.log("🔸 Query:", req.query);

  if (!client_name || !ticket_id) {
    return res.status(400).send("❌ Не хватает параметров client_name или ticket_id");
  }

  const text = `👤 ${client_name}\n📝 Неизвестный статус, @joeskar чекни плз.\n🔗 https://secure.usedesk.ru/tickets/${ticket_id}`;

  try {
    const response = await axios.post(TELEGRAM_API_URL, {
      chat_id: TELEGRAM_CHAT_ID,
      text: text,
      disable_web_page_preview: true
    });

    console.log("✅ Отправлено в Telegram:", response.data);
    res.status(200).send("✅ Улетело в TS - Payda");
  } catch (error) {
    console.error("❌ Ошибка при отправке в Telegram:", error.response?.data || error.message);
    res.status(500).send("❌ Ошибка при отправке в Telegram");
  }
});

// 2. Telegram Webhook → /tg-hook → логируем входящие
app.post("/tg-hook", (req, res) => {
  const update = req.body;
  console.log("📥 Telegram update:");
  console.dir(update, { depth: null });

  if (update.message?.reply_to_message) {
    console.log("💬 Ответ на сообщение бота от:", update.message.from?.username || update.message.from?.first_name);
    console.log("💬 Текст:", update.message.text);
  }

  if (update.message?.text?.includes("@payda_ifesf_bot")) {
    console.log("📌 Бота упомянули:", update.message.text);
  }

  res.send("ok");
});

// 3. Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер слушает на порту ${PORT}`);
});
