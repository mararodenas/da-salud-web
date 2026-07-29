import { useState, useEffect } from "react";
import {
  ClipboardList, Plus, LogOut, Users, AlertTriangle,
  Clock, Search, Inbox,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  CASE_TYPES, CASE_TYPE_CONFIG, PRIORITIES, STATUS_STYLE,
  displayCode, slaInfo, TONE_COLORS,
} from "./caseConfig";

const THEME = {
  "--ink": "#16302B", "--bg": "#EEF1EF", "--surface": "#FFFFFF",
  "--primary": "#2F6F62", "--primary-dark": "#1F4F45", "--primary-tint": "#E1EEEA",
  "--muted": "#5B6B66", "--border": "#DCE3DF", "--border-strong": "#B9C4BE",
  "--font-display": "'Space Grotesk', sans-serif", "--font-body": "'IBM Plex Sans', sans-serif",
  "--font-mono": "'IBM Plex Mono', monospace",
  "--shadow": "0 1px 2px rgba(22,48,43,0.05), 0 1px 1px rgba(22,48,43,0.04)",
};

const inputStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid var(--border)",
  fontSize: 14, fontFamily: "var(--font-body)", color: "var(--ink)", background: "var(--surface)",
  boxSizing: "border-box", outline: "none",
};
const labelStyle = { fontSize: 12, fontWeight: 500, color: "var(--muted)", display: "block", marginBottom: 6 };
const cardStyle = { border: "1px solid var(--border)", borderRadius: 14, background: "var(--surface)", boxShadow: "var(--shadow)" };
const btnPrimary = (enabled) => ({
  padding: "11px 20px", borderRadius: 9, border: "none",
  background: enabled ? "var(--primary)" : "var(--border)", color: "#fff", fontWeight: 500, fontSize: 14,
  cursor: enabled ? "pointer" : "not-allowed", display: "inline-flex", alignItems: "center", gap: 8,
  fontFamily: "var(--font-body)",
});

/* ---------- login ---------- */

function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg)", padding: 24 }}>
      <form onSubmit={submit} style={{ ...cardStyle, width: "100%", maxWidth: 380, padding: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={17} color="#fff" />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 18, color: "var(--ink)" }}>DA Salud</div>
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>Ingresá con tu usuario para continuar</div>

        <label style={labelStyle}>Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />

        <label style={{ ...labelStyle, marginTop: 16 }}>Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={inputStyle} />

        {error && (
          <div style={{ marginTop: 14, fontSize: 12.5, color: "#791F1F", background: "#FCEBEB", padding: "8px 10px", borderRadius: 8 }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={loading} style={{ ...btnPrimary(true), width: "100%", justifyContent: "center", marginTop: 20 }}>
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}

/* ---------- padrón ---------- */

function PadronView() {
  const [afiliados, setAfiliados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    supabase.from("afiliados").select("nombre, numero_afiliado, estado").order("nombre").then(({ data, error }) => {
      if (!active) return;
      if (error) setError(error.message); else setAfiliados(data || []);
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Padrón</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Afiliados visibles para tu usuario, según las reglas de acceso reales.</p>

      {loading && <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>}
      {error && <div style={{ fontSize: 13, color: "#791F1F", background: "#FCEBEB", padding: "10px 12px", borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        afiliados.length === 0 ? (
          <EmptyState icon={Users} text="No hay afiliados visibles para tu usuario." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {afiliados.map((a, i) => (
              <div key={i} style={{ ...cardStyle, display: "flex", flexDirection: "column", gap: 4, padding: "12px 14px" }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{a.nombre}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>N° {a.numero_afiliado || "—"}</span>
                  <Pill bg={a.estado === "Activo" ? "#EAF3DE" : "#FCEBEB"} fg={a.estado === "Activo" ? "#27500A" : "#791F1F"}>{a.estado}</Pill>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

/* ---------- nuevo caso ---------- */

function NewCaseView({ perfil, onCreated, goTo }) {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(perfil.rol === "Cliente" ? perfil.cliente_id : "");
  const [afiliados, setAfiliados] = useState([]);
  const [afiliadoId, setAfiliadoId] = useState("");
  const [showNewAffiliate, setShowNewAffiliate] = useState(false);
  const [newAffName, setNewAffName] = useState("");
  const [newAffNumber, setNewAffNumber] = useState("");

  const [tipo, setTipo] = useState(CASE_TYPES[0]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [detailValue, setDetailValue] = useState("");
  const [showNewItem, setShowNewItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");

  const [priority, setPriority] = useState("Media");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManageCatalog = perfil.rol === "Auditor" || perfil.rol === "Coordinador";

  useEffect(() => {
    if (perfil.rol === "Cliente") return;
    supabase.from("clientes").select("id, nombre, tipo").order("nombre").then(({ data }) => setClientes(data || []));
  }, [perfil.rol]);

  useEffect(() => {
    setAfiliadoId(""); setShowNewAffiliate(false);
    if (!clienteId) { setAfiliados([]); return; }
    supabase.from("afiliados").select("id, nombre, numero_afiliado, estado").eq("cliente_id", clienteId).order("nombre")
      .then(({ data }) => setAfiliados(data || []));
  }, [clienteId]);

  useEffect(() => {
    setDetailValue(""); setShowNewItem(false);
    const key = CASE_TYPE_CONFIG[tipo].catalogKey;
    supabase.from("catalogo_items").select("id, nombre, categoria").eq("catalogo_key", key).order("nombre")
      .then(({ data }) => setCatalogItems(data || []));
  }, [tipo]);

  const afiliado = afiliados.find((a) => a.id === afiliadoId);
  const detailItem = catalogItems.find((i) => i.id === detailValue);

  useEffect(() => {
    if (titleTouched) return;
    const parts = [];
    if (afiliado) { parts.push(afiliado.nombre); if (afiliado.numero_afiliado) parts.push("N° " + afiliado.numero_afiliado); }
    if (detailItem) parts.push(detailItem.nombre);
    setTitle(parts.join(" — "));
  }, [afiliadoId, detailValue]);

  const addAffiliate = async () => {
    if (!newAffName.trim() || !clienteId) return;
    const { data, error } = await supabase.from("afiliados")
      .insert({ cliente_id: clienteId, nombre: newAffName.trim(), numero_afiliado: newAffNumber.trim(), estado: "Activo" })
      .select().single();
    if (error) { setError(error.message); return; }
    setAfiliados((prev) => [...prev, data]);
    setAfiliadoId(data.id);
    setShowNewAffiliate(false); setNewAffName(""); setNewAffNumber("");
  };

  const addCatalogItem = async () => {
    if (!newItemName.trim()) return;
    const key = CASE_TYPE_CONFIG[tipo].catalogKey;
    const { data, error } = await supabase.from("catalogo_items")
      .insert({ catalogo_key: key, nombre: newItemName.trim() }).select().single();
    if (error) { setError(error.message); return; }
    setCatalogItems((prev) => [...prev, data]);
    setDetailValue(data.id);
    setShowNewItem(false); setNewItemName("");
  };

  const submit = async () => {
    if (!title.trim() || !clienteId) return;
    setSaving(true); setError("");
    const { error } = await supabase.from("casos").insert({
      tipo, cliente_id: clienteId,
      afiliado_id: afiliadoId || null,
      catalogo_item_id: detailValue || null,
      titulo: title.trim(), descripcion: description.trim(), prioridad: priority,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setTitle(""); setTitleTouched(false); setDescription(""); setAfiliadoId("");
    onCreated();
    goTo("casos");
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Nuevo caso</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>El plazo de respuesta y el auditor se calculan solos.</p>

      <label style={labelStyle}>Solicitante</label>
      {perfil.rol === "Cliente" ? (
        <div style={{ ...inputStyle, background: "var(--bg)", color: "var(--muted)" }}>{perfil.cliente_nombre || "Tu organización"}</div>
      ) : (
        <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
          <option value="">Seleccionar cliente...</option>
          {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.tipo}</option>)}
        </select>
      )}

      {clienteId && (
        <div style={{ marginTop: 14 }}>
          <label style={labelStyle}>Afiliado</label>
          <select
            value={showNewAffiliate ? "__new__" : afiliadoId}
            onChange={(e) => { if (e.target.value === "__new__") { setShowNewAffiliate(true); return; } setShowNewAffiliate(false); setAfiliadoId(e.target.value); }}
            style={inputStyle}
          >
            <option value="">Seleccionar afiliado...</option>
            {afiliados.map((a) => <option key={a.id} value={a.id}>{a.nombre}{a.numero_afiliado ? " · N° " + a.numero_afiliado : ""}{a.estado === "Baja" ? " (Baja)" : ""}</option>)}
            <option value="__new__">+ Agregar afiliado al padrón</option>
          </select>
          {afiliado?.estado === "Baja" && (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, padding: "8px 12px", background: "#FAEEDA", color: "#633806", borderRadius: 8, fontSize: 12.5 }}>
              <AlertTriangle size={15} /> Este afiliado figura de baja en el padrón.
            </div>
          )}
          {showNewAffiliate && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              <input value={newAffName} onChange={(e) => setNewAffName(e.target.value)} placeholder="Nombre del afiliado" style={{ ...inputStyle, flex: "1 1 180px" }} />
              <input value={newAffNumber} onChange={(e) => setNewAffNumber(e.target.value)} placeholder="N° de afiliado" style={{ ...inputStyle, width: 130 }} />
              <button onClick={addAffiliate} disabled={!newAffName.trim()} style={btnPrimary(!!newAffName.trim())}>Agregar</button>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
        <div>
          <label style={labelStyle}>Tipo de auditoría</label>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
            {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inputStyle}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <label style={{ ...labelStyle, marginTop: 14 }}>{CASE_TYPE_CONFIG[tipo].fieldLabel}</label>
      <select
        value={showNewItem ? "__new__" : detailValue}
        onChange={(e) => { if (e.target.value === "__new__") { setShowNewItem(true); return; } setShowNewItem(false); setDetailValue(e.target.value); }}
        style={inputStyle}
      >
        <option value="">Seleccionar...</option>
        {catalogItems.map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
        {canManageCatalog && <option value="__new__">+ Agregar {CASE_TYPE_CONFIG[tipo].fieldLabel.toLowerCase()}</option>}
      </select>
      {showNewItem && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addCatalogItem} disabled={!newItemName.trim()} style={btnPrimary(!!newItemName.trim())}>Agregar</button>
        </div>
      )}

      <label style={{ ...labelStyle, marginTop: 14 }}>Título del caso</label>
      <input value={title} onChange={(e) => { setTitle(e.target.value); setTitleTouched(true); }} style={inputStyle} />

      <label style={{ ...labelStyle, marginTop: 14 }}>Descripción</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical" }} />

      {error && <div style={{ marginTop: 14, fontSize: 12.5, color: "#791F1F", background: "#FCEBEB", padding: "8px 10px", borderRadius: 8 }}>{error}</div>}

      <button onClick={submit} disabled={!title.trim() || !clienteId || saving} style={{ ...btnPrimary(!!title.trim() && !!clienteId), marginTop: 20 }}>
        <Plus size={16} /> {saving ? "Creando..." : "Crear caso"}
      </button>
    </div>
  );
}

/* ---------- casos ---------- */

function CasesView({ refreshKey }) {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from("casos")
      .select("id, titulo, tipo, estado, prioridad, vence_en, creado_en, clientes(nombre), afiliados(nombre, numero_afiliado)")
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message); else setCasos(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey]);

  const filtered = casos.filter((c) => !q.trim() || (c.titulo + " " + (c.clientes?.nombre || "")).toLowerCase().includes(q.toLowerCase()));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>
        Casos ({filtered.length})
      </h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Filtrados automáticamente según tu acceso.</p>

      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 11, top: 11 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o cliente" style={{ ...inputStyle, paddingLeft: 32 }} />
      </div>

      {loading && <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>}
      {error && <div style={{ fontSize: 13, color: "#791F1F", background: "#FCEBEB", padding: "10px 12px", borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        filtered.length === 0 ? (
          <EmptyState icon={Inbox} text="No hay casos para mostrar todavía." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((c) => {
              const st = STATUS_STYLE[c.estado] || { bg: "#eee", fg: "#333" };
              const sla = slaInfo(c.vence_en, c.estado, now);
              const tone = TONE_COLORS[sla.tone];
              return (
                <div key={c.id} style={{ ...cardStyle, padding: "13px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{displayCode(c.id)}</span>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{c.titulo}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.tipo} · {c.clientes?.nombre || "—"}</div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    <Pill bg={st.bg} fg={st.fg}>{c.estado}</Pill>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: tone.bg, color: tone.fg, fontFamily: "var(--font-mono)" }}>
                      <Clock size={12} /> {sla.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

/* ---------- shared atoms ---------- */

function Pill({ children, bg, fg }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500, background: bg, color: fg, whiteSpace: "nowrap" }}>{children}</span>;
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: "var(--muted)", border: "1px dashed var(--border-strong)", borderRadius: 14 }}>
      <Icon size={26} style={{ marginBottom: 10, opacity: 0.55 }} />
      <div style={{ fontSize: 14 }}>{text}</div>
    </div>
  );
}

/* ---------- shell ---------- */

function AppShell({ session }) {
  const [perfil, setPerfil] = useState(null);
  const [view, setView] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    supabase.from("perfiles").select("nombre, rol, cliente_id, clientes(nombre)").eq("id", session.user.id).single()
      .then(({ data }) => {
        const p = data ? { ...data, cliente_nombre: data.clientes?.nombre } : null;
        setPerfil(p);
        if (p) setView(p.rol === "Auditor" || p.rol === "Coordinador" ? "casos" : "padron");
      });
  }, [session]);

  if (!perfil || !view) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;

  const NAV = [
    ["padron", "Padrón", Users],
    ["nuevo", "Nuevo caso", Plus],
    ["casos", "Casos", ClipboardList],
  ];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 24px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <ClipboardList size={16} color="#fff" />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 15.5, color: "var(--ink)" }}>DA Salud</div>
        </div>

        <nav style={{ display: "flex", gap: 4 }}>
          {NAV.map(([key, label, Icon]) => (
            <button key={key} onClick={() => setView(key)} style={{
              display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", borderRadius: 8, border: "none", cursor: "pointer",
              fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)",
              background: view === key ? "var(--primary-tint)" : "transparent", color: view === key ? "var(--primary-dark)" : "var(--muted)",
            }}>
              <Icon size={15} /> {label}
            </button>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{perfil.nombre}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{perfil.rol}{perfil.cliente_nombre ? " · " + perfil.cliente_nombre : ""}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12.5, fontFamily: "var(--font-body)" }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {view === "padron" && <PadronView />}
      {view === "nuevo" && <NewCaseView perfil={perfil} goTo={setView} onCreated={() => setRefreshKey((k) => k + 1)} />}
      {view === "casos" && <CasesView refreshKey={refreshKey} />}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  if (session === undefined) return <div style={{ ...THEME, minHeight: "100vh", background: "var(--bg)" }} />;

  return (
    <div style={{ ...THEME, fontFamily: "var(--font-body)" }}>
      {session ? <AppShell session={session} /> : <LoginScreen />}
    </div>
  );
}
