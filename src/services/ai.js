const GROQ_KEY = localStorage.getItem("groqKey") || "";

export function setGroqKey(key) {
  localStorage.setItem("groqKey", key.trim());
}

export function getGroqKey() {
  return localStorage.getItem("groqKey") || "";
}

export async function genTasks(content, name) {
  const key = getGroqKey();
  if (!key) return "NO_KEY";
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" },
        messages: [{
          role: "system",
          content: "You extract tasks from documents. Respond ONLY with valid JSON: {\"tasks\":[{\"name\":\"max 50 chars\",\"minutes\":number,\"priority\":\"P0\"|\"P1\"|\"P2\"|\"P3\",\"tags\":[\"tag\"]}]}. Extract 3-15 tasks.",
        }, {
          role: "user",
          content: `Title: "${name}"\n\n${content}`,
        }],
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      console.error("Groq API error:", r.status, err);
      return null;
    }
    const d = await r.json();
    const text = (d.choices?.[0]?.message?.content || "").trim();
    const parsed = JSON.parse(text);
    const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed.tasks) ? parsed.tasks : null;
    if (!arr) return null;
    return arr.map((t) => ({
      name: String(t.name || "Task").slice(0, 50),
      minutes: Math.max(1, parseInt(t.minutes) || 5),
      priority: ["P0", "P1", "P2", "P3"].includes(t.priority) ? t.priority : "P2",
      tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
    }));
  } catch {
    return null;
  }
}

/* ═══════ AI WRITING ═══════ */
export async function genContent(prompt, context, lang) {
  const key = getGroqKey();
  if (!key) return "NO_KEY";
  const sysLang = lang === "es" ? "Responde siempre en español." : "Always respond in English.";
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        temperature: 0.6,
        max_tokens: 2000,
        messages: [{
          role: "system",
          content: `You are a skilled writer and assistant inside a markdown-based document editor. ${sysLang} Write well-structured markdown content. Use headings, bullet lists, tables, bold, and other markdown formatting as appropriate. Do NOT wrap in a code block. Just output the markdown directly. Be concise but thorough.`,
        }, {
          role: "user",
          content: context
            ? `Current document context:\n---\n${context.slice(0, 1500)}\n---\n\nUser request: ${prompt}`
            : prompt,
        }],
      }),
    });
    if (!r.ok) { console.error("Groq write error:", r.status); return null; }
    const d = await r.json();
    return (d.choices?.[0]?.message?.content || "").trim();
  } catch {
    return null;
  }
}
