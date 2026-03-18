import express from "express";
import { EdgeTTS } from "edge-tts-universal";
import cors from "cors";

const app = express();

app.use(cors());
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

// For local testing if this file is run directly
if (process.env.NODE_ENV !== "production" && import.meta.url === `file://${process.argv[1]}`) {
    const PORT = 3001;
    app.listen(PORT, () => {
        console.log(`API Server running on http://localhost:${PORT}`);
    });
}

export default app;
