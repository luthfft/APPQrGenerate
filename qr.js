const express = require("express");
const axios = require("axios");
const archiver = require("archiver");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const API_URL = "https://api.qr-code-generator.com/v1/create?access-token=teg5Ogia7Lm-TaT_9pVNMriHWYNrgxnuY9CHlOupmNyYlmXy52ZWgU9VtY7m66Y7";

// Fungsi untuk memanggil API QR Code
async function generateQRCode(text) {
  try {
    const response = await axios.post(
      API_URL,
      {
        frame_name: "no-frame",
        qr_code_text: text,
        image_format: "PNG",
        qr_code_logo: "scan-me-square",
      },
      { responseType: "arraybuffer" }
    );

    return Buffer.from(response.data);
  } catch (error) {
    console.error(`Gagal membuat QR Code untuk: ${text}`, error.message);
    throw error;
  }
}

// Endpoint untuk menghasilkan QR Code
app.post("/generate-qr", async (req, res) => {
  const { text, count } = req.body;

  if (!text || !count || count <= 0) {
    return res.status(400).send("Input tidak valid. Pastikan 'text' dan 'count' diisi.");
  }

  const zipFilePath = path.join(__dirname, "qrcodes.zip");
  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  output.on("close", () => {
    console.log(`ZIP file created: ${zipFilePath}`);
    res.download(zipFilePath, "qrcodes.zip", (err) => {
      if (err) console.error(err);
      fs.unlinkSync(zipFilePath); // Hapus file ZIP setelah diunduh
    });
  });

  archive.on("error", (err) => {
    console.error(err);
    res.status(500).send("Terjadi kesalahan dalam pembuatan ZIP.");
  });

  archive.pipe(output);

  for (let i = 1; i <= count; i++) {
    const qrText = `${text} ${i}`;
    try {
      const qrBuffer = await generateQRCode(qrText);
      archive.append(qrBuffer, { name: `QRCode_${i}.png` });
    } catch (error) {
      res.status(500).send(`Gagal membuat QR Code untuk: ${qrText}`);
      return;
    }
  }

  archive.finalize();
});

// Halaman form input sederhana
app.get("/", (req, res) => {
  res.send(`
    <html>
      <body>
        <h1>QR Code Generator with API</h1>
        <form action="/generate-qr" method="POST">
          <label for="text">Text:</label><br>
          <input type="text" id="text" name="text" required><br><br>
          <label for="count">Count:</label><br>
          <input type="number" id="count" name="count" min="1" required><br><br>
          <button type="submit">Generate QR Codes</button>
        </form>
      </body>
    </html>
  `);
});

// Menjalankan server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
