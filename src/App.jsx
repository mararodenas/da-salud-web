import { useState, useEffect, useRef } from "react";
import {
  ClipboardList, Plus, LogOut, Users, AlertTriangle,
  Clock, Search, Inbox, Paperclip, FileText, Building2,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  CASE_TYPES, CASE_TYPE_CONFIG, PRIORITIES, STATUSES, STATUS_STYLE,
  displayCode, slaInfo, TONE_COLORS,
} from "./caseConfig";

const THEME = {
  "--ink": "#0F2547", "--bg": "#F4F6F5", "--surface": "#FFFFFF",
  "--primary": "#1C7F86", "--primary-dark": "#145F65", "--primary-tint": "#DCEEEC",
  "--muted": "#56697C", "--border": "#DDE3E9", "--border-strong": "#B7C2CE",
  "--font-display": "'Space Grotesk', sans-serif", "--font-body": "'IBM Plex Sans', sans-serif",
  "--font-mono": "'IBM Plex Mono', monospace",
  "--shadow": "0 1px 2px rgba(15,37,71,0.05), 0 1px 1px rgba(15,37,71,0.04)",
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
          <img src="/logo.png" alt="DA Salud" style={{ height: 34, width: "auto" }} />
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
  const [clienteId, setClienteIdRaw] = useState(
    (perfil.rol === "Cliente" || perfil.rol === "Administrador Cliente") ? perfil.cliente_id : (localStorage.getItem("da_salud_nc_cliente") || "")
  );
  const [afiliados, setAfiliados] = useState([]);
  const [afiliadoId, setAfiliadoIdRaw] = useState(localStorage.getItem("da_salud_nc_afiliado") || "");

  const setClienteId = (id) => {
    setClienteIdRaw(id);
    try { localStorage.setItem("da_salud_nc_cliente", id || ""); } catch { /* ignore */ }
  };
  const setAfiliadoId = (id) => {
    setAfiliadoIdRaw(id);
    try { localStorage.setItem("da_salud_nc_afiliado", id || ""); } catch { /* ignore */ }
  };

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
  const [lastCreated, setLastCreated] = useState(null);

  const isClientSide = perfil.rol === "Cliente" || perfil.rol === "Administrador Cliente";
  const canManagePadron = perfil.rol === "Auditor" || perfil.rol === "Coordinador" || perfil.rol === "Administrador" || perfil.rol === "Administrador Cliente";

  useEffect(() => {
    if (isClientSide) return;
    supabase.from("clientes").select("id, nombre, tipo").order("nombre").then(({ data }) => setClientes(data || []));
  }, [perfil.rol]);

  const isFirstClienteEffect = useRef(true);
  useEffect(() => {
    const wasFirst = isFirstClienteEffect.current;
    isFirstClienteEffect.current = false;
    if (!wasFirst) setAfiliadoId("");
    setShowNewAffiliate(false); setLastCreated(null);
    if (!clienteId) { setAfiliados([]); return; }
    supabase.from("afiliados").select("id, nombre, numero_afiliado, estado").eq("cliente_id", clienteId).order("nombre")
      .then(({ data }) => setAfiliados(data || []));
  }, [clienteId]);

  useEffect(() => {
    setDetailValue(""); setShowNewItem(false); setLastCreated(null);
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
    setSaving(true); setError(""); setLastCreated(null);
    const { error } = await supabase.from("casos").insert({
      tipo, cliente_id: clienteId,
      afiliado_id: afiliadoId || null,
      catalogo_item_id: detailValue || null,
      titulo: title.trim(), descripcion: description.trim(), prioridad: priority,
    });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setLastCreated(title.trim());
    setTitle(""); setTitleTouched(false); setDescription(""); setDetailValue(""); setShowNewItem(false);
    onCreated();
  };

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Nuevo caso</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>El plazo de respuesta y el auditor se calculan solos.</p>

      {lastCreated && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap",
          background: "#EAF3DE", color: "#27500A", padding: "10px 14px", borderRadius: 10, fontSize: 13, marginBottom: 20,
        }}>
          <span>✓ Caso creado: <strong>{lastCreated}</strong>. Podés cargar otra prestación para el mismo afiliado, o</span>
          <button onClick={() => goTo("casos")} style={{ background: "transparent", border: "none", color: "#1F4F45", fontWeight: 600, cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", textDecoration: "underline" }}>
            ir a Casos
          </button>
        </div>
      )}

      {!isClientSide && (
        <>
          <label style={labelStyle}>Solicitante</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre} · {c.tipo}</option>)}
          </select>
        </>
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
            {canManagePadron && <option value="__new__">+ Agregar afiliado al padrón</option>}
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
        <option value="__new__">+ Agregar {CASE_TYPE_CONFIG[tipo].fieldLabel.toLowerCase()}</option>
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

function CasesView({ refreshKey, perfil }) {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [expandedId, setExpandedId] = useState(null);
  const [bump, setBump] = useState(0);

  const canDecide = perfil.rol === "Auditor" || perfil.rol === "Coordinador" || perfil.rol === "Administrador";

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.from("casos")
      .select("id, titulo, descripcion, tipo, estado, prioridad, vence_en, creado_en, clientes(nombre), afiliados(nombre, numero_afiliado), asignado:perfiles!casos_asignado_a_fkey(nombre)")
      .order("creado_en", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(error.message); else setCasos(data || []);
        setLoading(false);
      });
    return () => { active = false; };
  }, [refreshKey, bump]);

  const filtered = casos.filter((c) => {
    if (statusFilter !== "all" && c.estado !== statusFilter) return false;
    if (tipoFilter !== "all" && c.tipo !== tipoFilter) return false;
    if (q.trim() && !(c.titulo + " " + (c.clientes?.nombre || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>
        Casos ({filtered.length})
      </h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 16 }}>Filtrados automáticamente según tu acceso.</p>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <div style={{ position: "relative", flex: "1 1 220px" }}>
          <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 11, top: 11 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título o cliente" style={{ ...inputStyle, paddingLeft: 32 }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...inputStyle, flex: "1 1 160px" }}>
          <option value="all">Todos los estados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={tipoFilter} onChange={(e) => setTipoFilter(e.target.value)} style={{ ...inputStyle, flex: "1 1 180px" }}>
          <option value="all">Todos los tipos</option>
          {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {loading && <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>}
      {error && <div style={{ fontSize: 13, color: "#791F1F", background: "#FCEBEB", padding: "10px 12px", borderRadius: 8 }}>{error}</div>}

      {!loading && !error && (
        filtered.length === 0 ? (
          <EmptyState icon={Inbox} text="No hay casos para mostrar todavía." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((c) => (
              <CaseCard
                key={c.id} c={c} now={now} canDecide={canDecide} perfil={perfil}
                expanded={expandedId === c.id}
                onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                onChanged={() => setBump((b) => b + 1)}
              />
            ))}
          </div>
        )
      )}
    </div>
  );
}

function CaseCard({ c, now, canDecide, perfil, expanded, onToggle, onChanged }) {
  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [adjuntos, setAdjuntos] = useState([]);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const st = STATUS_STYLE[c.estado] || { bg: "#eee", fg: "#333" };
  const sla = slaInfo(c.vence_en, c.estado, now);
  const tone = TONE_COLORS[sla.tone];

  useEffect(() => {
    if (!expanded) return;
    setLoadingNotas(true);
    supabase.from("notas").select("texto, creado_en").eq("caso_id", c.id).order("creado_en", { ascending: false })
      .then(({ data }) => { setNotas(data || []); setLoadingNotas(false); });
    setLoadingAdjuntos(true);
    supabase.from("adjuntos").select("id, nombre_archivo, ruta, creado_en").eq("caso_id", c.id).order("creado_en", { ascending: false })
      .then(({ data }) => { setAdjuntos(data || []); setLoadingAdjuntos(false); });
  }, [expanded, c.id]);

  const changeStatus = async (estado) => {
    setSavingStatus(true);
    await supabase.from("casos").update({ estado }).eq("id", c.id);
    setSavingStatus(false);
    onChanged();
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const { error } = await supabase.from("notas").insert({ caso_id: c.id, texto: note.trim() });
    if (!error) {
      setNotas((prev) => [{ texto: note.trim(), creado_en: new Date().toISOString() }, ...prev]);
      setNote("");
    }
    setSavingNote(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setUploadError("El archivo supera los 10 MB."); return; }
    setUploading(true); setUploadError("");
    const safeName = file.name
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${c.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("adjuntos").upload(path, file);
    if (upErr) { setUploadError(upErr.message); setUploading(false); return; }
    const { data, error: insErr } = await supabase.from("adjuntos")
      .insert({ caso_id: c.id, nombre_archivo: file.name, ruta: path }).select().single();
    if (insErr) { setUploadError(insErr.message); setUploading(false); return; }
    setAdjuntos((prev) => [data, ...prev]);
    setUploading(false);
  };

  const viewFile = async (ruta) => {
    const { data, error } = await supabase.storage.from("adjuntos").createSignedUrl(ruta, 60);
    if (!error && data) window.open(data.signedUrl, "_blank");
  };

  return (
    <div style={{ ...cardStyle, overflow: "hidden" }}>
      <button onClick={onToggle} style={{
        width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer",
        padding: "13px 16px", display: "flex", flexDirection: "column", gap: 6, fontFamily: "var(--font-body)",
      }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{displayCode(c.id)}</span>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{c.titulo}</div>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {c.tipo} · {c.clientes?.nombre || "—"}
          {c.asignado?.nombre ? " · asignado a " + c.asignado.nombre : " · sin asignar"}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
          <Pill bg={st.bg} fg={st.fg}>{c.estado}</Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: tone.bg, color: tone.fg, fontFamily: "var(--font-mono)" }}>
            <Clock size={12} /> {sla.label}
          </span>
        </div>
      </button>

      {expanded && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
          {c.descripcion && (
            <div style={{ fontSize: 13, color: "var(--ink)", background: "var(--bg)", padding: 12, borderRadius: 8, margin: "14px 0" }}>
              {c.descripcion}
            </div>
          )}
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, marginBottom: 14, marginTop: c.descripcion ? 0 : 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Afiliado</div>
              <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.afiliados?.nombre || "—"}{c.afiliados?.numero_afiliado ? " · N° " + c.afiliados.numero_afiliado : ""}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Asignado a</div>
              <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.asignado?.nombre || "Sin asignar"}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Prioridad</div>
              <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.prioridad}</div>
            </div>
          </div>

          {canDecide && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {STATUSES.map((s) => (
                <button key={s} disabled={savingStatus || c.estado === s} onClick={() => changeStatus(s)} style={{
                  padding: "6px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, fontFamily: "var(--font-body)",
                  border: c.estado === s ? "1.5px solid var(--primary)" : "1px solid var(--border)",
                  background: c.estado === s ? "var(--primary-tint)" : "var(--surface)",
                  color: c.estado === s ? "var(--primary-dark)" : "var(--ink)",
                  cursor: c.estado === s ? "default" : "pointer",
                }}>
                  {s}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>
              Adjuntos {loadingAdjuntos ? "" : `(${adjuntos.length})`}
            </span>
            <label style={{
              fontSize: 12, fontWeight: 500, color: "var(--primary-dark)", cursor: uploading ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <Paperclip size={13} /> {uploading ? "Subiendo..." : "Adjuntar archivo"}
              <input type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
            </label>
          </div>
          {uploadError && <div style={{ fontSize: 12, color: "#791F1F", background: "#FCEBEB", padding: "6px 10px", borderRadius: 8, marginBottom: 8 }}>{uploadError}</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {!loadingAdjuntos && adjuntos.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Todavía no hay archivos adjuntos.</div>}
            {adjuntos.map((a) => (
              <button key={a.id} onClick={() => viewFile(a.ruta)} style={{
                display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface)", cursor: "pointer",
                fontSize: 12.5, color: "var(--ink)", textAlign: "left", fontFamily: "var(--font-body)",
              }}>
                <FileText size={14} color="var(--muted)" style={{ flexShrink: 0 }} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nombre_archivo}</span>
              </button>
            ))}
          </div>

          <div style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)", marginBottom: 8 }}>
            Notas {loadingNotas ? "" : `(${notas.length})`}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10, maxHeight: 180, overflowY: "auto" }}>
            {!loadingNotas && notas.length === 0 && <div style={{ fontSize: 12, color: "var(--muted)" }}>Todavía no hay notas.</div>}
            {notas.map((n, i) => (
              <div key={i} style={{ fontSize: 12.5, background: "var(--bg)", borderRadius: 8, padding: "8px 10px" }}>
                <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{new Date(n.creado_en).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                <div style={{ color: "var(--ink)", marginTop: 2 }}>{n.texto}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} placeholder="Agregar una nota..." style={{ ...inputStyle, flex: 1 }} />
            <button onClick={addNote} disabled={!note.trim() || savingNote} style={btnPrimary(!!note.trim())}>Enviar</button>
          </div>
        </div>
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
  const [view, setViewRaw] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const setView = (v) => {
    setViewRaw(v);
    try { localStorage.setItem("da_salud_view", v); } catch { /* ignore */ }
  };

  useEffect(() => {
    supabase.from("perfiles").select("nombre, rol, cliente_id, clientes(nombre)").eq("id", session.user.id).single()
      .then(({ data }) => {
        const p = data ? { ...data, cliente_nombre: data.clientes?.nombre } : null;
        setPerfil(p);
        if (p) {
          let saved = null;
          try { saved = localStorage.getItem("da_salud_view"); } catch { /* ignore */ }
          setViewRaw(saved || ((p.rol === "Auditor" || p.rol === "Coordinador" || p.rol === "Administrador") ? "casos" : "padron"));
        }
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
          <img src="/logo.png" alt="DA Salud" style={{ height: 28, width: "auto" }} />
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
          {perfil.cliente_nombre && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
              background: "var(--primary-tint)", border: "1px solid var(--primary)",
            }}>
              <Building2 size={13} color="var(--primary-dark)" />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)" }}>{perfil.cliente_nombre}</span>
            </div>
          )}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{perfil.nombre}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{perfil.rol}</div>
          </div>
          <button onClick={() => supabase.auth.signOut()} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12.5, fontFamily: "var(--font-body)" }}>
            <LogOut size={14} /> Salir
          </button>
        </div>
      </header>

      {view === "padron" && <PadronView />}
      {view === "nuevo" && <NewCaseView perfil={perfil} goTo={setView} onCreated={() => setRefreshKey((k) => k + 1)} />}
      {view === "casos" && <CasesView refreshKey={refreshKey} perfil={perfil} />}
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
