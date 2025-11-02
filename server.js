import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fs from "fs";
import fetch from "node-fetch";
import { v4 as uuid } from "uuid";

const app = express();
app.use(express.json());

app.post("/merge", async (req, res) => {
  try {
    const { audio_url, image_url } = req.body;
    if (!audio_url || !image_url)
      return res.status(400).json({ error: "Missing audio_url or image_url" });

    const id = uuid();
    const audioPath = `/tmp/${id}.mp3`;
    const imagePath = `/tmp/${id}.jpg`;
    const outputPath = `/tmp/${id}.mp4`;

    const audioResp = await fetch(audio_url);
    fs.writeFileSync(audioPath, Buffer.from(await audioResp.arrayBuffer()));

    const imageResp = await fetch(image_url);
    fs.writeFileSync(imagePath, Buffer.from(await imageResp.arrayBuffer()));

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
app.listen(port, () => console.log(`✅ API active sur port ${port}`));
