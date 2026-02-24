export default async function handler(req, res) {
if (req.method !== "POST") {
return res.status(405).json({ ok: false, error: "Method not allowed" });
}

const auth = req.headers.authorization || "";
const expected = `Bearer ${process.env.ETERORG_INGEST_TOKEN}`;

if (auth !== expected) {
return res.status(401).json({ ok: false, error: "Unauthorized" });
}

const body = req.body || {};

// Temporal: solo responde OK (luego lo guardamos en DB si quieres)
return res.status(200).json({
ok: true,
project_name: body.project_name || null,
model: body.model || null
});
}
