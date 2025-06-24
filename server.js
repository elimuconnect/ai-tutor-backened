const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.post("/ask", async (req, res) => {
  const { question } = req.body;

  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI tutor for Kenyan students. Answer clearly and explain step-by-step where needed."
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
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const answer = response.data.choices[0].message.content;
    res.json({ answer });
  } catch (err) {
    const errorDetails = err.response?.data || err.message;
    console.error("❌ Together AI error:", errorDetails);
    res.status(500).json({ error: "Together API error", details: errorDetails });
  }
});

app.get("/", (req, res) => {
  res.send("✅ AI Tutor backend is running. Use POST /ask to get answers.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AI Tutor server running on port ${PORT}`);
});
