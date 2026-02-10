import { useState, useEffect, useRef, useCallback, useMemo } from "react";

/* ═══════ UTILS ═══════ */
const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
const now = () => new Date().toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
const isSameDay = (a, b) => a === b;
const downloadFile = (name, content, mime = "text/markdown") => { const b = new Blob([content], { type: mime }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; a.click(); URL.revokeObjectURL(u); };

/* ═══════ THEME ═══════ */
const mkT = (dk) => dk ? {
  bg:"#09090B",sb:"#0F0F12",card:"rgba(255,255,255,0.028)",bd:"rgba(255,255,255,0.08)",fg:"#EEECEA",mt:"rgba(238,236,234,0.38)",
  hv:"rgba(255,255,255,0.05)",inp:"rgba(255,255,255,0.05)",at:"rgba(255,255,255,0.08)",st:"rgba(255,255,255,0.1)",
  badge:"rgba(255,255,255,0.06)",ov:"rgba(0,0,0,0.6)",kc:"rgba(255,255,255,0.02)",dr:"rgba(214,50,48,0.08)",optBg:"#1a1a1d",optFg:"#e0e0e0",
} : {
  bg:"#F6F4F0",sb:"#EDEAE4",card:"rgba(0,0,0,0.018)",bd:"rgba(0,0,0,0.09)",fg:"#111110",mt:"rgba(17,17,16,0.4)",
  hv:"rgba(0,0,0,0.04)",inp:"rgba(0,0,0,0.04)",at:"rgba(0,0,0,0.06)",st:"rgba(0,0,0,0.12)",
  badge:"rgba(0,0,0,0.04)",ov:"rgba(0,0,0,0.4)",kc:"rgba(0,0,0,0.02)",dr:"rgba(214,50,48,0.06)",optBg:"#fff",optFg:"#111",
};
const R="#D63230",G="#2AA24B",Y="#E8B824",B="#2563EB",P="#8B5CF6",O="#EA580C";
const sf=`-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Helvetica,sans-serif`;
const sm=`"SF Mono","Fira Code",Menlo,monospace`;

const PRIOS=[{k:"P0",l:"P0·Critical",c:R},{k:"P1",l:"P1·High",c:O},{k:"P2",l:"P2·Medium",c:Y},{k:"P3",l:"P3·Low",c:G}];
const TC=[R,B,P,O,G,Y,"#EC4899","#06B6D4"];
const STS=["todo","progress","done"];
const STL={todo:"To Do",progress:"In Progress",done:"Done"};
const STC={todo:"rgba(180,180,180,0.9)",progress:Y,done:G};
const ICONS=["📄","📋","🎯","🚀","💡","⚡","🔥","📊","🎨","🛠","📝","🗂","📌","🧪","🏗","💎"];
const COVERS=["linear-gradient(135deg,#D63230 0%,#E8B824 100%)","linear-gradient(135deg,#2563EB 0%,#8B5CF6 100%)","linear-gradient(135deg,#2AA24B 0%,#06B6D4 100%)","linear-gradient(135deg,#EA580C 0%,#E8B824 100%)","linear-gradient(135deg,#EC4899 0%,#8B5CF6 100%)","linear-gradient(135deg,#09090B 0%,#374151 100%)"];

const TMPLS=[
  {n:"PRD Template",i:"🎯",c:"# Product Requirements Document\n\n## Overview\nBrief description.\n\n## Problem Statement\nWhat problem are we solving?\n\n## Goals\n- Goal 1\n- Goal 2\n\n## Scope\n\n### In Scope\n- Feature A\n- Feature B\n\n### Out of Scope\n- Feature X\n\n## Technical Requirements\n\n### Frontend\n- Requirement 1\n\n### Backend\n- API endpoint 1\n\n## Timeline\n\n| Phase | Duration | Owner |\n|-------|----------|-------|\n| Design | 1 week | - |\n| Dev | 2 weeks | - |\n| QA | 3 days | - |"},
  {n:"Sprint Planning",i:"🚀",c:"# Sprint Planning\n\n## Sprint Goal\nDefine the main objective.\n\n## New Work\n\n### High Priority\n- [ ] Task 1 — 4h\n- [ ] Task 2 — 8h\n\n### Medium Priority\n- [ ] Task 3 — 2h\n\n## Risks\n- Blocker: ..."},
  {n:"Meeting Notes",i:"📋",c:"# Meeting Notes\n\n## Attendees\n- Person A\n- Person B\n\n## Agenda\n1. Topic 1\n2. Topic 2\n\n## Action Items\n- [ ] @Person A — task\n- [ ] @Person B — task"},
  {n:"Design Brief",i:"🎨",c:"# Design Brief\n\n## Objectives\n- Objective 1\n\n## Target Audience\nDescribe users.\n\n## Deliverables\n- [ ] Wireframes\n- [ ] Mockups\n- [ ] Prototype"},
  {n:"Daily Standup",i:"⚡",c:"# Daily Standup\n\n## Yesterday\n- Completed task A\n\n## Today\n- Continue task B\n\n## Blockers\n- None"},
  {n:"Blank",i:"📄",c:""},
];

const SLASH=[
  {cmd:"h2",l:"Heading 2",ic:"H2",ins:"\n## "},
  {cmd:"h3",l:"Heading 3",ic:"H3",ins:"\n### "},
  {cmd:"bullet",l:"Bullet List",ic:"•",ins:"\n- "},
  {cmd:"check",l:"Checkbox",ic:"☐",ins:"\n- [ ] "},
  {cmd:"quote",l:"Blockquote",ic:"❝",ins:"\n> "},
  {cmd:"hr",l:"Divider",ic:"—",ins:"\n---\n"},
  {cmd:"toggle",l:"Toggle",ic:"▸",ins:"\n>>> Toggle title\n  Content\n"},
  {cmd:"tip",l:"Callout·Tip",ic:"💡",ins:"\n!!! tip Your tip\n"},
  {cmd:"warn",l:"Callout·Warn",ic:"⚠️",ins:"\n!!! warning Message\n"},
  {cmd:"info",l:"Callout·Info",ic:"ℹ️",ins:"\n!!! info Info here\n"},
  {cmd:"img",l:"Image",ic:"🖼",ins:"\n![desc](url)\n"},
  {cmd:"vid",l:"Video",ic:"🎬",ins:"\n[video](url)\n"},
  {cmd:"table",l:"Table",ic:"⊞",ins:"\n| Col 1 | Col 2 | Col 3 |\n|-------|-------|-------|\n| A | B | C |\n"},
  {cmd:"bold",l:"Bold",ic:"B",ins:"**text**"},
  {cmd:"code",l:"Code",ic:"</>",ins:"`code`"},
  {cmd:"link",l:"Wiki Link",ic:"🔗",ins:"[[Document Name]]"},
];

/* ═══════ SVG ICONS ═══════ */
const I=({d,s=16,c="currentColor",...p})=><svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" {...p}>{typeof d==="string"?<path d={d}/>:d}</svg>;
const ChevR=p=><I d="M9 18l6-6-6-6" {...p}/>;
const ChevD=p=><I d="M6 9l6 6 6-6" {...p}/>;
const Plus=p=><I d="M12 5v14M5 12h14" {...p}/>;
const Trash=p=><I d={<><path d="M3 6h18"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></>} {...p}/>;
const FileT=p=><I d={<><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>} {...p}/>;
const Fold=p=><I d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" {...p}/>;
const PlayI=p=><I d="M5 3l14 9-14 9V3z" {...p}/>;
const TimerI=p=><I d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} {...p}/>;
const SideI=p=><I d={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></>} {...p}/>;
const MoonI=p=><I d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" {...p}/>;
const SunI=p=><I d={<><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>} {...p}/>;
const ResetI=p=><I d={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>} {...p}/>;
const Sparkle=p=><I d={<><path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z"/></>} {...p}/>;
const LinkI=p=><I d={<><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></>} {...p}/>;
const CheckI=p=><I d="M20 6L9 17l-5-5" {...p}/>;
const XI=p=><I d="M18 6L6 18M6 6l12 12" {...p}/>;
const ArrowR=p=><I d="M5 12h14M12 5l7 7-7 7" {...p}/>;
const SearchI=p=><I d={<><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></>} {...p}/>;
const Star=p=><I d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" {...p}/>;
const Board=p=><I d={<><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>} {...p}/>;
const TableI=p=><I d={<><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/></>} {...p}/>;
const HistI=p=><I d={<><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>} {...p}/>;
const Grip=p=><I d={<><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none"/><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none"/></>} {...p}/>;
const CalI=p=><I d={<><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>} {...p}/>;
const GallI=p=><I d={<><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></>} {...p}/>;
const FilterI=p=><I d={<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></>} {...p}/>;
const CopyI=p=><I d={<><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></>} {...p}/>;
const DlI=p=><I d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>} {...p}/>;
const UpI=p=><I d={<><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>} {...p}/>;
const BellI=p=><I d={<><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></>} {...p}/>;
const UndoI=p=><I d={<><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></>} {...p}/>;
const RedoI=p=><I d={<><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.13-9.36L23 10"/></>} {...p}/>;

/* ═══════ BTN STYLES ═══════ */
const tB=(t)=>({width:22,height:22,borderRadius:6,border:"none",background:t.hv,color:t.mt,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0});
const sB=(t)=>({width:30,height:30,borderRadius:8,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,flexShrink:0});
const pill=(c,t)=>({fontSize:10,fontFamily:sm,color:c,fontWeight:600,background:`${c}14`,padding:"2px 7px",borderRadius:5,border:`1.5px solid ${c}30`,display:"inline-flex",alignItems:"center",gap:3});

/* ═══════ RING ═══════ */
const Ring=({p:pr,sz=100,st=3,t,run,dn})=>{const r=(sz-st)/2,c=2*Math.PI*r;return <svg width={sz} height={sz} style={{transform:"rotate(-90deg)"}}><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={t.bd} strokeWidth={st}/><circle cx={sz/2} cy={sz/2} r={r} fill="none" stroke={dn?G:run?Y:t.mt} strokeWidth={st} strokeDasharray={c} strokeDashoffset={c-pr*c} strokeLinecap="round" style={{transition:"stroke-dashoffset .5s,stroke .3s"}}/></svg>};

/* ═══════ NOTIFICATIONS ═══════ */
function Toasts({items,onDismiss,t}){
  return <div style={{position:"fixed",top:16,right:16,zIndex:5000,display:"flex",flexDirection:"column",gap:8,maxWidth:340}}>
    {items.map(n=><div key={n.id} className="fi" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:12,padding:"12px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 8px 30px rgba(0,0,0,.2)"}}>
      <span style={{fontSize:16}}>{n.icon||"🔔"}</span>
      <span style={{flex:1,fontSize:13,fontFamily:sf}}>{n.text}</span>
      <button onClick={()=>onDismiss(n.id)} style={{...tB(t),width:20,height:20}}><XI s={10}/></button>
    </div>)}
  </div>;
}

/* ═══════ MD RENDERER ═══════ */
function useMd(t,docs,setActiveDoc,setView){
  const findByName=useCallback(name=>{const s=ns=>{for(const n of ns){if(n.name===name&&n.type==="doc")return n;if(n.children){const f=s(n.children);if(f)return f}}return null};return s(docs)},[docs]);
  return useCallback(text=>{
    if(!text)return <p style={{color:t.mt,fontStyle:"italic",fontSize:13}}>Empty document…</p>;
    const lines=text.split("\n"),els=[];let i=0;
    while(i<lines.length){const L=lines[i];
      if(L.startsWith(">>> ")){const title=L.slice(4),ct=[];i++;while(i<lines.length&&lines[i].startsWith("  ")){ct.push(lines[i].slice(2));i++}els.push(<Toggle key={`t${i}`} title={title} content={ct.join("\n")} t={t}/>);continue}
      if(L.startsWith("!!! ")){const m=L.match(/^!!! (\w+) (.+)/);if(m){els.push(<Callout key={`c${i}`} type={m[1]} text={m[2]} t={t}/>);i++;continue}}
      if(L.includes("|")&&L.trim().startsWith("|")){const tl=[];while(i<lines.length&&lines[i].includes("|")&&lines[i].trim().startsWith("|")){tl.push(lines[i]);i++}els.push(<MdTbl key={`tb${i}`} lines={tl} t={t}/>);continue}
      if(L.startsWith("### ")){els.push(<h3 key={i} style={{fontSize:16,fontWeight:600,margin:"18px 0 6px",fontFamily:sf}}>{L.slice(4)}</h3>);i++;continue}
      if(L.startsWith("## ")){els.push(<h2 key={i} style={{fontSize:19,fontWeight:600,margin:"22px 0 8px",fontFamily:sf}}>{L.slice(3)}</h2>);i++;continue}
      if(L.startsWith("# ")){els.push(<h1 key={i} style={{fontSize:24,fontWeight:700,margin:"26px 0 10px",fontFamily:sf}}>{L.slice(2)}</h1>);i++;continue}
      if(L.startsWith("![")){const m=L.match(/!\[([^\]]*)\]\(([^)]+)\)/);if(m){els.push(<img key={i} src={m[2]} alt={m[1]} style={{maxWidth:"100%",borderRadius:10,margin:"12px 0",border:`1px solid ${t.bd}`}}/>);i++;continue}}
      if(L.startsWith("[video](")){const m=L.match(/\[video\]\(([^)]+)\)/);if(m){els.push(<video key={i} src={m[1]} controls style={{maxWidth:"100%",borderRadius:10,margin:"12px 0"}}/>);i++;continue}}
      if(L.startsWith("- [ ] ")||L.startsWith("- [x] ")){const ck=L.startsWith("- [x]");els.push(<div key={i} style={{display:"flex",alignItems:"center",gap:8,marginLeft:4,fontSize:14,lineHeight:1.7,color:ck?t.mt:t.fg}}><span style={{width:16,height:16,borderRadius:4,border:ck?"none":`1.5px solid ${t.bd}`,background:ck?G:"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"#fff",flexShrink:0}}>{ck?"✓":""}</span><span style={{textDecoration:ck?"line-through":"none"}}>{L.slice(6)}</span></div>);i++;continue}
      if(L.startsWith("- ")){els.push(<li key={i} style={{marginLeft:18,fontSize:14,lineHeight:1.7,color:t.fg}}>{inl(L.slice(2),t,findByName,setActiveDoc,setView)}</li>);i++;continue}
      if(L.startsWith("> ")){els.push(<blockquote key={i} style={{borderLeft:`3px solid ${R}`,paddingLeft:14,margin:"10px 0",color:t.mt,fontStyle:"italic",fontSize:14}}>{L.slice(2)}</blockquote>);i++;continue}
      if(L.trim()==="---"){els.push(<hr key={i} style={{border:"none",borderTop:`1px solid ${t.bd}`,margin:"20px 0"}}/>);i++;continue}
      if(L.trim()===""){els.push(<div key={i} style={{height:10}}/>);i++;continue}
      els.push(<p key={i} style={{fontSize:14,lineHeight:1.75,margin:"4px 0"}}>{inl(L,t,findByName,setActiveDoc,setView)}</p>);i++;
    }
    return els;
  },[t,findByName,setActiveDoc,setView]);
}
function inl(text,t,find,setAD,setV){
  const parts=[];let k=0,li=0;const rx=/(\[\[([^\]]+)\]\]|\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;let m;
  while((m=rx.exec(text))!==null){if(m.index>li)parts.push(<span key={k++}>{text.slice(li,m.index)}</span>);
    if(m[2]){const d=find(m[2]);parts.push(<span key={k++} onClick={()=>{if(d){setAD(d.id);setV("docs")}}} style={{color:B,cursor:d?"pointer":"default",borderBottom:`1px solid ${B}40`,fontWeight:500,padding:"0 1px"}}>{m[2]}{!d&&" ↗"}</span>)}
    else if(m[3])parts.push(<strong key={k++}>{m[3]}</strong>);
    else if(m[4])parts.push(<em key={k++}>{m[4]}</em>);
    else if(m[5])parts.push(<code key={k++} style={{background:t.inp,padding:"2px 6px",borderRadius:4,fontFamily:sm,fontSize:12}}>{m[5]}</code>);
    li=m.index+m[0].length}
  if(li<text.length)parts.push(<span key={k++}>{text.slice(li)}</span>);
  return parts.length?parts:text;
}
function Toggle({title,content,t}){const[o,setO]=useState(false);return <div style={{margin:"8px 0",borderRadius:8,border:`1px solid ${t.bd}`,overflow:"hidden"}}><div onClick={()=>setO(!o)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 14px",cursor:"pointer",background:t.card,fontSize:14,fontWeight:500}}><span style={{transition:"transform .2s",transform:o?"rotate(90deg)":"rotate(0)"}}>▸</span>{title}</div>{o&&<div style={{padding:"10px 14px 14px",fontSize:14,lineHeight:1.7,color:t.fg,borderTop:`1px solid ${t.bd}`}}>{content}</div>}</div>}
function Callout({type,text,t}){const m={tip:{i:"💡",c:G},warning:{i:"⚠️",c:Y},danger:{i:"🔴",c:R},info:{i:"ℹ️",c:B},success:{i:"✅",c:G}};const s=m[type]||m.info;return <div style={{display:"flex",gap:10,padding:"12px 16px",margin:"10px 0",borderRadius:10,background:`${s.c}12`,borderLeft:`3px solid ${s.c}`,fontSize:14,lineHeight:1.6}}><span style={{fontSize:16,flexShrink:0}}>{s.i}</span><span>{text}</span></div>}
function MdTbl({lines,t}){const rows=lines.filter(l=>!l.match(/^\|[\s-|]+\|$/)).map(l=>l.split("|").slice(1,-1).map(c=>c.trim()));if(!rows.length)return null;const[hd,...bd]=rows;return <div style={{overflowX:"auto",margin:"12px 0"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13,fontFamily:sf}}><thead><tr>{hd.map((h,i)=><th key={i} style={{textAlign:"left",padding:"8px 12px",borderBottom:`2px solid ${t.bd}`,fontWeight:600,fontSize:11,textTransform:"uppercase",letterSpacing:"0.08em",color:t.mt}}>{h}</th>)}</tr></thead><tbody>{bd.map((r,i)=><tr key={i}>{r.map((c,j)=><td key={j} style={{padding:"8px 12px",borderBottom:`1px solid ${t.bd}`,color:t.fg}}>{c}</td>)}</tr>)}</tbody></table></div>}

/* ═══════ AI ═══════ */
async function genTasks(content,name){try{const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:`Extract actionable tasks with time estimates from this document.\nTitle: "${name}"\nContent:\n---\n${content}\n---\nRespond ONLY with a JSON array. Each item: {"name":"max 50 chars","minutes":number,"priority":"P0"|"P1"|"P2"|"P3","tags":["tag"]}. Extract 3-15 tasks.`}]})});const d=await r.json();return JSON.parse(d.content.map(i=>i.text||"").join("").replace(/```json|```/g,"").trim())}catch{return null}}

/* ═══════ FILTER BAR ═══════ */
function FilterBar({filters,setFilters,t}){
  return <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:16}}>
    <span style={{...pill(t.mt,t),border:"none",background:"transparent",gap:5}}><FilterI s={12}/>Filters:</span>
    <select value={filters.priority||""} onChange={e=>setFilters(p=>({...p,priority:e.target.value}))} style={{height:28,borderRadius:6,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sf,fontSize:11,padding:"0 8px",cursor:"pointer"}}>
      <option value="">All Priorities</option>{PRIOS.map(p=><option key={p.k} value={p.k}>{p.k}</option>)}
    </select>
    <select value={filters.status||""} onChange={e=>setFilters(p=>({...p,status:e.target.value}))} style={{height:28,borderRadius:6,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sf,fontSize:11,padding:"0 8px",cursor:"pointer"}}>
      <option value="">All Status</option>{STS.map(s=><option key={s} value={s}>{STL[s]}</option>)}
    </select>
    <input value={filters.tag||""} onChange={e=>setFilters(p=>({...p,tag:e.target.value}))} placeholder="Filter tag…" style={{height:28,width:90,borderRadius:6,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sm,fontSize:11,padding:"0 8px"}}/>
    {(filters.priority||filters.status||filters.tag)&&<button onClick={()=>setFilters({priority:"",status:"",tag:""})} style={{...tB(t),width:24,height:24}} title="Clear"><XI s={10}/></button>}
  </div>
}

/* ═══════ SEARCH MODAL ═══════ */
function SearchModal({open,onClose,tasks,docs,setAD,setV,t}){
  const[q,setQ]=useState("");const ref=useRef(null);
  useEffect(()=>{if(open&&ref.current){ref.current.focus();setQ("")}},[open]);
  const flatD=useMemo(()=>{const r=[];const w=(ns,p="")=>ns.forEach(n=>{r.push({...n,path:p?`${p}/${n.name}`:n.name});if(n.children)w(n.children,p?`${p}/${n.name}`:n.name)});w(docs);return r},[docs]);
  const res=useMemo(()=>{const lq=q.toLowerCase();if(!q.trim())return{d:flatD.filter(d=>d.type==="doc").slice(0,5),tk:tasks.slice(0,5)};return{d:flatD.filter(d=>d.type==="doc"&&(d.name.toLowerCase().includes(lq)||(d.content||"").toLowerCase().includes(lq))).slice(0,8),tk:tasks.filter(t=>t.name.toLowerCase().includes(lq)).slice(0,8)}},[q,flatD,tasks]);
  if(!open)return null;
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:2000,background:t.ov,backdropFilter:"blur(8px)",display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:"12vh"}}>
    <div onClick={e=>e.stopPropagation()} className="fi" style={{width:"100%",maxWidth:520,background:t.bg,border:`1px solid ${t.bd}`,borderRadius:16,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.3)"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"14px 18px",borderBottom:`1px solid ${t.bd}`}}><SearchI s={16} c={t.mt}/><input ref={ref} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search tasks and docs…" style={{flex:1,border:"none",background:"transparent",color:t.fg,fontSize:15,fontFamily:sf,outline:"none"}}/><kbd style={{fontSize:10,padding:"2px 6px",borderRadius:4,border:`1px solid ${t.bd}`,color:t.mt,fontFamily:sm}}>ESC</kbd></div>
      <div style={{maxHeight:360,overflowY:"auto",padding:8}}>
        {res.d.length>0&&<div><div style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"8px 10px 4px",fontFamily:sm}}>Documents</div>
          {res.d.map(d=><button key={d.id} onClick={()=>{setAD(d.id);setV("docs");onClose()}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:"transparent",color:t.fg,cursor:"pointer",fontFamily:sf,fontSize:13,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background=t.hv} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:14}}>{d.icon||"📄"}</span><div style={{flex:1,minWidth:0}}><div style={{fontWeight:500}}>{d.name}</div></div></button>)}</div>}
        {res.tk.length>0&&<div><div style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"8px 10px 4px",fontFamily:sm,marginTop:4}}>Tasks</div>
          {res.tk.map(tk=><button key={tk.id} onClick={()=>{setV("timers");onClose()}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:"transparent",color:t.fg,cursor:"pointer",fontFamily:sf,fontSize:13,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background=t.hv} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:7,height:7,borderRadius:"50%",background:tk.done?G:tk.running?Y:t.bd,flexShrink:0}}/><div style={{flex:1}}><div style={{fontWeight:500}}>{tk.name}</div></div><span style={{fontFamily:sm,fontSize:11,color:t.mt}}>{fmt(tk.remaining)}</span></button>)}</div>}
        {!res.d.length&&!res.tk.length&&<div style={{padding:30,textAlign:"center",color:t.mt,fontSize:13}}>No results</div>}
      </div>
    </div>
  </div>
}

/* ═══════ TASK PREVIEW (AI) ═══════ */
function TaskPreview({tasks:aiT,onConfirm,onCancel,onToggle,onTime,t,docName}){
  const sel=aiT.filter(x=>x.selected),tm=sel.reduce((s,x)=>s+x.minutes,0);
  return <div style={{position:"fixed",inset:0,zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",background:t.ov,backdropFilter:"blur(8px)"}}>
    <div className="fi" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:20,width:"100%",maxWidth:540,maxHeight:"80vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"18px 22px 12px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:32,height:32,borderRadius:9,background:`${R}18`,display:"flex",alignItems:"center",justifyContent:"center"}}><Sparkle s={16} c={R}/></div><div><h3 style={{fontSize:16,fontWeight:700,fontFamily:sf}}>Generated Tasks</h3><div style={{fontSize:10,fontFamily:sm,color:t.mt,marginTop:2}}>{docName} · {sel.length} tasks · {Math.floor(tm/60)}h{tm%60}m</div></div></div>
        <button onClick={onCancel} style={{...sB(t),width:32,height:32}}><XI s={14}/></button></div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 14px"}}>{aiT.map((tk,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 8px",borderRadius:8,opacity:tk.selected?1:.4}}>
        <button onClick={()=>onToggle(i)} style={{width:20,height:20,borderRadius:5,flexShrink:0,border:tk.selected?"none":`1.5px solid ${t.bd}`,background:tk.selected?G:"transparent",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>{tk.selected&&<CheckI s={11}/>}</button>
        <span style={{flex:1,fontSize:13,fontWeight:500}}>{tk.name}</span>
        {tk.priority&&<span style={{...pill(PRIOS.find(p=>p.k===tk.priority)?.c||t.mt,t),border:"none"}}>{tk.priority}</span>}
        <div style={{display:"flex",alignItems:"center",gap:3,flexShrink:0}}><button onClick={()=>onTime(i,Math.max(1,tk.minutes-5))} style={{...tB(t),width:20,height:20}}>−</button><span style={{fontFamily:sm,fontSize:11,width:38,textAlign:"center"}}>{tk.minutes}m</span><button onClick={()=>onTime(i,tk.minutes+5)} style={{...tB(t),width:20,height:20}}>+</button></div>
      </div>)}</div>
      <div style={{padding:"12px 18px 16px",borderTop:`1px solid ${t.bd}`,display:"flex",gap:10}}>
        <button onClick={onCancel} style={{flex:1,height:40,borderRadius:10,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:13}}>Cancel</button>
        <button onClick={onConfirm} style={{flex:2,height:40,borderRadius:10,border:"none",background:R,color:"#fff",cursor:"pointer",fontFamily:sf,fontSize:13,fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><ArrowR s={15}/>Add {sel.length} Tasks</button>
      </div>
    </div>
  </div>
}

/* ═══════ DOC TREE ═══════ */
function DocTree({node,depth,activeDoc:ad,setAD,docs,setDocs,t,favs,toggleFav,drag,setDrag}){
  const[exp,setExp]=useState(true);const[hv,setHv]=useState(false);const[rn,setRn]=useState(false);
  const isF=node.type==="folder",isA=ad===node.id;
  const addC=type=>{const c={id:uid(),name:type==="folder"?"New Folder":"Untitled",type,content:"",icon:type==="folder"?null:"📄",cover:null,history:[],children:type==="folder"?[]:undefined,relatedTasks:[],createdAt:now()};const up=ns=>ns.map(n=>n.id===node.id?{...n,children:[...(n.children||[]),c]}:{...n,children:n.children?up(n.children):n.children});setDocs(up(docs));if(type!=="folder")setAD(c.id)};
  const rm=()=>{const f=ns=>ns.filter(n=>n.id!==node.id).map(n=>({...n,children:n.children?f(n.children):n.children}));setDocs(f(docs));if(isA)setAD(null);return node};
  const ren=v=>{const u=ns=>ns.map(n=>n.id===node.id?{...n,name:v}:{...n,children:n.children?u(n.children):n.children});setDocs(u(docs));setRn(false)};
  return <div draggable={!rn} onDragStart={e=>{e.dataTransfer.setData("text/plain",node.id);setDrag({d:node.id})}} onDragEnd={()=>setDrag(null)} onDragOver={e=>{e.preventDefault();e.stopPropagation()}}
    onDrop={e=>{e.preventDefault();e.stopPropagation();const sid=e.dataTransfer.getData("text/plain");if(sid===node.id||!isF)return;let sn=null;const rs=ns=>ns.filter(n=>{if(n.id===sid){sn=n;return false}if(n.children)n.children=rs(n.children);return true});const nd=rs(JSON.parse(JSON.stringify(docs)));if(sn){const at=ns=>ns.map(n=>n.id===node.id?{...n,children:[...(n.children||[]),sn]}:{...n,children:n.children?at(n.children):n.children});setDocs(at(nd))}setDrag(null)}}>
    <div onClick={()=>isF?setExp(!exp):setAD(node.id)} onDoubleClick={()=>setRn(true)} onMouseEnter={()=>setHv(true)} onMouseLeave={()=>setHv(false)}
      style={{display:"flex",alignItems:"center",gap:5,padding:`4px 6px 4px ${10+depth*16}px`,cursor:"pointer",borderRadius:7,fontSize:12.5,fontWeight:isA?500:400,color:isA?t.fg:t.mt,background:isA?t.at:hv?t.hv:"transparent",transition:"all .12s",userSelect:"none",minHeight:28}}>
      {hv&&<span style={{cursor:"grab",color:t.mt,opacity:.4,flexShrink:0,marginRight:-2}}><Grip s={11}/></span>}
      <span style={{flexShrink:0,display:"flex",alignItems:"center",opacity:.6,fontSize:11}}>{isF?(exp?<ChevD s={11}/>:<ChevR s={11}/>):<span>{node.icon||"📄"}</span>}</span>
      {rn?<input autoFocus defaultValue={node.name} onBlur={e=>ren(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")ren(e.target.value);if(e.key==="Escape")setRn(false)}} onClick={e=>e.stopPropagation()} style={{flex:1,fontSize:12,border:`1px solid ${t.bd}`,borderRadius:4,background:t.inp,color:t.fg,padding:"1px 5px",fontFamily:sf,outline:"none"}}/>
      :<span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{node.name}</span>}
      {hv&&!rn&&<div style={{display:"flex",gap:2}} onClick={e=>e.stopPropagation()}>
        {node.type==="doc"&&<button onClick={()=>toggleFav(node.id)} style={{...tB(t),width:18,height:18}}><Star s={9} c={favs.includes(node.id)?Y:t.mt}/></button>}
        {isF&&<button onClick={()=>addC("doc")} style={{...tB(t),width:18,height:18}}><Plus s={9}/></button>}
        {isF&&<button onClick={()=>addC("folder")} style={{...tB(t),width:18,height:18}}><Fold s={8}/></button>}
        <button onClick={rm} style={{...tB(t),width:18,height:18}}><Trash s={8}/></button>
      </div>}
    </div>
    {isF&&exp&&node.children&&node.children.map(c=><DocTree key={c.id} node={c} depth={depth+1} activeDoc={ad} setAD={setAD} docs={docs} setDocs={setDocs} t={t} favs={favs} toggleFav={toggleFav} drag={drag} setDrag={setDrag}/>)}
  </div>
}

/* ═══════ SLASH MENU ═══════ */
function SlashMenu({query,onSelect,pos,t}){
  const fl=SLASH.filter(c=>c.l.toLowerCase().includes(query.toLowerCase()));if(!fl.length)return null;
  return <div style={{position:"fixed",left:pos.x,top:pos.y,zIndex:3000,width:220,maxHeight:260,overflowY:"auto",background:t.bg,border:`1px solid ${t.bd}`,borderRadius:10,padding:4,boxShadow:"0 8px 30px rgba(0,0,0,.2)"}}>
    {fl.slice(0,10).map(c=><button key={c.cmd} onClick={()=>onSelect(c)} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"7px 10px",borderRadius:7,border:"none",background:"transparent",color:t.fg,cursor:"pointer",fontFamily:sf,fontSize:12,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background=t.hv} onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
      <span style={{width:24,height:24,borderRadius:6,background:t.card,border:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,flexShrink:0}}>{c.ic}</span>{c.l}
    </button>)}
  </div>
}

/* ═══════ CALENDAR VIEW ═══════ */
function CalendarView({tasks,t,play,pause,markDone}){
  const[month,setMonth]=useState(()=>{const d=new Date();return{y:d.getFullYear(),m:d.getMonth()}});
  const days=useMemo(()=>{const first=new Date(month.y,month.m,1);const last=new Date(month.y,month.m+1,0);const startDay=first.getDay();const cells=[];
    for(let i=0;i<startDay;i++)cells.push(null);
    for(let d=1;d<=last.getDate();d++)cells.push(d);return cells},[month]);
  const prevM=()=>setMonth(p=>p.m===0?{y:p.y-1,m:11}:{y:p.y,m:p.m-1});
  const nextM=()=>setMonth(p=>p.m===11?{y:p.y+1,m:0}:{y:p.y,m:p.m+1});
  const mName=new Date(month.y,month.m).toLocaleString("en-US",{month:"long",year:"numeric"});
  const todayStr=today();
  return <div className="fi">
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
      <h2 style={{fontSize:26,fontWeight:700,letterSpacing:"-0.03em"}}>Calendar</h2>
      <div style={{display:"flex",alignItems:"center",gap:8}}>
        <button onClick={prevM} style={sB(t)}><ChevR s={14} style={{transform:"rotate(180deg)"}}/></button>
        <span style={{fontSize:14,fontWeight:600,minWidth:160,textAlign:"center"}}>{mName}</span>
        <button onClick={nextM} style={sB(t)}><ChevR s={14}/></button>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2}}>
      {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=><div key={d} style={{textAlign:"center",padding:"8px 0",fontSize:10,fontFamily:sm,color:t.mt,letterSpacing:"0.1em",textTransform:"uppercase"}}>{d}</div>)}
      {days.map((d,i)=>{
        if(!d)return <div key={`e${i}`}/>;
        const dateStr=`${month.y}-${String(month.m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
        const isToday=dateStr===todayStr;
        const dayTasks=tasks.filter(tk=>tk.dueDate===dateStr);
        return <div key={i} style={{minHeight:80,padding:6,border:`1px solid ${t.bd}`,borderRadius:8,background:isToday?`${R}08`:t.card,position:"relative"}}>
          <div style={{fontSize:12,fontWeight:isToday?700:400,color:isToday?R:t.fg,marginBottom:4}}>{d}</div>
          {dayTasks.slice(0,3).map(tk=><div key={tk.id} style={{fontSize:10,padding:"2px 5px",borderRadius:4,marginBottom:2,background:`${STC[tk.status||"todo"]}18`,color:STC[tk.status||"todo"],fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",cursor:"pointer"}} title={tk.name}>{tk.name}</div>)}
          {dayTasks.length>3&&<div style={{fontSize:9,color:t.mt,fontFamily:sm}}>+{dayTasks.length-3} more</div>}
        </div>
      })}
    </div>
  </div>
}

/* ═══════ GALLERY VIEW ═══════ */
function GalleryView({docs,setAD,setV,t}){
  const allDocs=useMemo(()=>{const r=[];const w=ns=>ns.forEach(n=>{if(n.type==="doc")r.push(n);if(n.children)w(n.children)});w(docs);return r},[docs]);
  return <div className="fi">
    <h2 style={{fontSize:26,fontWeight:700,letterSpacing:"-0.03em",marginBottom:20}}>Gallery</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:14}}>
      {allDocs.map(d=><div key={d.id} onClick={()=>{setAD(d.id);setV("docs")}} style={{border:`1px solid ${t.bd}`,borderRadius:12,overflow:"hidden",cursor:"pointer",transition:"all .15s",background:t.card}} onMouseEnter={e=>e.currentTarget.style.transform="translateY(-2px)"} onMouseLeave={e=>e.currentTarget.style.transform="none"}>
        <div style={{height:80,background:d.cover||`${B}12`,display:"flex",alignItems:"center",justifyContent:"center"}}>{!d.cover&&<span style={{fontSize:32,opacity:.5}}>{d.icon||"📄"}</span>}</div>
        <div style={{padding:"12px 14px"}}>
          <div style={{fontSize:14,fontWeight:600,marginBottom:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.icon||"📄"} {d.name}</div>
          <p style={{fontSize:11,color:t.mt,lineHeight:1.5,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical"}}>{(d.content||"").replace(/[#*>\-![\]|`]/g,"").slice(0,120)||"Empty document"}</p>
        </div>
      </div>)}
    </div>
  </div>
}

/* ═══════ TRASH MODAL ═══════ */
function TrashModal({trash,onRestore,onPermanent,onClose,t}){
  return <div onClick={onClose} style={{position:"fixed",inset:0,zIndex:1000,background:t.ov,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
    <div onClick={e=>e.stopPropagation()} className="fi" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"70vh",display:"flex",flexDirection:"column",overflow:"hidden"}}>
      <div style={{padding:"16px 20px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}><h3 style={{fontSize:16,fontWeight:700}}>🗑️ Trash</h3><button onClick={onClose} style={{...sB(t),width:30,height:30}}><XI s={13}/></button></div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
        {!trash.length?<div style={{padding:30,textAlign:"center",color:t.mt,fontSize:13}}>Trash is empty</div>:
        trash.map((item,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderRadius:8,borderBottom:`1px solid ${t.bd}`}}>
          <div><div style={{fontSize:13,fontWeight:500}}>{item.itemType==="task"?"⏱":"📄"} {item.name}</div><div style={{fontSize:10,color:t.mt,fontFamily:sm}}>{item.deletedAt}</div></div>
          <div style={{display:"flex",gap:4}}>
            <button onClick={()=>onRestore(i)} style={{height:28,padding:"0 10px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:G,cursor:"pointer",fontSize:11,fontWeight:500}}>Restore</button>
            <button onClick={()=>onPermanent(i)} style={{height:28,padding:"0 10px",borderRadius:7,border:`1px solid ${R}30`,background:`${R}10`,color:R,cursor:"pointer",fontSize:11,fontWeight:500}}>Delete</button>
          </div>
        </div>)}
      </div>
    </div>
  </div>
}

/* ═══════════════════════════════════════════════════
   ██████  MAIN APP  ██████
   ═══════════════════════════════════════════════════ */
export default function App(){
  const[dk,setDk]=useState(true);const t=mkT(dk);
  const[sbOpen,setSbOpen]=useState(true);
  const[view,setView]=useState("timers");
  const[searchOpen,setSearchOpen]=useState(false);
  const[templateOpen,setTemplateOpen]=useState(false);
  const[historyOpen,setHistoryOpen]=useState(false);
  const[trashOpen,setTrashOpen]=useState(false);

  /* ONBOARDING */
  const[onboarded,setOnboarded]=useState(false);
  const[userName,setUserName]=useState("");
  const[userRole,setUserRole]=useState("");
  const[onboardStep,setOBS]=useState(0);
  const greeting=useMemo(()=>{const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening"},[]);

  /* NOTIFICATIONS */
  const[notifs,setNotifs]=useState([]);
  const notify=(text,icon="🔔")=>{const id=uid();setNotifs(p=>[...p,{id,text,icon}]);setTimeout(()=>setNotifs(p=>p.filter(n=>n.id!==id)),4000)};

  /* TRASH */
  const[trash,setTrash]=useState([]);
  const toTrash=(item,type)=>setTrash(p=>[{...item,itemType:type,deletedAt:now()},...p]);
  const restoreTrash=i=>{const item=trash[i];setTrash(p=>p.filter((_,j)=>j!==i));if(item.itemType==="task"){setTasks(p=>[...p,item]);notify("Task restored","♻️")}else{setDocs(p=>[...p,item]);notify("Doc restored","♻️")}};
  const permDelete=i=>setTrash(p=>p.filter((_,j)=>j!==i));

  /* RECENTLY VIEWED */
  const[recent,setRecent]=useState([]);
  const addRecent=id=>setRecent(p=>{const f=p.filter(x=>x!==id);return[id,...f].slice(0,8)});

  /* FILTERS */
  const[filters,setFilters]=useState({priority:"",status:"",tag:""});
  const filterTasks=tasks=>{let r=tasks;if(filters.priority)r=r.filter(t=>t.priority===filters.priority);if(filters.status)r=r.filter(t=>(t.status||"todo")===filters.status);if(filters.tag)r=r.filter(t=>(t.tags||[]).some(tg=>tg.toLowerCase().includes(filters.tag.toLowerCase())));return r};

  /* KEYBOARD */
  useEffect(()=>{const h=e=>{if((e.metaKey||e.ctrlKey)&&(e.key==="b"||e.key==="B")){e.preventDefault();setSearchOpen(true)}if(e.key==="Escape")setSearchOpen(false)};window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h)},[]);

  /* TASKS */
  const mkTask=(name,min,prio="P2",tags=[],assignee="",fromDoc=null,dueDate="")=>({id:uid(),name,minutes:min,remaining:min*60,running:false,done:false,fromDoc,priority:prio,tags,assignee,dueDate,status:"todo",subtasks:[],relatedDocs:[],reminder:null});
  const[tasks,setTasks]=useState([mkTask("Deep Focus",25,"P1",["focus"]),mkTask("Short Break",5,"P3",["break"])]);
  const[showAdd,setShowAdd]=useState(false);
  const[nN,setNN]=useState("");const[nM,setNM]=useState(10);const[nP,setNP]=useState("P2");const[nT,setNT]=useState("");const[nA,setNA]=useState("");const[nD,setND]=useState("");
  const ivs=useRef({});

  const tick=useCallback(id=>{setTasks(p=>p.map(x=>{if(x.id!==id)return x;if(x.remaining<=1){clearInterval(ivs.current[id]);delete ivs.current[id];return{...x,remaining:0,running:false,done:true,status:"done"}}
    /* REMINDER CHECK */
    if(x.reminder&&!x.reminder.triggered&&x.remaining<=x.reminder.minutes*60){notify(`⏰ Reminder: ${x.name} — ${x.reminder.minutes}m left`,"⏰");return{...x,remaining:x.remaining-1,reminder:{...x.reminder,triggered:true}}}
    return{...x,remaining:x.remaining-1}}))},[]);
  const play=id=>{setTasks(p=>{const tk=p.find(x=>x.id===id);if(tk&&!tk.done&&!tk.running&&!ivs.current[id])ivs.current[id]=setInterval(()=>tick(id),1000);return p.map(x=>x.id===id&&!x.done?{...x,running:true,status:"progress"}:x)})};
  const pause=id=>{clearInterval(ivs.current[id]);delete ivs.current[id];setTasks(p=>p.map(x=>x.id===id?{...x,running:false}:x))};
  const markDone=id=>{clearInterval(ivs.current[id]);delete ivs.current[id];setTasks(p=>p.map(x=>x.id===id?{...x,running:false,done:true,status:"done"}:x));notify("Task completed! ✓","✅")};
  const resetT=id=>{clearInterval(ivs.current[id]);delete ivs.current[id];setTasks(p=>p.map(x=>x.id===id?{...x,remaining:x.minutes*60,running:false,done:false,status:"todo"}:x))};
  const removeT=id=>{clearInterval(ivs.current[id]);delete ivs.current[id];const tk=tasks.find(x=>x.id===id);if(tk)toTrash(tk,"task");setTasks(p=>p.filter(x=>x.id!==id))};
  const chgStatus=(id,s)=>{if(s==="done")markDone(id);else if(s==="progress")play(id);else{pause(id);setTasks(p=>p.map(x=>x.id===id?{...x,status:"todo",done:false}:x))}};
  const addTask=()=>{if(!nN.trim())return;setTasks(p=>[...p,mkTask(nN.trim(),nM,nP,nT?nT.split(",").map(s=>s.trim()).filter(Boolean):[],nA,null,nD)]);setNN("");setNM(10);setNP("P2");setNT("");setNA("");setND("");setShowAdd(false)};
  /* Sub-tasks */
  const addSub=(taskId,name)=>{if(!name.trim())return;setTasks(p=>p.map(x=>x.id===taskId?{...x,subtasks:[...x.subtasks,{id:uid(),name:name.trim(),done:false}]}:x))};
  const toggleSub=(taskId,subId)=>setTasks(p=>p.map(x=>x.id===taskId?{...x,subtasks:x.subtasks.map(s=>s.id===subId?{...s,done:!s.done}:s)}:x));
  /* Relations */
  const linkDocToTask=(taskId,docId)=>setTasks(p=>p.map(x=>x.id===taskId?{...x,relatedDocs:[...new Set([...x.relatedDocs,docId])]}:x));
  /* Reminder */
  const setReminder=(taskId,min)=>setTasks(p=>p.map(x=>x.id===taskId?{...x,reminder:min?{minutes:min,triggered:false}:null}:x));
  /* D&D reorder */
  const[taskDrag,setTaskDrag]=useState(null);
  const reorderT=(from,to)=>setTasks(p=>{const a=[...p];const fi=a.findIndex(x=>x.id===from);const ti=a.findIndex(x=>x.id===to);if(fi<0||ti<0)return p;const[item]=a.splice(fi,1);a.splice(ti,0,item);return a});
  useEffect(()=>()=>Object.values(ivs.current).forEach(clearInterval),[]);

  /* DOCS */
  const[docs,setDocs]=useState([
    {id:"wf",name:"Getting Started",type:"folder",children:[
      {id:"intro",name:"Welcome",type:"doc",icon:"🚀",cover:COVERS[0],history:[],content:"# Welcome to eterOrg\n\nYour docs and timers, **connected**.\n\n## Features\n\n- Write PRDs — generate timed tasks with AI\n- **Kanban board** + **Table** + **Calendar** + **Gallery** views\n- **Wiki links**: `[[Document Name]]`\n- **Slash commands**: type `/` in editor\n- **Templates** for common docs\n- **⌘B / Ctrl+B** global search\n- **Drag & drop** everything\n- **Sub-tasks**, filters, reminders, trash, undo/redo\n\n>>> Toggle Lists\n  Use `>>>` for collapsible sections\n\n!!! tip Try creating tasks from the Example PRD\n\n| Feature | Status |\n|---------|--------|\n| Kanban | ✅ |\n| Calendar | ✅ |\n| Gallery | ✅ |\n| Filters | ✅ |\n\nLink to [[Example PRD]] to see it in action.",relatedTasks:[],createdAt:now()},
      {id:"eprd",name:"Example PRD",type:"doc",icon:"🎯",cover:COVERS[1],history:[],content:"# Landing Page Redesign\n\n## Objective\nRedesign landing page to improve conversion by 25%.\n\n## Scope\n\n### Design\n- Wireframes for desktop & mobile\n- New hero section with animations\n- Pricing comparison table\n- Testimonials carousel\n\n### Development\n- Responsive hero with CSS animations\n- Pricing toggle monthly/annual\n- Testimonials API integration\n- Form validation\n- A/B testing framework\n\n### QA\n- Cross-browser testing\n- Performance audit (LCP < 2s)\n- Deployment docs\n- Analytics tracking\n\n| Phase | Duration | Owner |\n|-------|----------|-------|\n| Design | 1 week | Design |\n| Dev | 2 weeks | Eng |\n| QA | 3 days | QA |\n\n!!! info See [[Welcome]] for tool overview",relatedTasks:[],createdAt:now()},
    ]},
    {id:"nf",name:"Project Notes",type:"folder",children:[]},
  ]);
  const[activeDoc,setActiveDoc]=useState(null);
  const[editingDoc,setEditingDoc]=useState(false);
  const[favs,setFavs]=useState(["intro"]);
  const[drag,setDrag]=useState(null);
  const[slashOpen,setSlashOpen]=useState(false);
  const[slashQ,setSlashQ]=useState("");
  const[slashPos,setSlashPos]=useState({x:0,y:0});
  const edRef=useRef(null);

  /* UNDO/REDO */
  const[undoStack,setUndo]=useState([]);
  const[redoStack,setRedo]=useState([]);
  const pushUndo=content=>{setUndo(p=>[...p.slice(-30),content]);setRedo([])};

  const toggleFav=id=>setFavs(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  const findDoc=(ns,id)=>{for(const n of ns){if(n.id===id)return n;if(n.children){const f=findDoc(n.children,id);if(f)return f}}return null};
  const updateDoc=(id,upd)=>{const u=ns=>ns.map(n=>n.id===id?{...n,...upd}:{...n,children:n.children?u(n.children):n.children});setDocs(u(docs))};
  const currentDoc=activeDoc?findDoc(docs,activeDoc):null;
  const getBc=useCallback(id=>{const p=[];const s=(ns,tr)=>{for(const n of ns){const t=[...tr,n];if(n.id===id){p.push(...t);return true}if(n.children&&s(n.children,t))return true}return false};s(docs,[]);return p},[docs]);

  const addRootFolder=()=>setDocs([...docs,{id:uid(),name:"New Folder",type:"folder",children:[]}]);
  const addDocTmpl=tmpl=>{const d={id:uid(),name:tmpl.n,type:"doc",content:tmpl.c,icon:tmpl.i,cover:null,history:[],relatedTasks:[],createdAt:now()};setDocs([...docs,d]);setActiveDoc(d.id);setView("docs");setTemplateOpen(false);notify("Doc created from template","📄")};
  const addBlankDoc=()=>{const d={id:uid(),name:"Untitled",type:"doc",content:"",icon:"📄",cover:null,history:[],relatedTasks:[],createdAt:now()};setDocs([...docs,d]);setActiveDoc(d.id);setView("docs")};
  const duplicateDoc=()=>{if(!currentDoc)return;const d={...JSON.parse(JSON.stringify(currentDoc)),id:uid(),name:`${currentDoc.name} (copy)`};setDocs([...docs,d]);setActiveDoc(d.id);notify("Page duplicated","📋")};
  const deleteDoc=()=>{if(!currentDoc)return;toTrash(currentDoc,"doc");const f=ns=>ns.filter(n=>n.id!==currentDoc.id).map(n=>({...n,children:n.children?f(n.children):n.children}));setDocs(f(docs));setActiveDoc(null);notify("Moved to trash","🗑️")};
  const exportDoc=()=>{if(!currentDoc)return;downloadFile(`${currentDoc.name}.md`,currentDoc.content||"");notify("Exported as .md","📥")};
  const importDoc=file=>{const reader=new FileReader();reader.onload=e=>{const d={id:uid(),name:file.name.replace(/\.md$/,""),type:"doc",content:e.target.result,icon:"📄",cover:null,history:[],relatedTasks:[],createdAt:now()};setDocs(p=>[...p,d]);setActiveDoc(d.id);setView("docs");notify("File imported","📤")};reader.readAsText(file)};
  const importRef=useRef(null);

  /* AI */
  const[generating,setGen]=useState(false);const[aiPreview,setAiP]=useState(null);
  const handleGen=async()=>{if(!currentDoc?.content)return;setGen(true);const r=await genTasks(currentDoc.content,currentDoc.name);setGen(false);if(r&&Array.isArray(r))setAiP({tasks:r.map(r=>({...r,selected:true,priority:r.priority||"P2",tags:r.tags||[]})),docName:currentDoc.name,docId:currentDoc.id})};
  const confirmAi=()=>{if(!aiPreview)return;const nt=aiPreview.tasks.filter(x=>x.selected).map(s=>mkTask(s.name,s.minutes,s.priority||"P2",s.tags||[],"",aiPreview.docName));setTasks(p=>[...p,...nt]);setAiP(null);setView("timers");notify(`${aiPreview.tasks.filter(x=>x.selected).length} tasks created`,"✨")};

  const saveHistory=()=>{if(!currentDoc)return;updateDoc(currentDoc.id,{history:[...(currentDoc.history||[]).slice(-19),{date:now(),content:currentDoc.content||""}]})};

  const renderMd=useMd(t,docs,id=>{setActiveDoc(id);setEditingDoc(false);addRecent(id)},setView);

  /* Slash */
  const handleEdKey=e=>{if(e.key==="/"&&!slashOpen){const r=e.target.getBoundingClientRect();setSlashPos({x:r.left+20,y:Math.min(r.bottom,window.innerHeight-280)});setSlashOpen(true);setSlashQ("")}else if(slashOpen&&e.key==="Escape")setSlashOpen(false);
    /* Undo/Redo */
    if((e.metaKey||e.ctrlKey)&&e.key==="z"&&!e.shiftKey){e.preventDefault();if(undoStack.length){const prev=undoStack[undoStack.length-1];setRedo(p=>[...p,currentDoc?.content||""]);setUndo(p=>p.slice(0,-1));if(currentDoc)updateDoc(currentDoc.id,{content:prev})}}
    if((e.metaKey||e.ctrlKey)&&(e.key==="y"||(e.key==="z"&&e.shiftKey))){e.preventDefault();if(redoStack.length){const next=redoStack[redoStack.length-1];setUndo(p=>[...p,currentDoc?.content||""]);setRedo(p=>p.slice(0,-1));if(currentDoc)updateDoc(currentDoc.id,{content:next})}}
  };
  const handleEdInput=e=>{const v=e.target.value;pushUndo(currentDoc?.content||"");updateDoc(currentDoc.id,{content:v});if(slashOpen){const li=v.lastIndexOf("/");if(li>=0)setSlashQ(v.slice(li+1).split("\n")[0]);else setSlashOpen(false)}};
  const handleSlashSel=cmd=>{if(!currentDoc)return;const c=currentDoc.content||"";const li=c.lastIndexOf("/");const before=li>=0?c.slice(0,li):c;const after=li>=0?c.slice(li+1+slashQ.length):"";updateDoc(currentDoc.id,{content:before+cmd.ins+after});setSlashOpen(false);edRef.current?.focus()};

  const favDocs=useMemo(()=>favs.map(id=>findDoc(docs,id)).filter(Boolean),[favs,docs]);
  const recentDocs=useMemo(()=>recent.map(id=>findDoc(docs,id)).filter(Boolean),[recent,docs]);
  const filteredTasks=useMemo(()=>filterTasks(tasks),[tasks,filters]);

  const STab=({icon,label,active,onClick,badge})=><button onClick={onClick} style={{display:"flex",alignItems:"center",gap:8,width:"100%",padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:500,fontFamily:sf,color:active?t.fg:t.mt,background:active?t.at:"transparent",transition:"all .12s"}}>{icon}<span>{label}</span>{badge>0&&<span style={{marginLeft:"auto",fontSize:10,fontFamily:sm,background:t.badge,padding:"0px 6px",borderRadius:8,color:t.mt}}>{badge}</span>}</button>;

  /* ═══════ ONBOARDING ═══════ */
  if(!onboarded){
    const roles=["Developer","Designer","PM / Manager","Freelancer","Student","Other"];
    const canC=onboardStep===0?userName.trim().length>0:userRole.length>0;
    return <div style={{height:"100vh",background:t.bg,color:t.fg,fontFamily:sf,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",transition:"background .4s",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}input:focus{outline:none;border-color:${R}!important}@keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fadeIn .4s ease forwards}@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}@keyframes scaleIn{from{opacity:0;transform:scale(.9)}to{opacity:1;transform:scale(1)}}`}</style>
      <div style={{position:"absolute",top:-120,right:-120,width:400,height:400,borderRadius:"50%",background:`${R}08`,filter:"blur(80px)"}}/>
      <div style={{position:"absolute",bottom:-100,left:-100,width:350,height:350,borderRadius:"50%",background:`${B}06`,filter:"blur(80px)"}}/>
      <div style={{position:"absolute",top:20,right:24}}><button onClick={()=>setDk(!dk)} style={{width:42,height:24,borderRadius:12,border:`1.5px solid ${t.bd}`,background:t.inp,cursor:"pointer",position:"relative",padding:0}}><div style={{width:17,height:17,borderRadius:"50%",background:t.fg,position:"absolute",top:2,left:dk?21:2,transition:"left .3s cubic-bezier(.4,0,.2,1)",display:"flex",alignItems:"center",justifyContent:"center"}}>{dk?<SunI s={9} c={t.bg}/>:<MoonI s={9} c={t.bg}/>}</div></button></div>
      <div style={{maxWidth:480,width:"100%",padding:"0 32px",animation:"scaleIn .5s ease"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:48}}><div style={{width:48,height:48,borderRadius:14,background:R,display:"flex",alignItems:"center",justifyContent:"center",animation:"float 4s ease-in-out infinite"}}><TimerI s={24} c="#fff"/></div><div><h1 style={{fontSize:24,fontWeight:700,letterSpacing:"-0.03em"}}>eter<span style={{color:R}}>Org</span></h1><p style={{fontSize:11,fontFamily:sm,color:t.mt,letterSpacing:"0.1em",marginTop:3}}>ORGANIZE · EXECUTE · DELIVER</p></div></div>
        {onboardStep===0&&<div style={{animation:"scaleIn .3s ease"}}><p style={{fontSize:14,color:t.mt,marginBottom:6}}>{greeting} 👋</p><h2 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.035em",marginBottom:28}}>What's your name?</h2><input autoFocus value={userName} onChange={e=>setUserName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&canC&&setOBS(1)} placeholder="Enter your name…" style={{width:"100%",height:54,borderRadius:14,border:`2px solid ${t.bd}`,background:t.inp,color:t.fg,padding:"0 20px",fontFamily:sf,fontSize:18,fontWeight:500}}/></div>}
        {onboardStep===1&&<div style={{animation:"scaleIn .3s ease"}}><p style={{fontSize:14,color:t.mt,marginBottom:6}}>Nice to meet you, <span style={{color:t.fg,fontWeight:600}}>{userName}</span></p><h2 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.035em",marginBottom:28}}>What do you do?</h2><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{roles.map(r=><button key={r} onClick={()=>setUserRole(r)} style={{height:52,borderRadius:12,border:userRole===r?`2px solid ${R}`:`1.5px solid ${t.bd}`,background:userRole===r?`${R}12`:t.card,color:userRole===r?t.fg:t.mt,cursor:"pointer",fontFamily:sf,fontSize:14,fontWeight:500}}>{r}</button>)}</div></div>}
        {onboardStep===2&&<div style={{animation:"scaleIn .3s ease",textAlign:"center"}}><div style={{fontSize:56,marginBottom:20,animation:"float 3s ease-in-out infinite"}}>🚀</div><h2 style={{fontSize:32,fontWeight:700,letterSpacing:"-0.035em",marginBottom:10}}>You're all set, {userName}!</h2><p style={{fontSize:14,color:t.mt,lineHeight:1.6,maxWidth:360,margin:"0 auto"}}>Your workspace is ready.</p><div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",margin:"20px 0"}}>{["📄 Docs","✦ AI Tasks","⏱ Timers","📊 Board","📅 Calendar","🖼 Gallery"].map(f=><div key={f} style={{padding:"5px 12px",borderRadius:7,background:t.card,border:`1px solid ${t.bd}`,fontSize:11,color:t.mt}}>{f}</div>)}</div></div>}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:36}}>
          <div>{onboardStep>0&&<button onClick={()=>setOBS(onboardStep-1)} style={{height:40,padding:"0 16px",borderRadius:10,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:13}}>Back</button>}</div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <div style={{display:"flex",gap:6}}>{[0,1,2].map(s=><div key={s} style={{width:s===onboardStep?20:6,height:6,borderRadius:3,background:s===onboardStep?R:s<onboardStep?G:t.bd,transition:"all .3s"}}/>)}</div>
            <button onClick={()=>{if(onboardStep<2)setOBS(onboardStep+1);else setOnboarded(true)}} disabled={!canC&&onboardStep<2} style={{height:44,padding:"0 28px",borderRadius:12,border:"none",background:(!canC&&onboardStep<2)?t.bd:R,color:(!canC&&onboardStep<2)?t.mt:"#fff",cursor:(!canC&&onboardStep<2)?"not-allowed":"pointer",fontFamily:sf,fontSize:14,fontWeight:600,display:"flex",alignItems:"center",gap:8}}>{onboardStep===2?"Get Started":"Continue"} <ArrowR s={16}/></button>
          </div>
        </div>
        {onboardStep<2&&<button onClick={()=>{setUserName(userName||"User");setOnboarded(true)}} style={{display:"block",margin:"20px auto 0",border:"none",background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12}}>Skip setup →</button>}
      </div>
    </div>
  }

  /* ═══════ MAIN RENDER ═══════ */
  return <div style={{display:"flex",height:"100vh",background:t.bg,color:t.fg,fontFamily:sf,transition:"background .4s,color .4s",overflow:"hidden"}}>
    <style>{`*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-thumb{background:${t.st};border-radius:10px}::-webkit-scrollbar-track{background:transparent}input:focus,textarea:focus{outline:none;border-color:${R}!important}@keyframes fadeIn{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}.fi{animation:fadeIn .2s ease forwards}@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}@keyframes spin{to{transform:rotate(360deg)}}textarea{resize:vertical}button:hover:not(:disabled){filter:brightness(1.1)}select option{background:${t.optBg};color:${t.optFg};font-weight:500}table tbody tr:nth-child(even){background:${t.card}}table tbody tr:hover{background:${t.hv}!important}`}</style>

    <Toasts items={notifs} onDismiss={id=>setNotifs(p=>p.filter(n=>n.id!==id))} t={t}/>
    <SearchModal open={searchOpen} onClose={()=>setSearchOpen(false)} tasks={tasks} docs={docs} setAD={id=>{setActiveDoc(id);setEditingDoc(false);addRecent(id)}} setV={setView} t={t}/>
    {aiPreview&&<TaskPreview tasks={aiPreview.tasks} docName={aiPreview.docName} t={t} onCancel={()=>setAiP(null)} onConfirm={confirmAi} onToggle={i=>setAiP(p=>({...p,tasks:p.tasks.map((x,j)=>j===i?{...x,selected:!x.selected}:x)}))} onTime={(i,m)=>setAiP(p=>({...p,tasks:p.tasks.map((x,j)=>j===i?{...x,minutes:m}:x)}))}/>}
    {templateOpen&&<div onClick={()=>setTemplateOpen(false)} style={{position:"fixed",inset:0,zIndex:1000,background:t.ov,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} className="fi" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:16,width:"100%",maxWidth:440,overflow:"hidden"}}><div style={{padding:"16px 20px",borderBottom:`1px solid ${t.bd}`}}><h3 style={{fontSize:16,fontWeight:700}}>Choose Template</h3></div><div style={{padding:"8px 12px"}}>{TMPLS.map((tm,i)=><button key={i} onClick={()=>addDocTmpl(tm)} style={{display:"flex",alignItems:"center",gap:12,width:"100%",padding:"11px 14px",borderRadius:10,border:"none",background:"transparent",color:t.fg,cursor:"pointer",fontFamily:sf,fontSize:14,textAlign:"left"}} onMouseEnter={e=>e.currentTarget.style.background=t.hv} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span style={{fontSize:18}}>{tm.i}</span>{tm.n}</button>)}</div><div style={{padding:"8px 12px 12px"}}><button onClick={()=>setTemplateOpen(false)} style={{width:"100%",height:36,borderRadius:10,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontSize:12}}>Cancel</button></div></div></div>}
    {historyOpen&&currentDoc&&<div onClick={()=>setHistoryOpen(false)} style={{position:"fixed",inset:0,zIndex:1000,background:t.ov,backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center"}}><div onClick={e=>e.stopPropagation()} className="fi" style={{background:t.bg,border:`1px solid ${t.bd}`,borderRadius:16,width:"100%",maxWidth:460,maxHeight:"70vh",display:"flex",flexDirection:"column",overflow:"hidden"}}><div style={{padding:"16px 20px",borderBottom:`1px solid ${t.bd}`,display:"flex",justifyContent:"space-between"}}><h3 style={{fontSize:16,fontWeight:700}}>Version History</h3><button onClick={()=>setHistoryOpen(false)} style={{...sB(t),width:28,height:28}}><XI s={12}/></button></div><div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>{(!currentDoc.history||!currentDoc.history.length)?<div style={{padding:30,textAlign:"center",color:t.mt,fontSize:13}}>No history yet</div>:currentDoc.history.map((h,i)=><div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 12px",borderBottom:`1px solid ${t.bd}`}}><div style={{fontSize:13,fontWeight:500}}>{h.date}</div><button onClick={()=>{updateDoc(currentDoc.id,{content:h.content});setHistoryOpen(false);notify("Version restored","⏪")}} style={{height:28,padding:"0 10px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:t.fg,cursor:"pointer",fontSize:11}}>Restore</button></div>)}</div></div></div>}
    {trashOpen&&<TrashModal trash={trash} onRestore={restoreTrash} onPermanent={permDelete} onClose={()=>setTrashOpen(false)} t={t}/>}
    {slashOpen&&<SlashMenu query={slashQ} onSelect={handleSlashSel} pos={slashPos} t={t}/>}
    <input ref={importRef} type="file" accept=".md,.txt" style={{display:"none"}} onChange={e=>{if(e.target.files[0])importDoc(e.target.files[0]);e.target.value=""}}/>

    {/* ═══ SIDEBAR ═══ */}
    <div style={{width:sbOpen?256:0,minWidth:sbOpen?256:0,background:t.sb,borderRight:sbOpen?`1px solid ${t.bd}`:"none",display:"flex",flexDirection:"column",transition:"all .25s cubic-bezier(.4,0,.2,1)",overflow:"hidden"}}>
      <div style={{padding:"14px 14px 10px",borderBottom:`1px solid ${t.bd}`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div><h1 style={{fontSize:15,fontWeight:700,letterSpacing:"-0.03em"}}>eter<span style={{color:R}}>Org</span></h1>{userName&&<span style={{fontSize:10,fontFamily:sm,color:t.mt}}>{userName}</span>}</div>
          <div style={{display:"flex",gap:3}}><button onClick={()=>setSearchOpen(true)} style={{...tB(t),width:24,height:24,borderRadius:6}} title="Ctrl+B"><SearchI s={11}/></button><button onClick={()=>setSbOpen(false)} style={{...tB(t),width:24,height:24,borderRadius:6}}><SideI s={11}/></button></div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:1}}>
          <STab icon={<TimerI s={13}/>} label="Timers" active={view==="timers"} onClick={()=>setView("timers")} badge={tasks.filter(x=>x.running).length}/>
          <STab icon={<Board s={13}/>} label="Board" active={view==="board"} onClick={()=>setView("board")}/>
          <STab icon={<TableI s={13}/>} label="Table" active={view==="table"} onClick={()=>setView("table")}/>
          <STab icon={<CalI s={13}/>} label="Calendar" active={view==="calendar"} onClick={()=>setView("calendar")}/>
          <STab icon={<GallI s={13}/>} label="Gallery" active={view==="gallery"} onClick={()=>setView("gallery")}/>
          <STab icon={<FileT s={13}/>} label="Docs" active={view==="docs"} onClick={()=>setView("docs")}/>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"6px 6px"}}>
        {favDocs.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"4px 8px",fontFamily:sm,display:"flex",alignItems:"center",gap:4}}><Star s={8} c={Y}/> Favorites</div>{favDocs.map(d=><button key={d.id} onClick={()=>{setActiveDoc(d.id);setView("docs");setEditingDoc(false);addRecent(d.id)}} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"4px 10px",borderRadius:6,border:"none",background:activeDoc===d.id?t.at:"transparent",color:activeDoc===d.id?t.fg:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12,textAlign:"left"}}><span style={{fontSize:10}}>{d.icon||"📄"}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span></button>)}</div>}
        {recentDocs.length>0&&<div style={{marginBottom:6}}><div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"4px 8px",fontFamily:sm}}>⏱ Recent</div>{recentDocs.slice(0,4).map(d=><button key={d.id} onClick={()=>{setActiveDoc(d.id);setView("docs");setEditingDoc(false)}} style={{display:"flex",alignItems:"center",gap:6,width:"100%",padding:"4px 10px",borderRadius:6,border:"none",background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12,textAlign:"left"}}><span style={{fontSize:10}}>{d.icon||"📄"}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.name}</span></button>)}</div>}
        {(view==="timers"||view==="board"||view==="table"||view==="calendar")&&<div><div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"4px 8px",fontFamily:sm}}>Tasks · {tasks.filter(x=>x.done).length}/{tasks.length}</div>{tasks.slice(0,15).map(tk=><div key={tk.id} style={{display:"flex",alignItems:"center",gap:6,padding:"4px 8px",borderRadius:6,fontSize:12,color:tk.done?t.mt:t.fg,textDecoration:tk.done?"line-through":"none"}}><div style={{width:6,height:6,borderRadius:"50%",flexShrink:0,background:tk.done?G:tk.running?Y:t.bd,animation:tk.running?"pulse 2s infinite":"none"}}/><span style={{flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.name}</span><span style={{fontSize:10,fontFamily:sm,color:t.mt,flexShrink:0}}>{fmt(tk.remaining)}</span></div>)}</div>}
        {view==="docs"&&<div><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 8px",marginBottom:2}}><span style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,fontFamily:sm}}>Documents</span><div style={{display:"flex",gap:2}}><button onClick={addBlankDoc} style={{...tB(t),width:18,height:18}}><Plus s={9}/></button><button onClick={addRootFolder} style={{...tB(t),width:18,height:18}}><Fold s={8}/></button><button onClick={()=>setTemplateOpen(true)} style={{...tB(t),width:18,height:18}} title="Template">✦</button><button onClick={()=>importRef.current?.click()} style={{...tB(t),width:18,height:18}} title="Import .md"><UpI s={8}/></button></div></div>{docs.map(n=><DocTree key={n.id} node={n} depth={0} activeDoc={activeDoc} setAD={id=>{setActiveDoc(id);setEditingDoc(false);addRecent(id)}} docs={docs} setDocs={setDocs} t={t} favs={favs} toggleFav={toggleFav} drag={drag} setDrag={setDrag}/>)}</div>}
        {(view==="gallery")&&<div><div style={{fontSize:9,letterSpacing:"0.15em",textTransform:"uppercase",color:t.mt,padding:"4px 8px",fontFamily:sm}}>Documents</div></div>}
      </div>
      <div style={{padding:"8px 12px",borderTop:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setTrashOpen(true)} style={{...tB(t),width:24,height:24,borderRadius:6}} title="Trash"><Trash s={10}/></button>
          <button onClick={()=>setSearchOpen(true)} style={{border:"none",background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sm,fontSize:10,display:"flex",alignItems:"center",gap:3,padding:"0 4px"}}>⌘B</button>
        </div>
        <button onClick={()=>setDk(!dk)} style={{width:40,height:22,borderRadius:11,border:`1.5px solid ${t.bd}`,background:t.inp,cursor:"pointer",position:"relative",padding:0}}><div style={{width:16,height:16,borderRadius:"50%",background:t.fg,position:"absolute",top:1.5,left:dk?20:1.5,transition:"left .3s cubic-bezier(.4,0,.2,1)",display:"flex",alignItems:"center",justifyContent:"center"}}>{dk?<SunI s={8} c={t.bg}/>:<MoonI s={8} c={t.bg}/>}</div></button>
      </div>
    </div>

    {/* ═══ MAIN ═══ */}
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {!sbOpen&&<div style={{padding:"8px 16px",borderBottom:`1px solid ${t.bd}`,display:"flex",alignItems:"center",gap:6}}>
        <button onClick={()=>setSbOpen(true)} style={sB(t)}><SideI s={14}/></button>
        <h1 style={{fontSize:14,fontWeight:700}}>eter<span style={{color:R}}>Org</span></h1><div style={{flex:1}}/>
        {["timers","board","table","calendar","gallery","docs"].map(v=><button key={v} onClick={()=>setView(v)} style={{height:26,padding:"0 8px",borderRadius:6,border:`1px solid ${view===v?t.fg:t.bd}`,background:view===v?t.at:"transparent",color:view===v?t.fg:t.mt,cursor:"pointer",fontSize:10,fontWeight:500,fontFamily:sf,textTransform:"capitalize"}}>{v}</button>)}
        <button onClick={()=>setSearchOpen(true)} style={sB(t)}><SearchI s={14}/></button>
        <button onClick={()=>setDk(!dk)} style={sB(t)}>{dk?<SunI s={14}/>:<MoonI s={14}/>}</button>
      </div>}

      <div style={{flex:1,overflowY:"auto",padding:view==="board"?"20px 16px":"28px 24px",display:"flex",justifyContent:"center"}}>
        <div style={{width:"100%",maxWidth:view==="board"?1100:view==="table"?920:view==="calendar"?900:view==="gallery"?900:680}}>

          {/* ═══ TIMERS ═══ */}
          {view==="timers"&&<div className="fi">
            <div style={{marginBottom:24}}><p style={{fontSize:12,color:t.mt,marginBottom:3}}>{greeting}{userName?`, ${userName}`:""} 👋</p><h2 style={{fontSize:24,fontWeight:700,letterSpacing:"-0.03em"}}>Timers</h2><p style={{fontSize:11,color:t.mt,marginTop:4,fontFamily:sm}}>{tasks.filter(x=>x.done).length}/{tasks.length} completed</p></div>
            <FilterBar filters={filters} setFilters={setFilters} t={t}/>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredTasks.map(task=>{const total=task.minutes*60,prog=total>0?(total-task.remaining)/total:0;const pr=PRIOS.find(p=>p.k===task.priority)||PRIOS[2];
                return <div key={task.id} className="fi" draggable onDragStart={()=>setTaskDrag(task.id)} onDragOver={e=>e.preventDefault()} onDrop={()=>{if(taskDrag&&taskDrag!==task.id)reorderT(taskDrag,task.id);setTaskDrag(null)}}
                  style={{background:t.card,border:`1px solid ${t.bd}`,borderRadius:14,padding:"20px 22px",opacity:task.done?.5:1,position:"relative",overflow:"hidden",cursor:"grab"}}>
                  {task.done&&<div style={{position:"absolute",top:0,left:0,right:0,height:2.5,background:G}}/>}
                  {task.running&&<div style={{position:"absolute",top:0,left:0,width:`${prog*100}%`,height:2.5,background:Y,transition:"width 1s linear"}}/>}
                  <div style={{display:"flex",alignItems:"center",gap:18}}>
                    <div style={{position:"relative",flexShrink:0}}>
                      <Ring p={prog} sz={90} st={3} t={t} run={task.running} dn={task.done}/>
                      <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
                        <span style={{fontFamily:sm,fontSize:20,fontWeight:300,lineHeight:1,textDecoration:task.done?"line-through":"none",color:task.done?t.mt:t.fg}}>{fmt(task.remaining)}</span>
                        <span style={{fontSize:8,letterSpacing:"0.12em",color:task.running?Y:t.mt,marginTop:3,textTransform:"uppercase",fontFamily:sm,fontWeight:task.running?600:400}}>{task.done?"done":task.running?"active":"idle"}</span>
                      </div>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:6}}>
                        <div>
                          <h3 style={{fontSize:14,fontWeight:600,textDecoration:task.done?"line-through":"none"}}>{task.name}</h3>
                          <div style={{display:"flex",alignItems:"center",gap:5,marginTop:3,flexWrap:"wrap"}}>
                            <span style={pill(pr.c,t)}>{task.priority}</span>
                            <span style={{fontSize:10,fontFamily:sm,color:t.mt}}>{task.minutes}m</span>
                            {task.dueDate&&<span style={{fontSize:10,fontFamily:sm,color:task.dueDate<today()?R:t.mt}}>📅 {task.dueDate}</span>}
                            {task.reminder&&<span style={{fontSize:10,color:O}}>🔔 {task.reminder.minutes}m</span>}
                            {task.assignee&&<span style={{fontSize:10,color:t.mt}}>@{task.assignee}</span>}
                            {(task.tags||[]).map((tg,i)=><span key={i} style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:`${TC[i%TC.length]}15`,color:TC[i%TC.length],fontFamily:sm}}>{tg}</span>)}
                            {task.fromDoc&&<span style={{...pill(R,t),fontSize:9,border:"none"}}><LinkI s={8} c={R}/>{task.fromDoc}</span>}
                          </div>
                        </div>
                        <div style={{display:"flex",gap:3}}>
                          <select value="" onChange={e=>{if(e.target.value==="5"||e.target.value==="10"||e.target.value==="15")setReminder(task.id,+e.target.value);if(e.target.value==="clear")setReminder(task.id,null)}} style={{width:28,height:28,borderRadius:6,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontSize:10,opacity:.6,appearance:"none",textAlign:"center",padding:0,backgroundImage:"none"}} title="Set reminder"><option value="">🔔</option><option value="5">5m</option><option value="10">10m</option><option value="15">15m</option><option value="clear">Clear</option></select>
                          <button onClick={()=>resetT(task.id)} style={{...sB(t),width:28,height:28}}><ResetI s={11}/></button>
                          <button onClick={()=>removeT(task.id)} style={{...sB(t),width:28,height:28}}><Trash s={11}/></button>
                        </div>
                      </div>
                      <div style={{display:"flex",gap:6,marginBottom:task.subtasks?.length?8:0}}>
                        <button onClick={()=>play(task.id)} disabled={task.done||task.running} style={{flex:1,height:34,borderRadius:8,border:"none",cursor:task.done||task.running?"not-allowed":"pointer",background:task.done||task.running?`${G}18`:G,color:task.done||task.running?`${G}55`:"#fff",fontFamily:sf,fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}><PlayI s={10}/>Play</button>
                        <button onClick={()=>pause(task.id)} disabled={!task.running} style={{flex:1,height:34,borderRadius:8,border:"none",cursor:!task.running?"not-allowed":"pointer",background:!task.running?`${Y}18`:Y,color:!task.running?`${Y}55`:"#0A0A0A",fontFamily:sf,fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>❚❚ Pause</button>
                        <button onClick={()=>markDone(task.id)} disabled={task.done} style={{flex:1,height:34,borderRadius:8,border:"none",cursor:task.done?"not-allowed":"pointer",background:task.done?`${R}18`:R,color:task.done?`${R}55`:"#fff",fontFamily:sf,fontSize:11,fontWeight:600,letterSpacing:"0.06em",textTransform:"uppercase",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>✓ Done</button>
                      </div>
                      {/* SUBTASKS */}
                      {task.subtasks?.length>0&&<div style={{marginTop:6,paddingTop:6,borderTop:`1px solid ${t.bd}`}}>
                        {task.subtasks.map(st=><div key={st.id} style={{display:"flex",alignItems:"center",gap:7,padding:"3px 0",fontSize:12,color:st.done?t.mt:t.fg}}>
                          <button onClick={()=>toggleSub(task.id,st.id)} style={{width:16,height:16,borderRadius:4,border:st.done?"none":`1.5px solid ${t.bd}`,background:st.done?G:"transparent",color:"#fff",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,flexShrink:0,padding:0}}>{st.done&&"✓"}</button>
                          <span style={{textDecoration:st.done?"line-through":"none"}}>{st.name}</span>
                        </div>)}
                      </div>}
                      <SubTaskInput taskId={task.id} addSub={addSub} t={t}/>
                    </div>
                  </div>
                </div>})}
              {!showAdd?<button onClick={()=>setShowAdd(true)} style={{height:44,borderRadius:12,border:`1.5px dashed ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><Plus s={14}/>Add Task</button>
              :<div className="fi" style={{background:t.card,border:`1px solid ${t.bd}`,borderRadius:12,padding:"16px 18px"}}>
                <div style={{display:"flex",gap:6,marginBottom:8}}><input autoFocus value={nN} onChange={e=>setNN(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Task name…" style={{flex:1,height:36,borderRadius:8,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,padding:"0 12px",fontFamily:sf,fontSize:13}}/><input type="number" min={1} value={nM} onChange={e=>setNM(Math.max(1,parseInt(e.target.value)||1))} style={{width:60,height:36,borderRadius:8,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sm,fontSize:13,textAlign:"center"}}/></div>
                <div style={{display:"flex",gap:6,marginBottom:8}}>
                  <select value={nP} onChange={e=>setNP(e.target.value)} style={{flex:1,height:32,borderRadius:7,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sf,fontSize:11,padding:"0 6px"}}>{PRIOS.map(p=><option key={p.k} value={p.k}>{p.l}</option>)}</select>
                  <input value={nT} onChange={e=>setNT(e.target.value)} placeholder="Tags (,)" style={{flex:1,height:32,borderRadius:7,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sf,fontSize:11,padding:"0 8px"}}/>
                  <input value={nA} onChange={e=>setNA(e.target.value)} placeholder="Assignee" style={{flex:1,height:32,borderRadius:7,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sf,fontSize:11,padding:"0 8px"}}/>
                  <input type="date" value={nD} onChange={e=>setND(e.target.value)} style={{flex:1,height:32,borderRadius:7,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,fontFamily:sm,fontSize:11,padding:"0 6px"}}/>
                </div>
                <div style={{display:"flex",gap:6}}><button onClick={addTask} style={{flex:1,height:34,borderRadius:8,border:"none",background:G,color:"#fff",cursor:"pointer",fontFamily:sf,fontSize:12,fontWeight:600}}>Add</button><button onClick={()=>setShowAdd(false)} style={{width:34,height:34,borderRadius:8,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontSize:14}}>×</button></div>
              </div>}
            </div>
          </div>}

          {/* ═══ BOARD ═══ */}
          {view==="board"&&<div className="fi"><h2 style={{fontSize:24,fontWeight:700,letterSpacing:"-0.03em",marginBottom:16}}>Board</h2><FilterBar filters={filters} setFilters={setFilters} t={t}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14,minHeight:360}}>
              {STS.map(status=><div key={status} onDragOver={e=>{e.preventDefault();e.currentTarget.style.background=t.dr}} onDragLeave={e=>{e.currentTarget.style.background=t.kc}} onDrop={e=>{e.currentTarget.style.background=t.kc;const id=e.dataTransfer.getData("taskId");if(id)chgStatus(id,status)}} style={{background:t.kc,borderRadius:12,padding:"12px 10px",border:`1px solid ${t.bd}`}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12,padding:"0 4px"}}><div style={{width:8,height:8,borderRadius:"50%",background:STC[status]}}/><span style={{fontSize:11,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase",fontFamily:sm,color:t.fg}}>{STL[status]}</span><span style={{fontSize:10,fontFamily:sm,color:t.mt,marginLeft:"auto"}}>{filteredTasks.filter(tk=>(tk.status||"todo")===status).length}</span></div>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {filteredTasks.filter(tk=>(tk.status||"todo")===status).map(tk=>{const pr=PRIOS.find(p=>p.k===tk.priority)||PRIOS[2];return <div key={tk.id} draggable onDragStart={e=>e.dataTransfer.setData("taskId",tk.id)} style={{background:t.card,border:`1px solid ${t.bd}`,borderRadius:10,padding:"12px 14px",cursor:"grab"}}>
                    <div style={{fontSize:13,fontWeight:600,marginBottom:6}}>{tk.name}</div>
                    <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap",marginBottom:6}}>
                      <span style={pill(pr.c,t)}>{tk.priority}</span><span style={{fontSize:10,fontFamily:sm,color:t.mt}}>{tk.minutes}m</span>
                      {tk.dueDate&&<span style={{fontSize:10,color:t.mt}}>📅{tk.dueDate}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                      <span style={{fontFamily:sm,fontSize:13,color:tk.done?t.mt:t.fg}}>{fmt(tk.remaining)}</span>
                      <div style={{display:"flex",gap:3}}>
                        {!tk.done&&!tk.running&&<button onClick={()=>play(tk.id)} style={{...tB(t),background:`${G}20`,color:G}}><PlayI s={10}/></button>}
                        {tk.running&&<button onClick={()=>pause(tk.id)} style={{...tB(t),background:`${Y}20`,color:Y}}>❚❚</button>}
                        {!tk.done&&<button onClick={()=>markDone(tk.id)} style={{...tB(t),background:`${R}20`,color:R}}>✓</button>}
                      </div>
                    </div>
                  </div>})}
                </div>
              </div>)}
            </div>
          </div>}

          {/* ═══ TABLE ═══ */}
          {view==="table"&&<div className="fi"><h2 style={{fontSize:24,fontWeight:700,letterSpacing:"-0.03em",marginBottom:16}}>Table</h2><FilterBar filters={filters} setFilters={setFilters} t={t}/>
            <div style={{overflowX:"auto",borderRadius:12,border:`1px solid ${t.bd}`}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontFamily:sf,fontSize:13}}>
                <thead><tr style={{background:t.card}}>{["Task","Priority","Status","Time","Due","Tags","Assignee","Actions"].map(h=><th key={h} style={{textAlign:"left",padding:"10px 12px",borderBottom:`2px solid ${t.bd}`,fontWeight:600,fontSize:10,textTransform:"uppercase",letterSpacing:"0.1em",color:t.mt,whiteSpace:"nowrap",fontFamily:sm}}>{h}</th>)}</tr></thead>
                <tbody>{filteredTasks.map(tk=>{const pr=PRIOS.find(p=>p.k===tk.priority)||PRIOS[2];return <tr key={tk.id} style={{borderBottom:`1px solid ${t.bd}`,opacity:tk.done?.5:1}}>
                  <td style={{padding:"10px 12px",fontWeight:500,textDecoration:tk.done?"line-through":"none",maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{tk.name}{tk.subtasks?.length>0&&<span style={{fontSize:10,color:t.mt,marginLeft:4}}>({tk.subtasks.filter(s=>s.done).length}/{tk.subtasks.length})</span>}</td>
                  <td style={{padding:"10px 12px"}}><select value={tk.priority||"P2"} onChange={e=>setTasks(p=>p.map(x=>x.id===tk.id?{...x,priority:e.target.value}:x))} style={{...pill(pr.c,t),cursor:"pointer",border:`1.5px solid ${pr.c}30`,appearance:"none",WebkitAppearance:"none",paddingRight:18,backgroundImage:`url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 5px center"}}>{PRIOS.map(p=><option key={p.k} value={p.k}>{p.k}</option>)}</select></td>
                  <td style={{padding:"10px 12px"}}><select value={tk.status||"todo"} onChange={e=>chgStatus(tk.id,e.target.value)} style={{fontSize:11,fontFamily:sf,fontWeight:600,background:`${STC[tk.status||"todo"]}18`,color:STC[tk.status||"todo"],border:`1.5px solid ${STC[tk.status||"todo"]}30`,borderRadius:6,padding:"4px 8px",cursor:"pointer",appearance:"none",WebkitAppearance:"none",paddingRight:20,backgroundImage:`url("data:image/svg+xml,%3Csvg width='8' height='5' viewBox='0 0 8 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l3 3 3-3' stroke='%23999' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 5px center"}}>{STS.map(s=><option key={s} value={s}>{STL[s]}</option>)}</select></td>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:36,height:4,borderRadius:2,background:t.bd,overflow:"hidden"}}><div style={{height:"100%",borderRadius:2,background:tk.done?G:tk.running?Y:t.mt,width:`${tk.minutes*60>0?((tk.minutes*60-tk.remaining)/(tk.minutes*60))*100:0}%`}}/></div><span style={{fontFamily:sm,fontSize:11,color:tk.running?Y:t.fg}}>{fmt(tk.remaining)}</span></div></td>
                  <td style={{padding:"10px 12px"}}><input type="date" value={tk.dueDate||""} onChange={e=>setTasks(p=>p.map(x=>x.id===tk.id?{...x,dueDate:e.target.value}:x))} style={{border:`1px solid ${t.bd}`,borderRadius:5,background:t.inp,color:t.fg,fontFamily:sm,fontSize:10,padding:"2px 4px"}}/></td>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:3,flexWrap:"wrap"}}>{(tk.tags||[]).map((tg,i)=><span key={i} style={{fontSize:9,padding:"1px 5px",borderRadius:4,background:`${TC[i%TC.length]}15`,color:TC[i%TC.length],fontFamily:sm}}>{tg}</span>)}</div></td>
                  <td style={{padding:"10px 12px",fontSize:12,color:tk.assignee?t.fg:t.mt}}>{tk.assignee?`@${tk.assignee}`:"—"}</td>
                  <td style={{padding:"10px 12px"}}><div style={{display:"flex",gap:4}}>{!tk.done&&!tk.running&&<button onClick={()=>play(tk.id)} style={{...tB(t),width:24,height:24,background:`${G}18`,color:G}}><PlayI s={10}/></button>}{tk.running&&<button onClick={()=>pause(tk.id)} style={{...tB(t),width:24,height:24,background:`${Y}18`,color:Y}}>❚</button>}{!tk.done&&<button onClick={()=>markDone(tk.id)} style={{...tB(t),width:24,height:24,background:`${G}18`,color:G}}>✓</button>}<button onClick={()=>resetT(tk.id)} style={{...tB(t),width:24,height:24}}><ResetI s={10}/></button><button onClick={()=>removeT(tk.id)} style={{...tB(t),width:24,height:24}}><Trash s={10}/></button></div></td>
                </tr>})}</tbody>
              </table>
            </div>
          </div>}

          {/* ═══ CALENDAR ═══ */}
          {view==="calendar"&&<CalendarView tasks={tasks} t={t} play={play} pause={pause} markDone={markDone}/>}

          {/* ═══ GALLERY ═══ */}
          {view==="gallery"&&<GalleryView docs={docs} setAD={id=>{setActiveDoc(id);addRecent(id)}} setV={setView} t={t}/>}

          {/* ═══ DOCS ═══ */}
          {view==="docs"&&<div className="fi">
            {!currentDoc?<div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:400,gap:12}}>
              <div style={{width:56,height:56,borderRadius:14,background:t.card,border:`1px solid ${t.bd}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>📄</div>
              <h3 style={{fontSize:18,fontWeight:600,marginTop:4}}>Documentación</h3>
              <p style={{fontSize:13,color:t.mt,textAlign:"center",maxWidth:300,lineHeight:1.6}}>Select a doc or start from a template.</p>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                <button onClick={()=>setTemplateOpen(true)} style={{height:34,padding:"0 14px",borderRadius:9,border:"none",background:R,color:"#fff",cursor:"pointer",fontFamily:sf,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>✦ Template</button>
                <button onClick={addBlankDoc} style={{height:34,padding:"0 14px",borderRadius:9,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12,display:"flex",alignItems:"center",gap:5}}><Plus s={12}/>Blank</button>
                <button onClick={()=>importRef.current?.click()} style={{height:34,padding:"0 14px",borderRadius:9,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:12,display:"flex",alignItems:"center",gap:5}}><UpI s={12}/>Import .md</button>
              </div>
            </div>
            :<div>
              {/* Breadcrumbs */}
              <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:8,flexWrap:"wrap"}}>{getBc(currentDoc.id).map((bc,i,arr)=><span key={bc.id} style={{display:"flex",alignItems:"center",gap:4}}><button onClick={()=>{if(bc.type==="doc"){setActiveDoc(bc.id);addRecent(bc.id)}}} style={{border:"none",background:"transparent",color:i===arr.length-1?t.fg:t.mt,cursor:bc.type==="doc"?"pointer":"default",fontFamily:sf,fontSize:11,fontWeight:i===arr.length-1?500:400,padding:0}}>{bc.type==="folder"?"📁":(bc.icon||"📄")} {bc.name}</button>{i<arr.length-1&&<span style={{color:t.mt,fontSize:10}}>/</span>}</span>)}</div>
              {/* Cover */}
              {currentDoc.cover&&<div style={{height:100,borderRadius:12,marginBottom:-24,background:currentDoc.cover,position:"relative"}}>{editingDoc&&<button onClick={()=>updateDoc(currentDoc.id,{cover:null})} style={{position:"absolute",top:6,right:6,...tB(t),background:"rgba(0,0,0,.4)",color:"#fff"}}><XI s={10}/></button>}</div>}
              {/* Icon + Title */}
              <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:4,position:"relative",zIndex:1}}>
                <span style={{fontSize:36,cursor:"pointer",display:"block",lineHeight:1,paddingTop:currentDoc.cover?20:0}} onClick={()=>{const next=ICONS[(ICONS.indexOf(currentDoc.icon)+1)%ICONS.length];updateDoc(currentDoc.id,{icon:next})}}>{currentDoc.icon||"📄"}</span>
                <div style={{flex:1,paddingTop:currentDoc.cover?20:0}}><input value={currentDoc.name} onChange={e=>updateDoc(currentDoc.id,{name:e.target.value})} style={{fontSize:24,fontWeight:700,letterSpacing:"-0.03em",border:"none",background:"transparent",color:t.fg,fontFamily:sf,width:"100%",outline:"none"}}/></div>
              </div>
              {/* Toolbar */}
              <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:16,flexWrap:"wrap",paddingBottom:14,borderBottom:`1px solid ${t.bd}`}}>
                <button onClick={handleGen} disabled={generating||!currentDoc.content} style={{height:30,padding:"0 10px",borderRadius:7,border:"none",background:generating?`${R}22`:R,color:generating?`${R}88`:"#fff",cursor:generating?"wait":"pointer",fontFamily:sf,fontSize:11,fontWeight:600,display:"flex",alignItems:"center",gap:5,whiteSpace:"nowrap"}}>{generating?<div style={{width:11,height:11,border:`2px solid ${R}44`,borderTopColor:R,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>:<Sparkle s={12}/>}{generating?"…":"Tasks"}</button>
                <button onClick={()=>{if(editingDoc)saveHistory();setEditingDoc(!editingDoc)}} style={{height:30,padding:"0 10px",borderRadius:7,border:editingDoc?"none":`1px solid ${t.bd}`,background:editingDoc?t.fg:"transparent",color:editingDoc?t.bg:t.mt,cursor:"pointer",fontFamily:sm,fontSize:10,fontWeight:500}}>{editingDoc?"Preview":"Edit"}</button>
                <button onClick={()=>setHistoryOpen(true)} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10}}><HistI s={11}/>History</button>
                <button onClick={()=>toggleFav(currentDoc.id)} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:favs.includes(currentDoc.id)?Y:t.mt,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10}}><Star s={11} c={favs.includes(currentDoc.id)?Y:t.mt}/>Fav</button>
                {!currentDoc.cover&&<button onClick={()=>updateDoc(currentDoc.id,{cover:COVERS[Math.floor(Math.random()*COVERS.length)]})} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",fontSize:10}}>🖼 Cover</button>}
                <button onClick={duplicateDoc} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10}}><CopyI s={11}/>Duplicate</button>
                <button onClick={exportDoc} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${t.bd}`,background:"transparent",color:t.mt,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10}}><DlI s={11}/>.md</button>
                <button onClick={deleteDoc} style={{height:30,padding:"0 8px",borderRadius:7,border:`1px solid ${R}30`,background:`${R}08`,color:R,cursor:"pointer",display:"flex",alignItems:"center",gap:4,fontSize:10}}><Trash s={11}/>Delete</button>
              </div>
              {/* Relations */}
              {currentDoc.relatedTasks?.length>0&&<div style={{marginBottom:12,display:"flex",gap:4,flexWrap:"wrap",alignItems:"center"}}><span style={{fontSize:10,color:t.mt,fontFamily:sm}}>Related tasks:</span>{currentDoc.relatedTasks.map(tid=>{const tk=tasks.find(x=>x.id===tid);return tk?<span key={tid} style={{...pill(B,t),fontSize:9,border:"none"}}>⏱ {tk.name}</span>:null})}</div>}
              {/* Editor / Preview */}
              {editingDoc?<div>
                <div style={{fontSize:10,color:t.mt,marginBottom:6,fontFamily:sm}}>Type <span style={{color:R,fontWeight:600}}>/</span> for commands · <span style={{color:B}}>[[wiki links]]</span> · Ctrl+Z undo · Ctrl+Y redo</div>
                <textarea ref={edRef} value={currentDoc.content||""} onChange={handleEdInput} onKeyDown={handleEdKey} placeholder="Start writing… Type / for commands" style={{width:"100%",minHeight:440,borderRadius:12,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,padding:18,fontFamily:sm,fontSize:13,lineHeight:1.8,resize:"vertical"}}/>
              </div>
              :<div style={{lineHeight:1.75,minHeight:280}}>{renderMd(currentDoc.content)}</div>}
              {!editingDoc&&currentDoc.content&&<div style={{marginTop:28,padding:"16px 18px",borderRadius:12,border:`1px dashed ${t.bd}`,background:t.card,display:"flex",alignItems:"center",justifyContent:"space-between"}}><div><div style={{fontSize:13,fontWeight:600,marginBottom:2}}>Ready to execute?</div><div style={{fontSize:11,color:t.mt}}>Generate timed tasks with AI</div></div><button onClick={handleGen} disabled={generating} style={{height:34,padding:"0 14px",borderRadius:9,border:"none",background:R,color:"#fff",cursor:generating?"wait":"pointer",fontFamily:sf,fontSize:12,fontWeight:600,display:"flex",alignItems:"center",gap:5,flexShrink:0}}>{generating?<div style={{width:11,height:11,border:`2px solid rgba(255,255,255,.3)`,borderTopColor:"#fff",borderRadius:"50%",animation:"spin .8s linear infinite"}}/>:<Sparkle s={12}/>}{generating?"…":"Create Tasks"}</button></div>}
            </div>}
          </div>}

        </div>
      </div>
    </div>
  </div>
}

/* ═══════ SUB-TASK INPUT ═══════ */
function SubTaskInput({taskId,addSub,t}){
  const[show,setShow]=useState(false);const[v,setV]=useState("");
  if(!show)return <button onClick={()=>setShow(true)} style={{border:"none",background:"transparent",color:t.mt,cursor:"pointer",fontFamily:sf,fontSize:11,padding:"4px 0",display:"flex",alignItems:"center",gap:4,marginTop:4}}><Plus s={10}/>Sub-task</button>;
  return <div style={{display:"flex",gap:4,marginTop:4}}>
    <input autoFocus value={v} onChange={e=>setV(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&v.trim()){addSub(taskId,v);setV("");} if(e.key==="Escape")setShow(false)}} placeholder="Sub-task…" style={{flex:1,height:28,borderRadius:6,border:`1px solid ${t.bd}`,background:t.inp,color:t.fg,padding:"0 8px",fontFamily:sf,fontSize:12}}/>
    <button onClick={()=>{if(v.trim()){addSub(taskId,v);setV("")}}} style={{...tB(t),width:28,height:28,background:G,color:"#fff",borderRadius:6}}><Plus s={10}/></button>
    <button onClick={()=>setShow(false)} style={{...tB(t),width:28,height:28}}>×</button>
  </div>
}
