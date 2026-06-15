import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: AI Chatbot Proxy using server-side Gemini API
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      if (!messages || !Array.isArray(messages)) {
        res.status(400).json({ error: "Missing or invalid messages parameter" });
        return;
      }

      // Initialize Google GenAI from server environment
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        res.status(500).json({ error: "Gemini API key is not configured inside the server environment." });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      // Map incoming chat messages to roles of the modern Google GenAI SDK (user / model)
      const formattedContents = messages.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      // Specialized instructions framing our NayePankh branding and values
      const systemInstruction = 
        "You are 'PankhBot', the official friendly AI Chatbot Assistant of NayePankh Foundation, " +
        "a registered NGO in India (NGO Founder: Prashant Shukla). We strive to elevate the " +
        "underprivileged sections of our society through focus areas like Menstrual Hygiene awareness, " +
        "Food Distribution drives, Primary Education for children, and Crowdfunding support for health and welfare. " +
        "Provide warm, cheering, precise, and polite answers to potential volunteers about how they can help. " +
        "Steer them to write and complete the 'Volunteer Registration Form' present on the page! " +
        "Keep your output sweet, encouraging, and under 3-4 sentences. Avoid complex jargon.";

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: formattedContents,
        config: {
          systemInstruction: systemInstruction,
          maxOutputTokens: 350,
          temperature: 0.7,
        }
      });

      const replyText = response.text || "I'm here to help you support NayePankh Foundation! How can I assist you with volunteer registration today?";
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error("Gemini API server route error: ", error);
      res.status(500).json({ error: error.message || "An error occurred during communication with our AI assistant." });
    }
  });

  // Health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite integration middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[PASS] NayePankh Express Server listening on port ${PORT}`);
  });
}

startServer();
