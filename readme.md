---

```markdown
# FFmpeg Merge API

Cette API permet de **fusionner une image (JPG) et un audio (MP3)** pour générer une vidéo MP4 prête pour YouTube.  
Elle est pensée pour être utilisée avec **n8n Cloud** ou tout workflow no-code/HTTP Request.

---

## 🏗️ Installation / Déploiement sur Render

### 1. Créer le repo GitHub
- Contenu minimal :
```

ffmpeg-merge-api/
├── package.json
├── server.js
└── README.md

````

### 2. Contenu des fichiers
#### package.json
```json
{
"name": "ffmpeg-merge-api",
"version": "1.0.0",
"main": "server.js",
"type": "module",
"scripts": {
  "start": "node server.js"
},
"dependencies": {
  "express": "^4.18.2",
  "fluent-ffmpeg": "^2.1.2",
  "node-fetch": "^3.3.2",
  "uuid": "^9.0.1"
}
}
````

#### server.js

```js
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
```

---

### 3. Déployer sur Render

1. Crée un compte Render : [https://render.com](https://render.com)
2. Clique sur **New → Web Service**
3. Connecte ton repo GitHub
4. Réglages :

   * **Runtime** : Node.js
   * **Build Command** : `npm install`
   * **Start Command** : `npm start`
   * **Plan** : Free (gratuit)
5. Clique **Deploy**
6. Render te donnera une URL publique du type :

   ```
   https://ffmpeg-merge-api.onrender.com
   ```

---

## ⚡ 4. Utilisation

### Requête HTTP (POST)

* **URL** : `https://YOUR_RENDER_URL/merge`
* **Headers** : `Content-Type: application/json`
* **Body JSON** :

```json
{
  "audio_url": "https://example.com/track.mp3",
  "image_url": "https://example.com/thumbnail.jpg"
}
```

### Réponse

* **Binary** → vidéo MP4 (tu peux directement récupérer dans n8n)

---

### Exemple avec cURL

```bash
curl -X POST https://YOUR_RENDER_URL/merge \
-H "Content-Type: application/json" \
-d '{
  "audio_url": "https://example.com/track.mp3",
  "image_url": "https://example.com/thumbnail.jpg"
}' --output final_video.mp4
```

---

### Intégration n8n

1. Node **HTTP Request** après audio + image :

   * **Method** : POST
   * **URL** : `https://YOUR_RENDER_URL/merge`
   * **Body** : JSON (audio_url + image_url)
   * **Response Format** : Binary
   * **Binary Property** : `data`
   * **File Name** : `video.mp4`
   * **MIME Type** : `video/mp4`

2. Node **YouTube Upload** :

   * **Video Binary Property** → `data`
   * **Title / Description** → depuis LLM ou Google Sheet

---

### ⚠️ Notes

* La vidéo sera **coupée à la durée de l’audio** (`-shortest`)
* Les fichiers temporaires sont automatiquement supprimés 10 secondes après création
* Compatible pour YouTube 16:9 avec FFmpeg options dans le script

---

### 💡 Astuces

* Pour tester rapidement, utilise des URLs directes pour audio + image.
* Tu peux héberger plusieurs endpoints si tu veux gérer **plusieurs workflows musicaux**.

---