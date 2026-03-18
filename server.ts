import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { EdgeTTS } from "edge-tts-universal";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route for Edge TTS
  app.post("/api/tts/edge", async (req, res) => {
    try {
      const { text, voice, rate, pitch, volume } = req.body;
      
      if (!text || !voice) {
        return res.status(400).json({ error: "Text and voice are required" });
      }

      const tts = new EdgeTTS(text, voice, {
        rate: rate || "+0%",
        pitch: pitch || "+0Hz",
        volume: volume || "+0%"
      });

      const result = await tts.synthesize();
      const audioBuffer = Buffer.from(await result.audio.arrayBuffer());

      res.setHeader("Content-Type", "audio/mpeg");
      res.send(audioBuffer);
    } catch (error: any) {
      console.error("Edge TTS Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate audio" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
