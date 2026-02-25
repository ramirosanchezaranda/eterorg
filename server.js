import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5173;

app.use(express.json({ limit: "50mb" }));

const distPath = join(__dirname, "dist");

app.use(express.static(distPath));

app.get("*", (req, res) => {
  res.sendFile(join(distPath, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
