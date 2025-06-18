const express = require("express");
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.all("*", (req, res) => {
  console.log("🔥 Новый запрос от UseDesk:");
  console.log("🔸 Метод:", req.method);
  console.log("🔸 Query:", req.query);
  console.log("🔸 Body:", req.body);
  res.status(200).send("✅ Получено");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Сервер слушает на порту ${PORT}`);
});
