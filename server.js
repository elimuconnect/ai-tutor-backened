const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/ask", async (req, res) => {
  const { question, student } = req.body;

  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions", // ✅ Together AI endpoint
      {
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1", // ✅ Use a Together-supported model
        messages: [
          {
            role: "system",
            content: "You are a helpful tutor for Kenyan students. Answer clearly."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.5
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`, // ✅ Set this in Render
          "Content-Type": "application/json"
        }
      }
    );

    const answer = response.data.choices[0].message.content;
    res.json({ answer });
  } catch (err) {
    console.error("❌ Together AI error:", err.response?.data || err.message);
    res.status(500).json({ error: "Error talking to Together AI." });
  }
});

app.get("/", (req, res) => {
  res.send("✅ AI Tutor backend is running. Use POST /ask to get answers.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`AI Tutor is running on port ${PORT}`);
});
