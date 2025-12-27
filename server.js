const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ====== LIMIT CONTROL START ======

const studentRequests = {};
const GLOBAL_LIMIT = 60;
let globalRequestCount = 0;

setInterval(() => {
  globalRequestCount = 0;
  for (const student in studentRequests) {
    studentRequests[student] = 0;
  }
}, 60 * 1000);

app.use("/ask", (req, res, next) => {
  const student = (req.body && req.body.student) || "unknown"; // ✅ FIXED

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

  next();
});

// Silence GET /ask 404
app.get("/ask", (req, res) => {
  res.status(405).json({ error: "Use POST /ask" });
});

// MAIN AI ROUTE
app.post("/ask", async (req, res) => {
  const { question } = req.body || {};

  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }

  try {
    const response = await axios.post(
      "https://api.together.xyz/v1/chat/completions",
      {
        model: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        messages: [
          { role: "system", content: "You are a helpful Kenyan tutor. Be clear and brief." },
          { role: "user", content: question }
        ],
        temperature: 0.5,
        max_tokens: 500
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 20000 // ✅ prevents hanging
      }
    );

    const answer =
      response.data?.choices?.[0]?.message?.content ||
      "⚠️ AI is currently busy. Please try again.";

    res.json({ answer });

  } catch (err) {
    console.error("❌ AI Error:", err.response?.data || err.message);
    res.status(500).json({ error: "AI failed to respond. Try again later." });
  }
});

// Home route
app.get("/", (req, res) => {
  res.send("✅ AI Tutor backend running. Use POST /ask to talk to the AI.");
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 AI Tutor running on port ${PORT}`);
});
