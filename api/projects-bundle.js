function uid() {
return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function projectToMarkdownDoc(p) {
const title = p?.project?.title || p?.project_name || "Proyecto";
const model = p?.meta?.model || p?.model || "-";
const pain = p?.project?.pain || p?.pain_point || "-";
const promise = p?.project?.promise_7_14_days || "-";

return `# ${title}

- Modelo: ${model}
- Dolor: ${pain}
- Promesa: ${promise}

## JSON PRD
\`\`\`json
${JSON.stringify(p, null, 2)}
\`\`\`
`;
}

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
const items = Array.isArray(json.items) ? json.items : [];

// Agrupar por modelo
const byModel = new Map();
for (const p of items) {
const model = p?.meta?.model || p?.model || "sin-modelo";
if (!byModel.has(model)) byModel.set(model, []);
byModel.get(model).push(p);
}

const docs = [];
for (const [model, arr] of byModel.entries()) {
const folderId = uid();
const folder = {
id: folderId,
name: model,
type: "folder",
children: [],
};

for (const p of arr) {
const title = p?.project?.title || p?.project_name || "Proyecto";
const slug = p?.project?.slug || title.toLowerCase().replace(/\s+/g, "-");
const docId = uid();

folder.children.push({
id: docId,
name: `PRD - ${title}`,
type: "doc",
icon: "📄",
cover: null,
history: [],
relatedTasks: [],
createdAt: p?._ingested_at_utc || new Date().toISOString(),
content: projectToMarkdownDoc(p),
});

folder.children.push({
id: uid(),
name: `JSON - ${slug}`,
type: "doc",
icon: "🧩",
cover: null,
history: [],
relatedTasks: [],
createdAt: p?._ingested_at_utc || new Date().toISOString(),
content: "```json\n" + JSON.stringify(p, null, 2) + "\n```",
});
}

docs.push(folder);
}

return res.status(200).json({
version: 1,
exportedAt: new Date().toISOString(),
tasks: [],
docs,
settings: {},
});
} catch (e) {
return res.status(500).json({ ok: false, error: e.message });
}
}
