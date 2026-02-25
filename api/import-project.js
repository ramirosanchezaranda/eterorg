const GH_API = "https://api.github.com";

function b64EncodeUtf8(str) {
return Buffer.from(str, "utf8").toString("base64");
}
function b64DecodeUtf8(str) {
return Buffer.from(str, "base64").toString("utf8");
}

async function ghGetFile({ owner, repo, path, token, branch = "main" }) {
const url = `${GH_API}/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
const res = await fetch(url, {
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json",
},
});
if (!res.ok) throw new Error(`GitHub GET failed: ${res.status}`);
return res.json();
}

async function ghPutFile({ owner, repo, path, token, branch = "main", message, contentBase64, sha }) {
const url = `${GH_API}/repos/${owner}/${repo}/contents/${path}`;
const res = await fetch(url, {
method: "PUT",
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json",
"Content-Type": "application/json",
},
body: JSON.stringify({
message,
content: contentBase64,
branch,
sha,
}),
});

if (!res.ok) {
const txt = await res.text();
throw new Error(`GitHub PUT failed: ${res.status} ${txt}`);
}
return res.json();
}

export default async function handler(req, res) {
try {
if (req.method !== "POST") {
return res.status(405).json({ ok: false, error: "Method not allowed" });
}

// 1) Auth por token
const auth = req.headers.authorization || "";
const expected = `Bearer ${process.env.ETERORG_INGEST_TOKEN}`;
if (auth !== expected) {
return res.status(401).json({ ok: false, error: "Unauthorized" });
}

// 2) Env vars GitHub
const owner = process.env.GITHUB_OWNER; // ramirosanchezaranda
const repo = process.env.GITHUB_REPO; // eterorg
const branch = process.env.GITHUB_BRANCH || "main";
const token = process.env.GITHUB_TOKEN;
const path = "data/inbox-projects.json";

if (!owner || !repo || !token) {
return res.status(500).json({ ok: false, error: "Missing GitHub env vars" });
}

const incoming = req.body || {};
const projectId =
incoming?.meta?.id ||
`${Date.now()}-${(incoming?.project?.slug || incoming?.project_name || "project").toString().replace(/\s+/g, "-").toLowerCase()}`;

// 3) Leer JSON actual
const file = await ghGetFile({ owner, repo, path, token, branch });
const currentText = b64DecodeUtf8(file.content || "");
const db = JSON.parse(currentText || '{"items":[]}');

if (!Array.isArray(db.items)) db.items = [];

// 4) Evitar duplicados
const exists = db.items.some((p) =>
(p?.meta?.id && p.meta.id === projectId) ||
(p?.project?.slug && incoming?.project?.slug && p.project.slug === incoming.project.slug)
);

if (!exists) {
db.items.unshift({
...incoming,
_ingested_at_utc: new Date().toISOString(),
_source: "openclaw",
});
}

// 5) Guardar actualizado
const updatedText = JSON.stringify(db, null, 2);
const updatedB64 = b64EncodeUtf8(updatedText);

await ghPutFile({
owner,
repo,
path,
token,
branch,
sha: file.sha,
contentBase64: updatedB64,
message: `chore: ingest project ${projectId}`,
});

return res.status(200).json({
ok: true,
imported: !exists,
id: projectId,
total: db.items.length,
});
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}
