import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import fetch from "node-fetch";
import multer from "multer";
import { v4 as uuid } from "uuid";

const app = express();
const upload = multer({ dest: "/tmp" });
app.use(express.json());

app.post("/merge", upload.single("image"), async (req, res) => {
  try {
    const audioUrl = req.body.audio_url;
    if (!audioUrl || !req.file) return res.status(400).json({ error: "Missing audio_url or image file" });

    const audioPath = `/tmp/${uuid()}.mp3`;
    const imagePath = req.file.path;
    const outputPath = `/tmp/${uuid()}.mp4`;

    // Télécharger audio depuis l'URL
    const audioResp = await fetch(audioUrl);
    fs.writeFileSync(audioPath, Buffer.from(await audioResp.arrayBuffer()));

    ffmpeg()
      .input(imagePath)
      .input(audioPath)
      .loop(1)
      .outputOptions([
        "-c:v libx264",
        "-tune stillimage",
        "-c:a aac",
        "-b:a 192k",
        "-pix_fmt yuv420p",
        "-shortest",
      ])
      .save(outputPath)
      .on("end", () => {
        res.sendFile(outputPath);
        // Cleanup
        setTimeout(() => {
          fs.unlinkSync(audioPath);
          fs.unlinkSync(imagePath);
          fs.unlinkSync(outputPath);
        }, 10000);
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ FFmpeg merge API running on port ${port}`));
