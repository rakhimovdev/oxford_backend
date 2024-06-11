const TelegramBot = require("node-telegram-bot-api")
const express = require("express")
const cors = require("cors")
const app = express()
require("dotenv").config()

app.use(express.json())
app.use(express.urlencoded())
app.use(cors())

const bot = new TelegramBot(process.env.BOTTOKEN)

app.post("/telegram", (req, res) => {
  const { name, lastname, number } = req.body
  console.log(name)
  console.log(lastname)
  console.log(number)

  const chatid = process.env.CHATID
  const telegramMessage = `Yangi ma'lumot:\nIsm: ${name} \nFamiliya: ${lastname} \nRaqam: ${number}`;

  bot.sendMessage(chatid, telegramMessage)
    .then(res => console.log("jo'natildi"))
    .catch(error => console.log("error"))
})





let PORT = 5000
app.listen(PORT, () => {
  console.log(`server post ${PORT}da eshitilmoqda`)
})