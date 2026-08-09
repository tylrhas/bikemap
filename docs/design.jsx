import React, { useState, useMemo, useEffect } from "react";
import {
  Search, MapPin, Clock, TrendingUp, AlertTriangle, CheckCircle2, Droplets,
  X, Navigation, Users, Mountain, Bike, ArrowLeft, Star, Layers, Maximize2
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

/* ---------------------------------------------------------
   COTA tokens
   forest #023428 · clay #BD815A · coral #FCA793 · cream #F5EFE6 · ink #14231D
--------------------------------------------------------- */
const C = {
  forest: "#023428",
  forestLift: "#0A4536",
  clay: "#BD815A",
  coral: "#FCA793",
  cream: "#F5EFE6",
  ink: "#14231D",
  good: "#4C8A69",
  warn: "#C25E3F",
};

const ELEV = [
  { mi: 0, ft: 4180 }, { mi: 0.5, ft: 4210 }, { mi: 1, ft: 4340 },
  { mi: 1.5, ft: 4520 }, { mi: 2, ft: 4610 }, { mi: 2.5, ft: 4780 },
  { mi: 3, ft: 4950 }, { mi: 3.5, ft: 4890 }, { mi: 4, ft: 4720 },
  { mi: 4.5, ft: 4560 }, { mi: 5, ft: 4400 }, { mi: 5.5, ft: 4260 },
  { mi: 6, ft: 4180 },
];

const CONDITIONS = [
  { icon: CheckCircle2, label: "Surface", value: "Dry, tacky", tone: "good" },
  { icon: Droplets, label: "Last rain", value: "6 days ago", tone: "good" },
  { icon: AlertTriangle, label: "Downed tree", value: "Mile 3.2", tone: "warn" },
  { icon: Users, label: "Riders today", value: "14", tone: "neutral" },
];

const TRAILS = [
  { name: "Phil's World", miles: 8.9, difficulty: "Intermediate", condition: "good", gain: 770 },
  { name: "Funner", miles: 6.1, difficulty: "Intermediate", condition: "good", gain: 540 },
  { name: "Hogsback", miles: 4.3, difficulty: "Advanced", condition: "warn", gain: 910 },
  { name: "Ned Wollf Loop", miles: 3.0, difficulty: "Beginner", condition: "good", gain: 210 },
  { name: "Stinking Springs", miles: 5.4, difficulty: "Intermediate", condition: "good", gain: 620 },
];

const DIFF_COLOR = { Beginner: C.good, Intermediate: C.clay, Advanced: "#B5573B" };

function useIsDesktop() {
  const [d, setD] = useState(typeof window !== "undefined" ? window.innerWidth >= 900 : true);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 900px)");
    const fn = (e) => setD(e.matches);
    setD(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return d;
}

function Dot({ tone }) {
  const c = tone === "good" ? C.good : tone === "warn" ? C.coral : C.clay;
  return <span style={{ width: 7, height: 7, borderRadius: 999, background: c, display: "inline-block", flexShrink: 0 }} />;
}

function Badge({ level, dark }) {
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase",
      color: dark ? DIFF_COLOR[level] : "#fff",
      background: dark ? "transparent" : DIFF_COLOR[level],
      border: dark ? `1px solid ${DIFF_COLOR[level]}` : "none",
      padding: "3px 8px", borderRadius: 4, whiteSpace: "nowrap",
    }}>{level}</span>
  );
}

/* Stylized trail map — same SVG, scales to whatever box it's in */
function TrailMap({ tall }) {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: `radial-gradient(ellipse at 30% 20%, ${C.forestLift} 0%, ${C.forest} 70%)`,
      overflow: "hidden",
    }}>
      <svg width="100%" height="100%" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
        {/* contour lines */}
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <path key={i}
            d={`M-40 ${140 + i * 62} Q 180 ${80 + i * 62} 360 ${150 + i * 62} T 840 ${100 + i * 62}`}
            stroke={C.cream} strokeWidth="1" fill="none" opacity={0.07} />
        ))}
        {/* trail line */}
        <path d="M110 500 Q 200 430 230 350 T 350 230 T 500 170 T 690 110"
          stroke={C.forest} strokeWidth="14" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M110 500 Q 200 430 230 350 T 350 230 T 500 170 T 690 110"
          stroke={C.coral} strokeWidth="4.5" fill="none" strokeLinecap="round" strokeDasharray="0" />
        {/* markers */}
        <circle cx="110" cy="500" r="9" fill={C.cream} stroke={C.forest} strokeWidth="3" />
        <circle cx="690" cy="110" r="9" fill={C.clay} stroke={C.cream} strokeWidth="3" />
        {/* hazard */}
        <g transform="translate(350,230)">
          <circle r="13" fill={C.warn} opacity="0.9" />
          <path d="M0 -6 L0 2 M0 5 L0 6" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      </svg>
    </div>
  );
}

export default function TrailApp() {
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(TRAILS[0]);
  const [mobileView, setMobileView] = useState("detail");

  const gain = useMemo(() => ELEV.reduce((a, p, i) => i && p.ft > ELEV[i - 1].ft ? a + (p.ft - ELEV[i - 1].ft) : a, 0), []);
  const list = TRAILS.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));

  const fonts = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;500;600;700&family=Fraunces:opsz,wght@9..144,600&display=swap');
      .serif { font-family: 'Fraunces', Georgia, serif; }
      .btn { transition: transform .12s ease, background .15s ease, opacity .15s ease; }
      .btn:active { transform: scale(.98); }
      .row:hover { background: rgba(245,239,230,.07); }
      .row-light:hover { background: rgba(2,52,40,.05); }
      input::placeholder { color: currentColor; opacity: .45; }
      *:focus-visible { outline: 2px solid ${C.clay}; outline-offset: 2px; }
    `}</style>
  );

  /* ======================= DESKTOP ======================= */
  if (isDesktop) {
    return (
      <div style={{
        fontFamily: "'Public Sans', system-ui, sans-serif", color: C.ink,
        height: 620, display: "grid", gridTemplateColumns: "300px 1fr",
        background: C.forest, overflow: "hidden", borderRadius: 4,
      }}>
        {fonts}

        {/* ---- SIDEBAR: persistent trail browser ---- */}
        <aside style={{ background: C.forest, borderRight: "1px solid rgba(245,239,230,.1)", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(245,239,230,.1)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Bike size={17} color={C.coral} />
              <span style={{ color: C.cream, fontSize: 13, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase" }}>COTA Trails</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(245,239,230,.08)", borderRadius: 8, padding: "8px 10px", color: C.cream }}>
              <Search size={15} style={{ opacity: .6 }} />
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search trails"
                style={{ border: "none", outline: "none", background: "transparent", color: C.cream, fontSize: 13.5, flex: 1, fontFamily: "inherit" }} />
              {query && <X size={14} style={{ cursor: "pointer", opacity: .6 }} onClick={() => setQuery("")} />}
            </div>
          </div>

          <div style={{ overflowY: "auto", flex: 1, padding: "6px 0" }}>
            {list.map(t => {
              const active = t.name === selected.name;
              return (
                <button key={t.name} onClick={() => setSelected(t)} className={active ? "" : "row btn"}
                  style={{
                    width: "100%", textAlign: "left", border: "none", cursor: "pointer",
                    background: active ? "rgba(189,129,90,.18)" : "transparent",
                    borderLeft: active ? `3px solid ${C.clay}` : "3px solid transparent",
                    padding: "12px 16px", display: "block",
                  }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ color: C.cream, fontSize: 14, fontWeight: 600 }}>{t.name}</span>
                    <Dot tone={t.condition} />
                  </div>
                  <div style={{ display: "flex", gap: 10, color: C.cream, opacity: .55, fontSize: 11.5 }}>
                    <span>{t.miles} mi</span><span>+{t.gain} ft</span><span>{t.difficulty}</span>
                  </div>
                </button>
              );
            })}
            {list.length === 0 && (
              <div style={{ padding: "36px 18px", color: C.cream, opacity: .45, fontSize: 13 }}>
                No trails match “{query}”. Try a shorter search.
              </div>
            )}
          </div>
        </aside>

        {/* ---- MAP CANVAS + DOCKED DETAIL ---- */}
        <main style={{ position: "relative", minWidth: 0 }}>
          <TrailMap />

          {/* map controls */}
          <div style={{ position: "absolute", top: 16, right: 16, display: "flex", gap: 8 }}>
            {[Layers, Maximize2].map((Ic, i) => (
              <button key={i} className="btn" style={{
                width: 34, height: 34, borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(245,239,230,.92)", display: "flex", alignItems: "center", justifyContent: "center",
              }}><Ic size={15} color={C.forest} /></button>
            ))}
          </div>

          {/* condition chips floating top-left */}
          <div style={{ position: "absolute", top: 16, left: 16, display: "flex", gap: 8, flexWrap: "wrap", maxWidth: "70%" }}>
            {CONDITIONS.map(c => {
              const Ic = c.icon;
              const col = c.tone === "good" ? C.good : c.tone === "warn" ? C.warn : C.clay;
              return (
                <div key={c.label} style={{
                  display: "flex", alignItems: "center", gap: 7, background: "rgba(245,239,230,.94)",
                  padding: "6px 11px", borderRadius: 999, fontSize: 12,
                }}>
                  <Ic size={13} color={col} />
                  <span style={{ opacity: .55 }}>{c.label}</span>
                  <span style={{ fontWeight: 600 }}>{c.value}</span>
                </div>
              );
            })}
          </div>

          {/* docked detail panel */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            background: C.cream, borderTop: `3px solid ${C.clay}`,
            display: "grid", gridTemplateColumns: "minmax(260px, 340px) 1fr", alignItems: "stretch",
          }}>
            {/* left: identity + actions */}
            <div style={{ padding: "18px 22px 20px", borderRight: "1px solid rgba(2,52,40,.1)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 7 }}>
                <Badge level={selected.difficulty} dark />
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: C.clay }}>
                  <Star size={12} fill={C.clay} color={C.clay} /> 4.8
                </span>
              </div>
              <div className="serif" style={{ fontSize: 27, color: C.forest, lineHeight: 1.05, marginBottom: 9 }}>
                {selected.name}
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 12.5, opacity: .6, marginBottom: 16 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {selected.miles} mi</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={12} /> +{selected.gain} ft</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> 1h 15m</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" style={{
                  flex: 1, background: C.forest, color: C.cream, border: "none", borderRadius: 8,
                  padding: "11px 14px", fontSize: 13.5, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
                }}><Navigation size={14} /> Start ride</button>
                <button className="btn" style={{
                  background: "transparent", color: C.forest, border: "1px solid rgba(2,52,40,.25)",
                  borderRadius: 8, padding: "11px 14px", fontSize: 13.5, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap",
                }}>Report</button>
              </div>
            </div>

            {/* right: elevation strip */}
            <div style={{ padding: "14px 20px 12px", minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.forest, opacity: .7 }}>
                  Elevation profile
                </span>
                <span style={{ fontSize: 11.5, opacity: .5 }}>Hover to scrub the trail</span>
              </div>
              <div style={{ height: 124 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={ELEV} margin={{ top: 6, right: 4, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="ef" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={C.clay} stopOpacity={.4} />
                        <stop offset="100%" stopColor={C.clay} stopOpacity={.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="rgba(2,52,40,.07)" />
                    <XAxis dataKey="mi" tickFormatter={v => `${v}`} interval={1} tickLine={false} axisLine={false}
                      tick={{ fontSize: 10.5, fill: C.ink, opacity: .45 }} />
                    <YAxis hide domain={["dataMin - 80", "dataMax + 50"]} />
                    <Tooltip cursor={{ stroke: C.forest, strokeWidth: 1, strokeDasharray: "3 3" }}
                      content={({ active, payload }) => active && payload?.[0] ? (
                        <div style={{ background: C.forest, color: C.cream, fontSize: 11.5, padding: "5px 9px", borderRadius: 5 }}>
                          {payload[0].payload.ft.toLocaleString()} ft · mi {payload[0].payload.mi}
                        </div>
                      ) : null} />
                    <Area type="monotone" dataKey="ft" stroke={C.clay} strokeWidth={2.25} fill="url(#ef)"
                      activeDot={{ r: 4, fill: C.forest, stroke: C.cream, strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ======================= MOBILE (unchanged behavior) ======================= */
  return (
    <div style={{ background: C.cream, minHeight: 560, fontFamily: "'Public Sans', system-ui, sans-serif", color: C.ink }}>
      {fonts}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: "1px solid rgba(2,52,40,.1)", position: "sticky", top: 0, background: C.cream, zIndex: 5 }}>
        {mobileView === "detail"
          ? <button className="btn" onClick={() => setMobileView("list")} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: C.forest }}><ArrowLeft size={19} /></button>
          : <Bike size={19} color={C.forest} />}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 9, padding: "9px 11px", border: "1px solid rgba(2,52,40,.12)" }}>
          <Search size={15} color={C.forest} style={{ opacity: .55 }} />
          <input value={query} onChange={e => { setQuery(e.target.value); setMobileView("list"); }} onFocus={() => setMobileView("list")}
            placeholder="Search trails near you"
            style={{ border: "none", outline: "none", flex: 1, fontSize: 14, background: "transparent", color: C.ink, fontFamily: "inherit" }} />
          {query && <X size={14} style={{ cursor: "pointer", opacity: .5 }} onClick={() => setQuery("")} />}
        </div>
      </div>

      {mobileView === "list" ? (
        <div style={{ padding: "16px 16px 50px" }}>
          <div className="serif" style={{ fontSize: 21, color: C.forest, marginBottom: 3 }}>COTA trail network</div>
          <div style={{ fontSize: 12.5, opacity: .6, marginBottom: 14 }}>{list.length} trails · Cortez, CO</div>
          {list.map(t => (
            <button key={t.name} className="row-light btn" onClick={() => { setSelected(t); setMobileView("detail"); }}
              style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "13px 10px", borderRadius: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div style={{ width: 38, height: 38, borderRadius: 9, background: C.forest, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Mountain size={17} color={C.cream} />
                </div>
                <div>
                  <div style={{ fontSize: 14.5, fontWeight: 600, color: C.forest, marginBottom: 3 }}>{t.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, opacity: .6 }}><Dot tone={t.condition} /> {t.miles} mi · +{t.gain} ft</div>
                </div>
              </div>
              <Badge level={t.difficulty} />
            </button>
          ))}
        </div>
      ) : (
        <div style={{ paddingBottom: 40 }}>
          <div style={{ position: "relative", height: 220 }}><TrailMap /></div>
          <div style={{ padding: "18px 16px 0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 6 }}>
              <Badge level={selected.difficulty} dark />
              <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 600, color: C.clay }}><Star size={12} fill={C.clay} color={C.clay} /> 4.8</span>
            </div>
            <div className="serif" style={{ fontSize: 27, color: C.forest, lineHeight: 1.05, marginBottom: 8 }}>{selected.name}</div>
            <div style={{ display: "flex", gap: 14, fontSize: 12.5, opacity: .6, marginBottom: 18 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><MapPin size={12} /> {selected.miles} mi</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><TrendingUp size={12} /> +{gain} ft</span>
              <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={12} /> 1h 15m</span>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.forest, opacity: .7, marginBottom: 8 }}>Elevation profile</div>
            <div style={{ height: 140, background: "#fff", borderRadius: 11, border: "1px solid rgba(2,52,40,.08)", padding: "10px 4px 0", marginBottom: 20 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={ELEV}>
                  <defs><linearGradient id="efm" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.clay} stopOpacity={.35} />
                    <stop offset="100%" stopColor={C.clay} stopOpacity={.02} />
                  </linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="rgba(2,52,40,.06)" />
                  <XAxis dataKey="mi" interval={2} tickLine={false} axisLine={false} tickFormatter={v => `${v}mi`} tick={{ fontSize: 10.5, fill: C.ink, opacity: .45 }} />
                  <YAxis hide domain={["dataMin - 60", "dataMax + 40"]} />
                  <Tooltip content={({ active, payload }) => active && payload?.[0] ? (
                    <div style={{ background: C.forest, color: C.cream, fontSize: 11.5, padding: "5px 9px", borderRadius: 5 }}>
                      {payload[0].payload.ft.toLocaleString()} ft · mi {payload[0].payload.mi}
                    </div>) : null} />
                  <Area type="monotone" dataKey="ft" stroke={C.clay} strokeWidth={2.25} fill="url(#efm)" activeDot={{ r: 4, fill: C.forest }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", color: C.forest, opacity: .7, marginBottom: 8 }}>Current conditions</div>
            <div style={{ background: "#fff", borderRadius: 11, border: "1px solid rgba(2,52,40,.08)", overflow: "hidden", marginBottom: 18 }}>
              {CONDITIONS.map((c, i) => {
                const Ic = c.icon;
                const col = c.tone === "good" ? C.good : c.tone === "warn" ? C.warn : C.clay;
                return (
                  <div key={c.label} style={{ display: "flex", alignItems: "center", gap: 11, padding: "12px 13px", borderTop: i ? "1px solid rgba(2,52,40,.06)" : "none" }}>
                    <Ic size={16} color={col} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 11.5, opacity: .55 }}>{c.label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 500 }}>{c.value}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button className="btn" style={{ width: "100%", background: C.forest, color: C.cream, border: "none", borderRadius: 9, padding: "13px", fontSize: 14.5, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Navigation size={15} /> Start ride
            </button>
            <button className="btn" style={{ width: "100%", marginTop: 9, background: "transparent", color: C.forest, border: "1px solid rgba(2,52,40,.2)", borderRadius: 9, padding: "12px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Report a condition
            </button>
          </div>
        </div>
      )}
    </div>
  );
}