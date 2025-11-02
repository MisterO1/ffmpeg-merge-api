import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import ffmpeg from "fluent-ffmpeg";
import { v4 as uuidv4 } from "uuid";
import cors from "cors";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cors());

// --- MERGE AUDIO + IMAGE ---
app.post("/merge", async (req, res) => {
  try {
    const { audioUrl, imageUrl, duration } = req.body;

    if (!audioUrl || !imageUrl) {
      return res.status(400).json({ error: "audioUrl et imageUrl sont requis" });
    }

    console.log("🔗 Audio URL:", audioUrl);
    console.log("🖼️ Image URL:", imageUrl);

    // 1️⃣ Télécharger l’audio
    const audioPath = `/tmp/${uuidv4()}.mp3`;
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) throw new Error("Impossible de télécharger l'audio");
    const audioBuffer = await audioRes.arrayBuffer();
    fs.writeFileSync(audioPath, Buffer.from(audioBuffer));

    // 2️⃣ Télécharger l’image
    const imagePath = `/tmp/${uuidv4()}.jpg`;
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) throw new Error("Impossible de télécharger l'image");
    const imageBuffer = await imageRes.arrayBuffer();
    fs.writeFileSync(imagePath, Buffer.from(imageBuffer));

    // 3️⃣ Définir le chemin de sortie
    const outputPath = `/tmp/${uuidv4()}.mp4`;

    console.log("🎬 Démarrage du rendu vidéo...");

    // 4️⃣ FFmpeg - fusionner audio + image
    ffmpeg()
      .input(imagePath)
      .loop(duration || 300) // durée max en secondes (par défaut 5 min)
      .input(audioPath)
      .videoCodec("libx264")
      .size("1280x720")
      .fps(30)
      .audioCodec("aac")
      .outputOptions(["-shortest"]) // coupe à la fin du son
      .save(outputPath)
      .on("end", async () => {
        console.log("✅ Vidéo générée :", outputPath);

        // Envoyer le flux de la vidéo
        res.setHeader("Content-Type", "video/mp4");
        const stream = fs.createReadStream(outputPath);
        stream.pipe(res);

        // Supprimer après envoi
        stream.on("end", () => {
          fs.unlinkSync(audioPath);
          fs.unlinkSync(imagePath);
          fs.unlinkSync(outputPath);
        });
      })
      .on("error", (err) => {
        console.error("❌ FFmpeg error:", err.message);
        res.status(500).json({ error: err.message });
      });
  } catch (err) {
    console.error("💥 Erreur serveur:", err);
    res.status(500).json({ error: err.message });
  }
});

// --- Root route ---
app.get("/", (req, res) => {
  res.json({
    message: "🎵 FFmpeg Merge API en ligne",
    usage: "POST /merge { audioUrl, imageUrl, duration }"
  });
});

// --- Port dynamique pour Render ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Serveur actif sur le port ${PORT}`));
