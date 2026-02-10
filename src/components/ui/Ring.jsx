import { G, Y } from "../../constants/theme";

export default function Ring({ p: pr, sz = 100, st = 3, t, run, dn }) {
  const r = (sz - st) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={sz} height={sz} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={sz / 2} cy={sz / 2} r={r} fill="none" stroke={t.bd} strokeWidth={st} />
      <circle cx={sz / 2} cy={sz / 2} r={r} fill="none"
        stroke={dn ? G : run ? Y : t.mt} strokeWidth={st}
        strokeDasharray={c} strokeDashoffset={c - pr * c}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset .5s,stroke .3s" }} />
    </svg>
  );
}
