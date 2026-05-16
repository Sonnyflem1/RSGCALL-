import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL = "https://anfcgkltmdxndgxpzpyi.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFuZmNna2x0bWR4bmRneHB6cHlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4Mzg3MDIsImV4cCI6MjA5NDQxNDcwMn0.cCSyVD2uDucDdzdfheGHxZx4PxRjbLZIr5SjDJkoPoA";

const db = {
  async query(table, method = "GET", body = null, filter = "") {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${filter}`, {
        method,
        headers: {
          "apikey": SUPABASE_KEY,
          "Authorization": `Bearer ${SUPABASE_KEY}`,
          "Content-Type": "application/json",
          "Prefer": method === "POST" ? "return=representation" : "",
        },
        body: body ? JSON.stringify(body) : null,
      });
      if (!res.ok) throw new Error(await res.text() || `HTTP ${res.status}`);
      if (method === "DELETE" || res.status === 204) return null;
      return res.json();
    } catch (e) {
      throw new Error(`[${table}] ${e.message}`);
    }
  },
  get: (t, f = "") => db.query(t, "GET", null, f),
  post: (t, b) => db.query(t, "POST", b),
  patch: (t, b, f) => db.query(t, "PATCH", b, f),
};

const DEPARTMENTS = ["AD Team","Art Dept","Camera","Hair & Makeup","Lighting","Locations","Production","Sound","Transportation","VFX","Wardrobe","Other"];
const OT_THRESHOLD = 480;
const MEAL_THRESHOLD = 360;

function parseTime(t) {
  if (!t || typeof t !== "string") return null;
  const parts = t.split(":");
  if (parts.length < 2) return null;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return h * 60 + m;
}

function formatDuration(mins) {
  if (mins === null || mins === undefined || isNaN(mins)) return "—";
  if (mins <= 0) return "0h 00m";
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function calcTC(c) {
  if (!c) return null;
  const call = parseTime(c.call_time);
  let wrap = parseTime(c.wrap_time);
  if (!call || !wrap) return null;
  if (wrap < call) wrap += 24 * 60;
  const lunchOut = parseTime(c.lunch_out);
  const lunchIn = parseTime(c.lunch_in);
  const lunchMins = (lunchOut && lunchIn && lunchIn > lunchOut) ? lunchIn - lunchOut : 0;
  const workedMins = Math.max(0, wrap - call - lunchMins);
  const straightMins = Math.min(workedMins, OT_THRESHOLD);
  const otMins = Math.max(0, workedMins - OT_THRESHOLD);
  const mealPenalty = !lunchOut ? workedMins > MEAL_THRESHOLD : (lunchOut - call) > MEAL_THRESHOLD;
  return { workedMins, straightMins, otMins, lunchMins, mealPenalty };
}

function safeStr(val, fallback = "—") {
  if (val === null || val === undefined || val === "") return fallback;
  return String(val);
}

const S = {
  bg: "#0A0A0F", card: "#1E1E2E", accent: "#FF6B35",
  green: "#00FF87", gold: "#FFD700", text: "#E8E8E0", muted: "#555",
  font: "'DM Mono','Courier New',monospace",
};

const Btn = ({ children, onClick, color, disabled, full }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    width: full ? "100%" : "auto",
    background: disabled ? S.card : (color || S.accent),
    border: "none", color: disabled ? "#444" : S.bg,
    padding: "13px 20px", fontFamily: S.font, fontWeight: 700,
    fontSize: 12, letterSpacing: 2, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
  }}>{children}</button>
);

const Label = ({ children }) => (
  <div style={{ fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 5 }}>{children}</div>
);

const Field = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div style={{ marginBottom: 14 }}>
    <Label>{label}</Label>
    <input type={type} value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder || ""}
      style={{ width: "100%", boxSizing: "border-box", background: S.card, border: "none", borderBottom: `2px solid ${S.accent}`, color: S.text, padding: "10px 12px", fontFamily: S.font, fontSize: 13, outline: "none" }} />
  </div>
);

const TimeField = ({ label, value, onChange }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <Label>{label}</Label>
    <input type="time" value={value || ""} onChange={e => onChange(e.target.value)}
      style={{ width: "100%", boxSizing: "border-box", background: S.bg, border: "none", borderBottom: `1px solid ${S.accent}`, color: S.text, padding: "7px 2px", fontFamily: S.font, fontSize: 11, outline: "none" }} />
  </div>
);

const AppHeader = ({ sub }) => (
  <div style={{ background: S.bg, borderBottom: `1px solid ${S.card}`, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ background: S.accent, color: S.bg, fontWeight: 700, fontSize: 12, padding: "4px 9px", letterSpacing: 2 }}>RSG</div>
      <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>CALL</span>
    </div>
    {sub && <span style={{ fontSize: 9, color: S.muted, letterSpacing: 2 }}>{sub}</span>}
  </div>
);

const Spinner = () => <div style={{ textAlign: "center", padding: 40, color: S.muted, fontSize: 12, letterSpacing: 2 }}>LOADING...</div>;
const ErrorBox = ({ msg, onRetry }) => (
  <div style={{ margin: 16, padding: 14, background: "#2A0A0A", border: `1px solid ${S.accent}`, color: S.accent, fontSize: 11 }}>
    <div>⚠ {msg}</div>
    {onRetry && <button onClick={onRetry} style={{ marginTop: 10, background: S.accent, border: "none", color: S.bg, padding: "6px 14px", fontFamily: S.font, fontSize: 10, letterSpacing: 2, cursor: "pointer", fontWeight: 700 }}>RETRY</button>}
  </div>
);

const StatBar = ({ items }) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${items.length}, 1fr)`, borderBottom: `1px solid ${S.card}` }}>
    {items.map(([l, v, col], i) => (
      <div key={l} style={{ padding: "12px 6px", textAlign: "center", borderRight: i < items.length - 1 ? `1px solid ${S.card}` : "none" }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: col || S.text, lineHeight: 1 }}>{v}</div>
        <div style={{ fontSize: 8, color: S.muted, letterSpacing: 2, marginTop: 4 }}>{l}</div>
      </div>
    ))}
  </div>
);

const Tabs = ({ tabs, active, onChange }) => (
  <div style={{ display: "flex", borderBottom: `1px solid ${S.card}` }}>
    {tabs.map(t => (
      <button key={t} onClick={() => onChange(t)} style={{
        flex: 1, background: "transparent", border: "none",
        borderBottom: active === t ? `2px solid ${S.accent}` : "2px solid transparent",
        color: active === t ? S.accent : S.muted,
        padding: "11px 4px", fontSize: 9, fontFamily: S.font, letterSpacing: 2, fontWeight: 700, cursor: "pointer", textTransform: "uppercase",
      }}>{t}</button>
    ))}
  </div>
);

function HomeScreen({ onNew, onOpen }) {
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    db.get("shoot_days", "?order=shoot_date.desc")
      .then(data => setDays(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      <AppHeader sub="DASHBOARD" />
      <div style={{ padding: 18 }}>
        <Btn full onClick={onNew}>+ NEW SHOOT DAY</Btn>
        <div style={{ fontSize: 9, color: S.muted, letterSpacing: 2, margin: "20px 0 10px" }}>RECENT PRODUCTIONS</div>
        {loading && <Spinner />}
        {error && <ErrorBox msg={error} onRetry={load} />}
        {!loading && !error && days.length === 0 && (
          <div style={{ color: S.muted, fontSize: 12, textAlign: "center", padding: 40 }}>No shoot days yet.<br />Create your first one above.</div>
        )}
        {!loading && days.map(d => (
          <div key={d.id} onClick={() => onOpen(d)} style={{ background: S.card, padding: "14px 16px", marginBottom: 10, borderLeft: `3px solid ${S.accent}`, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{safeStr(d.production_name, "Untitled")}</div>
              <div style={{ fontSize: 10, color: S.muted, marginTop: 3 }}>{safeStr(d.shoot_date)} · Call {safeStr(d.general_call)}</div>
            </div>
            <div style={{ fontSize: 10, color: S.accent, letterSpacing: 1 }}>OPEN →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnboardingScreen({ onComplete, onBack }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [prodName, setProdName] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [generalCall, setGeneralCall] = useState("");
  const [coordinator, setCoordinator] = useState("");
  const [locationName, setLocationName] = useState("");
  const [address, setAddress] = useState("");
  const [parking, setParking] = useState("");
  const [hospital, setHospital] = useState("");
  const [officePhone, setOfficePhone] = useState("");
  const [depts, setDepts] = useState([]);
  const [crew, setCrew] = useState([]);
  const [crewName, setCrewName] = useState("");
  const [crewDept, setCrewDept] = useState("");
  const [crewPhone, setCrewPhone] = useState("");

  useEffect(() => {
    if (depts.length > 0 && !depts.find(d => d.name === crewDept)) setCrewDept(depts[0].name);
  }, [depts]);

  const toggleDept = (name) => setDepts(prev => prev.find(d => d.name === name) ? prev.filter(d => d.name !== name) : [...prev, { name, callTime: "" }]);
  const updateDeptTime = (name, time) => setDepts(prev => prev.map(d => d.name === name ? { ...d, callTime: time } : d));

  const addCrew = () => {
    if (!crewName.trim() || !crewDept) return;
    setCrew(prev => [...prev, { id: Date.now(), name: crewName.trim(), dept: crewDept, phone: crewPhone, callTime: depts.find(d => d.name === crewDept)?.callTime || "" }]);
    setCrewName(""); setCrewPhone("");
  };

  const handleSend = async () => {
    setSaving(true); setError(null);
    try {
      const [day] = await db.post("shoot_days", { production_name: prodName, shoot_date: shootDate, general_call: generalCall, coordinator, location_name: locationName, address, parking, hospital, office_phone: officePhone });
      if (!day?.id) throw new Error("No shoot day ID returned");
      if (depts.length > 0) await db.post("departments", depts.map(d => ({ shoot_day_id: day.id, name: d.name, call_time: d.callTime || null })));
      if (crew.length > 0) await db.post("crew_members", crew.map(c => ({ shoot_day_id: day.id, name: c.name, department: c.dept, call_time: c.callTime || null, phone: c.phone || null, status: "pending", wrapped: false })));
      onComplete(day);
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  };

  const STEP_LABELS = ["PROJECT", "LOCATION", "DEPTS", "CREW", "REVIEW"];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      <AppHeader sub={`STEP ${step + 1} OF 5`} />
      <div style={{ display: "flex", padding: "12px 18px 0" }}>
        {STEP_LABELS.map((s, i) => (
          <div key={s} style={{ display: "flex", alignItems: "center", flex: i < 4 ? 1 : "none" }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: i <= step ? S.accent : S.card, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: i <= step ? S.bg : "#444", flexShrink: 0 }}>{i < step ? "✓" : i + 1}</div>
            {i < 4 && <div style={{ flex: 1, height: 2, background: i < step ? S.accent : S.card }} />}
          </div>
        ))}
      </div>
      <div style={{ padding: "20px 18px" }}>
        <button onClick={() => step === 0 ? onBack() : setStep(s => s - 1)} style={{ background: "none", border: "none", color: S.muted, fontFamily: S.font, fontSize: 10, letterSpacing: 2, cursor: "pointer", marginBottom: 16, padding: 0 }}>← BACK</button>

        {step === 0 && <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>New Shoot Day</div>
          <Field label="PRODUCTION NAME" value={prodName} onChange={setProdName} placeholder="e.g. Project Orion" />
          <Field label="SHOOT DATE" value={shootDate} onChange={setShootDate} type="date" />
          <Field label="GENERAL CALL TIME" value={generalCall} onChange={setGeneralCall} placeholder="e.g. 6:00 AM" />
          <Field label="COORDINATOR NAME" value={coordinator} onChange={setCoordinator} placeholder="Your name" />
          <Btn full onClick={() => setStep(1)} disabled={!prodName.trim() || !shootDate}>NEXT →</Btn>
        </>}

        {step === 1 && <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Location & Logistics</div>
          <Field label="STAGE / LOT" value={locationName} onChange={setLocationName} placeholder="e.g. Stage 4 — Lot B" />
          <Field label="ADDRESS" value={address} onChange={setAddress} placeholder="Full address" />
          <Field label="PARKING" value={parking} onChange={setParking} placeholder="e.g. Gate 3, Row C" />
          <Field label="NEAREST HOSPITAL" value={hospital} onChange={setHospital} placeholder="Name + address" />
          <Field label="PRODUCTION OFFICE #" value={officePhone} onChange={setOfficePhone} placeholder="Emergency number" />
          <Btn full onClick={() => setStep(2)} disabled={!locationName.trim()}>NEXT →</Btn>
        </>}

        {step === 2 && <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Departments</div>
          <div style={{ fontSize: 11, color: S.muted, marginBottom: 18 }}>Tap to activate. Set call times.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 18 }}>
            {DEPARTMENTS.map(d => {
              const active = depts.find(x => x.name === d);
              return <button key={d} onClick={() => toggleDept(d)} style={{ background: active ? S.accent : S.card, border: "none", color: active ? S.bg : "#888", padding: "7px 13px", fontFamily: S.font, fontSize: 10, fontWeight: 700, letterSpacing: 1, cursor: "pointer" }}>{d}</button>;
            })}
          </div>
          {depts.map(d => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #1A1A28" }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{d.name}</span>
              <input value={d.callTime || ""} onChange={e => updateDeptTime(d.name, e.target.value)} placeholder="Call time"
                style={{ background: S.card, border: "none", borderBottom: `1px solid ${S.accent}`, color: S.text, padding: "5px 8px", fontFamily: S.font, fontSize: 12, width: 110, textAlign: "right", outline: "none" }} />
            </div>
          ))}
          <div style={{ marginTop: 16 }}><Btn full onClick={() => setStep(3)} disabled={depts.length === 0}>NEXT →</Btn></div>
        </>}

        {step === 3 && <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Add Crew</div>
          <div style={{ background: S.card, padding: 14, marginBottom: 16 }}>
            <Field label="NAME" value={crewName} onChange={setCrewName} placeholder="Full name" />
            <div style={{ marginBottom: 14 }}>
              <Label>DEPARTMENT</Label>
              <select value={crewDept} onChange={e => setCrewDept(e.target.value)} style={{ width: "100%", background: S.bg, border: "none", borderBottom: `2px solid ${S.accent}`, color: S.text, padding: "10px 12px", fontFamily: S.font, fontSize: 13, outline: "none" }}>
                {depts.length === 0 ? <option value="">No departments added</option> : depts.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
              </select>
            </div>
            <Field label="PHONE (OPTIONAL)" value={crewPhone} onChange={setCrewPhone} placeholder="For notifications" type="tel" />
            <Btn full onClick={addCrew} color={S.green} disabled={!crewName.trim() || !crewDept}>+ ADD CREW MEMBER</Btn>
          </div>
          {crew.map(c => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid #1A1A28" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.name}</div>
                <div style={{ fontSize: 10, color: S.muted }}>{c.dept} · {c.callTime || "—"}</div>
              </div>
              <button onClick={() => setCrew(prev => prev.filter(x => x.id !== c.id))} style={{ background: "none", border: "none", color: "#555", fontSize: 18, cursor: "pointer", padding: "4px 8px" }}>✕</button>
            </div>
          ))}
          <div style={{ marginTop: 16 }}><Btn full onClick={() => setStep(4)} disabled={crew.length === 0}>REVIEW →</Btn></div>
        </>}

        {step === 4 && <>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 18 }}>Review & Send</div>
          {[
            { title: "PROJECT", rows: [["Production", prodName], ["Date", shootDate], ["Call", generalCall], ["Coordinator", coordinator]] },
            { title: "LOCATION", rows: [["Stage", locationName], ["Address", address], ["Parking", parking], ["Hospital", hospital]] },
          ].map(section => (
            <div key={section.title} style={{ background: S.card, padding: 14, marginBottom: 10, borderLeft: `3px solid ${S.accent}` }}>
              <div style={{ fontSize: 9, color: S.accent, letterSpacing: 2, marginBottom: 10 }}>{section.title}</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {section.rows.map(([l, v]) => <div key={l}><Label>{l}</Label><div style={{ fontSize: 12, fontWeight: 700 }}>{safeStr(v)}</div></div>)}
              </div>
            </div>
          ))}
          <div style={{ background: S.card, padding: 14, marginBottom: 16, borderLeft: `3px solid ${S.accent}` }}>
            <div style={{ fontSize: 9, color: S.accent, letterSpacing: 2, marginBottom: 10 }}>CREW — {crew.length}</div>
            {crew.map(c => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #1A1A28", fontSize: 12 }}>
                <span>{c.name}</span><span style={{ color: S.muted }}>{c.dept}</span>
              </div>
            ))}
          </div>
          {error && <ErrorBox msg={error} />}
          <Btn full onClick={handleSend} disabled={saving}>{saving ? "SAVING..." : "🚀 SEND CALLSHEET"}</Btn>
        </>}
      </div>
    </div>
  );
}

function CrewTimecardRow({ c, onUpdate, approved, onApprove }) {
  const [open, setOpen] = useState(false);
  const tc = calcTC(c);
  return (
    <div style={{ borderBottom: "1px solid #1A1A28", background: approved ? "#0A1A0A" : "transparent" }}>
      <div onClick={() => setOpen(o => !o)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{safeStr(c.name, "Unknown")}</span>
            {approved && <span style={{ fontSize: 8, color: S.green, letterSpacing: 1 }}>✓ APPR.</span>}
            {tc?.mealPenalty && <span style={{ fontSize: 8, color: S.accent, letterSpacing: 1 }}>⚠ MEAL</span>}
            {tc?.otMins > 0 && <span style={{ fontSize: 8, color: S.gold, letterSpacing: 1 }}>OT</span>}
          </div>
          <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{safeStr(c.department)}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: tc?.otMins > 0 ? S.gold : S.text }}>{tc ? formatDuration(tc.workedMins) : "—"}</div>
          <div style={{ fontSize: 8, color: S.muted }}>{open ? "▲" : "▼"}</div>
        </div>
      </div>
      {open && (
        <div style={{ padding: "0 16px 14px" }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            <TimeField label="CALL" value={c.call_time || ""} onChange={v => onUpdate(c.id, { call_time: v })} />
            <TimeField label="LUNCH OUT" value={c.lunch_out || ""} onChange={v => onUpdate(c.id, { lunch_out: v })} />
            <TimeField label="LUNCH IN" value={c.lunch_in || ""} onChange={v => onUpdate(c.id, { lunch_in: v })} />
            <TimeField label="WRAP" value={c.wrap_time || ""} onChange={v => onUpdate(c.id, { wrap_time: v })} />
          </div>
          {tc && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", background: S.card, padding: "10px 8px", marginBottom: 10, gap: 4 }}>
              {[["TOTAL", formatDuration(tc.workedMins), S.text], ["LUNCH", tc.lunchMins > 0 ? formatDuration(tc.lunchMins) : "NONE", tc.lunchMins > 0 ? "#888" : S.accent], ["STRAIGHT", formatDuration(tc.straightMins), S.green], ["O/T", tc.otMins > 0 ? formatDuration(tc.otMins) : "—", tc.otMins > 0 ? S.gold : "#333"]].map(([l, v, col]) => (
                <div key={l} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 7, color: S.muted, letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: col }}>{v}</div>
                </div>
              ))}
            </div>
          )}
          {tc?.mealPenalty && <div style={{ background: "#2A1000", border: `1px solid ${S.accent}`, padding: "7px 10px", fontSize: 10, color: S.accent, marginBottom: 10 }}>⚠ MEAL PENALTY — lunch not within 6hr call window</div>}
          <Btn full onClick={() => onApprove(c.id)} color={approved ? "#1A2A1A" : S.green}>{approved ? "✓ APPROVED — TAP TO UNDO" : "APPROVE TIMECARD"}</Btn>
        </div>
      )}
    </div>
  );
}

function DashboardScreen({ shootDay, onBack }) {
  const [crew, setCrew] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("crew");
  const [alertText, setAlertText] = useState("");
  const [alertDept, setAlertDept] = useState("All Crew");
  const [view, setView] = useState("coordinator");
  const [sendingAlert, setSendingAlert] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [c, a] = await Promise.all([
        db.get("crew_members", `?shoot_day_id=eq.${shootDay.id}&order=department.asc`),
        db.get("alerts", `?shoot_day_id=eq.${shootDay.id}&order=created_at.desc`),
      ]);
      setCrew(Array.isArray(c) ? c : []);
      setAlerts(Array.isArray(a) ? a : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [shootDay.id]);

  useEffect(() => { load(); }, [load]);

  const updateCrew = async (id, patch) => {
    try {
      await db.patch("crew_members", patch, `?id=eq.${id}`);
      setCrew(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
    } catch (e) { alert(`Save failed: ${e.message}`); }
  };

  const sendAlert = async () => {
    if (!alertText.trim()) return;
    setSendingAlert(true);
    try {
      const [a] = await db.post("alerts", { shoot_day_id: shootDay.id, message: alertText.trim(), department: alertDept });
      if (a) setAlerts(prev => [a, ...prev]);
      setAlertText("");
    } catch (e) { alert(`Alert failed: ${e.message}`); } finally { setSendingAlert(false); }
  };

  const confirmed = crew.filter(c => c.status === "confirmed").length;
  const wrapped = crew.filter(c => c.wrapped).length;
  const deptOptions = ["All Crew", ...new Set(crew.map(c => c.department).filter(Boolean))];

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      <AppHeader sub={safeStr(shootDay.production_name, "PRODUCTION").toUpperCase()} />
      <div style={{ display: "flex" }}>
        {["coordinator", "crew"].map(v => (
          <button key={v} onClick={() => setView(v)} style={{ flex: 1, background: view === v ? S.accent : S.card, border: "none", color: view === v ? S.bg : "#666", padding: "10px", fontFamily: S.font, fontWeight: 700, fontSize: 10, letterSpacing: 2, cursor: "pointer", textTransform: "uppercase" }}>{v} VIEW</button>
        ))}
      </div>
      {loading && <Spinner />}
      {error && <ErrorBox msg={error} onRetry={load} />}
      {!loading && !error && <>
        <StatBar items={[["TOTAL", crew.length, S.text], ["CONFIRMED", confirmed, S.green], ["WRAPPED", wrapped, S.accent]]} />
        <Tabs tabs={["crew", "alerts", "lunch"]} active={tab} onChange={setTab} />
        {tab === "crew" && (
          <div>
            {crew.length === 0 && <div style={{ padding: 20, color: S.muted, fontSize: 12, textAlign: "center" }}>No crew added.</div>}
            {crew.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid #1A1A28" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{safeStr(c.name)}</div>
                  <div style={{ fontSize: 10, color: S.muted, marginTop: 2 }}>{safeStr(c.department)} · {safeStr(c.call_time)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: c.wrapped ? S.accent : c.status === "confirmed" ? S.green : "#666", flexShrink: 0 }} />
                  <span style={{ fontSize: 9, letterSpacing: 1, color: c.wrapped ? S.accent : c.status === "confirmed" ? S.green : "#666" }}>{c.wrapped ? "WRAPPED" : (c.status || "pending").toUpperCase()}</span>
                  {view === "coordinator" && !c.wrapped && (
                    <button onClick={() => updateCrew(c.id, { wrapped: true, wrap_time: new Date().toTimeString().slice(0, 5) })} style={{ background: S.card, border: "none", color: S.accent, fontSize: 9, fontFamily: S.font, padding: "4px 8px", cursor: "pointer", letterSpacing: 1 }}>WRAP</button>
                  )}
                  {view === "crew" && c.status !== "confirmed" && (
                    <button onClick={() => updateCrew(c.id, { status: "confirmed" })} style={{ background: S.green, border: "none", color: S.bg, fontSize: 9, fontFamily: S.font, padding: "4px 8px", cursor: "pointer", fontWeight: 700, letterSpacing: 1 }}>CONFIRM</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {tab === "alerts" && (
          <div style={{ padding: 16 }}>
            {view === "coordinator" && <>
              <select value={alertDept} onChange={e => setAlertDept(e.target.value)} style={{ width: "100%", background: S.card, border: `1px solid #2E2E3E`, color: S.text, padding: "10px 12px", fontFamily: S.font, fontSize: 12, marginBottom: 8, boxSizing: "border-box" }}>
                {deptOptions.map(d => <option key={d}>{d}</option>)}
              </select>
              <textarea value={alertText} onChange={e => setAlertText(e.target.value)} placeholder="Type update or change..." rows={3}
                style={{ width: "100%", boxSizing: "border-box", background: S.card, border: `1px solid #2E2E3E`, color: S.text, padding: "10px 12px", fontFamily: S.font, fontSize: 12, resize: "none" }} />
              <Btn full onClick={sendAlert} disabled={sendingAlert || !alertText.trim()}>{sendingAlert ? "SENDING..." : `SEND TO ${alertDept.toUpperCase()}`}</Btn>
              <div style={{ margin: "16px 0 8px", fontSize: 9, color: S.muted, letterSpacing: 2 }}>SENT ALERTS</div>
            </>}
            {alerts.length === 0 && <div style={{ color: "#444", fontSize: 12 }}>No alerts yet.</div>}
            {alerts.map(a => (
              <div key={a.id} style={{ background: S.card, padding: "10px 12px", marginBottom: 8, borderLeft: `3px solid ${S.accent}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, color: S.accent, letterSpacing: 1 }}>{safeStr(a.department, "ALL CREW").toUpperCase()}</span>
                  <span style={{ fontSize: 9, color: S.muted }}>{a.created_at ? new Date(a.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</span>
                </div>
                <div style={{ fontSize: 12 }}>{safeStr(a.message)}</div>
              </div>
            ))}
          </div>
        )}
        {tab === "lunch" && (
          <div style={{ padding: 16 }}>
            <div style={{ background: "#1A1A10", border: `1px solid ${S.accent}`, padding: "9px 12px", marginBottom: 14, fontSize: 11, color: S.accent }}>⚠ MEAL PENALTY triggers at 6hr mark — track all lunches</div>
            {crew.length === 0 && <div style={{ color: S.muted, fontSize: 12 }}>No crew to track.</div>}
            {crew.map(c => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #1A1A28" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{safeStr(c.name)}</div>
                  <div style={{ fontSize: 10, color: S.muted }}>{safeStr(c.department)}</div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => updateCrew(c.id, { lunch_out: new Date().toTimeString().slice(0, 5) })} style={{ background: c.lunch_out ? "#0A2A0A" : S.card, border: "none", color: c.lunch_out ? S.green : "#888", padding: "5px 8px", fontFamily: S.font, fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>{c.lunch_out ? `OUT ${c.lunch_out}` : "OUT"}</button>
                  <button onClick={() => updateCrew(c.id, { lunch_in: new Date().toTimeString().slice(0, 5) })} style={{ background: c.lunch_in ? "#0A2A0A" : S.card, border: "none", color: c.lunch_in ? S.green : "#888", padding: "5px 8px", fontFamily: S.font, fontSize: 9, letterSpacing: 1, cursor: "pointer" }}>{c.lunch_in ? `IN ${c.lunch_in}` : "IN"}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </>}
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid #2E2E3E`, color: S.muted, fontFamily: S.font, fontSize: 10, letterSpacing: 2, cursor: "pointer", padding: "10px 16px" }}>← ALL PRODUCTIONS</button>
      </div>
    </div>
  );
}

function TimecardsScreen({ shootDay, onBack }) {
  const [crew, setCrew] = useState([]);
  const [approvedIds, setApprovedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("timecards");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const c = await db.get("crew_members", `?shoot_day_id=eq.${shootDay.id}&order=department.asc`);
      setCrew(Array.isArray(c) ? c : []);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [shootDay.id]);

  useEffect(() => { load(); }, [load]);

  const updateCrew = async (id, patch) => {
    try {
      await db.patch("crew_members", patch, `?id=eq.${id}`);
      setCrew(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
      setApprovedIds(prev => prev.filter(x => x !== id));
    } catch (e) { alert(`Save failed: ${e.message}`); }
  };

  const toggleApprove = (id) => setApprovedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const totals = crew.reduce((a, c) => { const tc = calcTC(c); return { ot: a.ot + (tc?.otMins || 0), pen: a.pen + (tc?.mealPenalty ? 1 : 0) }; }, { ot: 0, pen: 0 });
  const allApproved = crew.length > 0 && approvedIds.length === crew.length;

  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      <AppHeader sub="TIMECARDS" />
      {loading && <Spinner />}
      {error && <ErrorBox msg={error} onRetry={load} />}
      {!loading && !error && <>
        <StatBar items={[["CREW", crew.length, S.text], ["APPROVED", approvedIds.length, S.green], ["OT HRS", (totals.ot / 60).toFixed(1), S.gold], ["MEAL PEN", totals.pen, totals.pen > 0 ? S.accent : "#333"]]} />
        <Tabs tabs={["timecards", "export"]} active={tab} onChange={setTab} />
        {tab === "timecards" && <>
          {crew.length === 0 && <div style={{ padding: 20, color: S.muted, fontSize: 12, textAlign: "center" }}>No crew found.</div>}
          {crew.map(c => <CrewTimecardRow key={c.id} c={c} onUpdate={updateCrew} approved={approvedIds.includes(c.id)} onApprove={toggleApprove} />)}
          {allApproved && <div style={{ margin: 16, padding: "14px 16px", background: "#0A2A0A", border: `1px solid ${S.green}`, fontSize: 12, color: S.green, letterSpacing: 1, textAlign: "center", fontWeight: 700 }}>✓ ALL TIMECARDS APPROVED</div>}
        </>}
        {tab === "export" && (
          <div style={{ padding: 16 }}>
            <div style={{ background: S.accent, padding: "12px 14px", display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
              <div><div style={{ fontSize: 14, fontWeight: 700, color: S.bg, letterSpacing: 1 }}>RSG CALL</div><div style={{ fontSize: 9, color: S.bg, opacity: 0.7 }}>TIMECARD REPORT</div></div>
              <div style={{ textAlign: "right" }}><div style={{ fontSize: 11, fontWeight: 700, color: S.bg }}>{safeStr(shootDay.production_name)}</div><div style={{ fontSize: 9, color: S.bg, opacity: 0.7 }}>{safeStr(shootDay.shoot_date)}</div></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", background: S.card, padding: "7px 10px", fontSize: 8, color: S.muted, letterSpacing: 1, marginBottom: 1 }}>
              {["NAME", "CALL→WRAP", "STRAIGHT", "O/T", "STATUS"].map(h => <div key={h}>{h}</div>)}
            </div>
            {crew.map((c, i) => {
              const tc = calcTC(c);
              return (
                <div key={c.id} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "9px 10px", fontSize: 11, background: i % 2 === 0 ? "#0F0F18" : S.bg, borderBottom: "1px solid #1A1A28", alignItems: "center" }}>
                  <div><div style={{ fontWeight: 700 }}>{safeStr(c.name)}</div><div style={{ fontSize: 9, color: S.muted }}>{safeStr(c.department)}</div></div>
                  <div style={{ fontSize: 9, color: "#888" }}>{safeStr(c.call_time, "?")}→{safeStr(c.wrap_time, "?")}</div>
                  <div style={{ color: S.green, fontSize: 10 }}>{tc ? formatDuration(tc.straightMins) : "—"}</div>
                  <div style={{ color: tc?.otMins > 0 ? S.gold : "#333", fontSize: 10, fontWeight: tc?.otMins > 0 ? 700 : 400 }}>{tc?.otMins > 0 ? formatDuration(tc.otMins) : "—"}</div>
                  <div style={{ fontSize: 9, color: approvedIds.includes(c.id) ? S.green : S.muted, letterSpacing: 1 }}>{approvedIds.includes(c.id) ? "✓ APPR." : "PEND."}</div>
                </div>
              );
            })}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", padding: "10px", background: S.card, borderTop: `2px solid ${S.accent}`, fontSize: 11, fontWeight: 700 }}>
              <div style={{ fontSize: 9, color: S.accent, letterSpacing: 2 }}>TOTALS</div>
              <div /><div style={{ color: S.green }}>{formatDuration(crew.reduce((a, c) => a + (calcTC(c)?.straightMins || 0), 0))}</div>
              <div style={{ color: S.gold }}>{formatDuration(crew.reduce((a, c) => a + (calcTC(c)?.otMins || 0), 0))}</div>
              <div style={{ color: S.green, fontSize: 10 }}>{approvedIds.length}/{crew.length}</div>
            </div>
            <div style={{ marginTop: 14, padding: "12px 14px", background: allApproved ? "#0A2A0A" : S.card, border: `1px solid ${allApproved ? S.green : "#2E2E3E"}`, fontSize: 11, color: allApproved ? S.green : S.muted, letterSpacing: 1, textAlign: "center" }}>
              {allApproved ? "✓ ALL APPROVED — READY FOR PAYROLL" : `${crew.length - approvedIds.length} TIMECARD(S) PENDING`}
            </div>
          </div>
        )}
      </>}
      <div style={{ padding: 16 }}>
        <button onClick={onBack} style={{ background: "none", border: `1px solid #2E2E3E`, color: S.muted, fontFamily: S.font, fontSize: 10, letterSpacing: 2, cursor: "pointer", padding: "10px 16px" }}>← BACK</button>
      </div>
    </div>
  );
}

function ShootDayScreen({ shootDay, onBack }) {
  const [mode, setMode] = useState(null);
  if (mode === "dashboard") return <DashboardScreen shootDay={shootDay} onBack={() => setMode(null)} />;
  if (mode === "timecards") return <TimecardsScreen shootDay={shootDay} onBack={() => setMode(null)} />;
  return (
    <div style={{ minHeight: "100vh", background: S.bg, fontFamily: S.font, color: S.text }}>
      <AppHeader sub={safeStr(shootDay.production_name, "PRODUCTION").toUpperCase()} />
      <div style={{ padding: 20 }}>
        <div style={{ fontSize: 9, color: S.muted, letterSpacing: 2, marginBottom: 4 }}>PRODUCTION</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>{safeStr(shootDay.production_name, "Untitled")}</div>
        <div style={{ fontSize: 12, color: S.muted, marginBottom: 28 }}>{safeStr(shootDay.shoot_date)} · Call {safeStr(shootDay.general_call)}</div>
        {[
          { label: "LIVE DASHBOARD", sub: "Confirmations, alerts, lunch tracking", color: S.accent, mode: "dashboard" },
          { label: "TIMECARDS", sub: "OT tracking, approvals, payroll export", color: S.green, mode: "timecards" },
        ].map(opt => (
          <div key={opt.mode} onClick={() => setMode(opt.mode)} style={{ background: S.card, padding: "18px 16px", marginBottom: 12, borderLeft: `4px solid ${opt.color}`, cursor: "pointer" }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: opt.color, letterSpacing: 1 }}>{opt.label}</div>
            <div style={{ fontSize: 11, color: S.muted, marginTop: 4 }}>{opt.sub}</div>
          </div>
        ))}
        <button onClick={onBack} style={{ background: "none", border: `1px solid #2E2E3E`, color: S.muted, fontFamily: S.font, fontSize: 10, letterSpacing: 2, cursor: "pointer", padding: "10px 16px", marginTop: 8 }}>← ALL PRODUCTIONS</button>
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("home");
  const [activeDay, setActiveDay] = useState(null);
  if (screen === "home") return <HomeScreen onNew={() => setScreen("new")} onOpen={day => { setActiveDay(day); setScreen("day"); }} />;
  if (screen === "new") return <OnboardingScreen onComplete={day => { setActiveDay(day); setScreen("day"); }} onBack={() => setScreen("home")} />;
  if (screen === "day" && activeDay) return <ShootDayScreen shootDay={activeDay} onBack={() => setScreen("home")} />;
  return <HomeScreen onNew={() => setScreen("new")} onOpen={day => { setActiveDay(day); setScreen("day"); }} />;
}