const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== LIMIT CONTROL START ======

// Track per-student & global requests
const studentRequests = {};
const GLOBAL_LIMIT = 60; // Max total requests/min
let globalRequestCount = 0;

// Reset all counts every minute
setInterval(() => {
  globalRequestCount = 0;
  for (const student in studentRequests) {
    studentRequests[student] = 0;
  }
}, 60 * 1000);

// Limit checker middleware
app.use("/ask", (req, res, next) => {
  const student = req.body.student || "unknown";
  globalRequestCount++;

  if (!studentRequests[student]) {
    studentRequests[student] = 0;
  }

  studentRequests[student]++;

  if (studentRequests[student] > 4) {
    return res.status(429).json({
      error: "⏳ You’ve reached your 4 questions per minute limit. Please wait."
    });
  }

  if (globalRequestCount > GLOBAL_LIMIT) {
    return res.status(429).json({
      error: "⚠️ System is busy. Try again in a few seconds."
    });
  }

  next(); // Continue to /ask
});

// ====== LIMIT CONTROL END ======

// Main AI Tutor route
app.post("/ask", async (req, res) => {
  const { question, student } = req.body;

  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model: "mistral-7b-instruct",
        messages: [
          {
            role: "system",
            content:
              "You are a helpful AI tutor for Kenyan students. Keep answers short, accurate, and clear. Use bullet points if listing items."
          },
          {
            role: "user",
            content: question
          }
        ],
        temperature: 0.5,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    let content = response.data.choices[0].message.content;

    // Optional: Format long responses into 2-column structure
    const lines = content.split(/\n|•/).filter(line => line.trim());
    if (lines.length >= 4) {
      const mid = Math.ceil(lines.length / 2);
      const col1 = lines.slice(0, mid).map(line => "• " + line.trim()).join("\n");
      const col2 = lines.slice(mid).map(line => "• " + line.trim()).join("\n");

      content = `${col1}||COLUMN_BREAK||${col2}`;
    }

    res.json({ answer: content });

  } catch (err) {
    console.error("❌ AI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI failed to respond. Try again later." });
  }
});

// Root test route
app.get("/", (req, res) => {
  res.send("✅ AI Tutor backend running. Use POST /ask to talk to AI.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AI Tutor running on port ${PORT}`);
});
