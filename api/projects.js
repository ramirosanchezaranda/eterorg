export default async function handler(req, res) {
try {
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || "main";
const token = process.env.GITHUB_TOKEN;

const url = `https://api.github.com/repos/${owner}/${repo}/contents/data/inbox-projects.json?ref=${branch}`;

const r = await fetch(url, {
headers: {
Authorization: `Bearer ${token}`,
Accept: "application/vnd.github+json",
},
});

if (!r.ok) {
const t = await r.text();
return res.status(500).json({ ok: false, error: `GitHub read failed: ${r.status} ${t}` });
}

const f = await r.json();
const text = Buffer.from(f.content, "base64").toString("utf8");
const json = JSON.parse(text);

return res.status(200).json({ ok: true, ...json });
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}
