import { useState, useEffect, useRef } from "react";
import {
  ClipboardList, Plus, LogOut, Users, AlertTriangle,
  Clock, Search, Inbox, Paperclip, FileText, Building2, ShieldCheck,
  ChevronDown, ChevronRight, BedDouble, Receipt, Ambulance, BarChart3, Upload, X, Stethoscope,
} from "lucide-react";
import { supabase } from "./supabaseClient";
import {
  CASE_TYPES, CASE_TYPE_CONFIG, PRIORITIES, STATUSES, STATUS_STYLE,
  displayCode, slaInfo, TONE_COLORS,
} from "./caseConfig";

const CLIENT_TYPES = ["Obra social", "Prepaga", "Prestador", "ART", "Otro"];

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

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNacimiento);
  if (Number.isNaN(nacimiento.getTime())) return null;
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

function splitCsvLine(line) {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; continue; }
    if (c === "," && !inQuotes) { result.push(cur.trim()); cur = ""; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function fechaDdMmAaaaAIso(str) {
  if (!str) return null;
  const s = str.trim();
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!m) return null;
  const [, dd, mm, aaaa] = m;
  return `${aaaa}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function parseAfiliadosCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

const AFILIADO_CAMPOS = [
  ["nombre", "Nombre y apellido"], ["dni", "DNI"], ["fecha_nacimiento", "Fecha de nacimiento"],
  ["numero_afiliado", "N° Afiliado"], ["provincia", "Provincia"], ["partido", "Partido/Departamento"], ["localidad", "Localidad"],
  ["domicilio", "Domicilio"], ["telefono_celular", "Teléfono celular"], ["email", "Correo electrónico"],
  ["plan_contratado", "Plan contratado"],
];

function emptyAfiliadoForm() {
  return { nombre: "", dni: "", fecha_nacimiento: "", numero_afiliado: "", provincia: "", partido: "", localidad: "", domicilio: "", telefono_celular: "", email: "", plan_id: "", estado: "Activo", titular_id: "" };
}

const GEOREF_BASE = "https://apis.datos.gob.ar/georef/api";

async function georefFetch(recurso, params) {
  try {
    const qs = new URLSearchParams(params).toString();
    const res = await fetch(`${GEOREF_BASE}/${recurso}?${qs}`);
    const data = await res.json();
    return data[recurso] || [];
  } catch {
    return [];
  }
}

function georefIdFor(lista, nombre) {
  return lista.find((x) => x.nombre === nombre)?.id;
}

function PadronView({ perfil }) {
  const isDaSalud = ["Administrador", "Coordinador", "Auditor"].includes(perfil.rol);
  const isPrestador = perfil.rol === "Prestador";
  const needsSelector = isDaSalud || isPrestador;
  const canManage = isDaSalud || perfil.rol === "Administrador Cliente";

  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(needsSelector ? "" : perfil.cliente_id);

  const [afiliados, setAfiliados] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyAfiliadoForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  const [provincias, setProvincias] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    georefFetch("provincias", { campos: "id,nombre", max: 24, orden: "nombre" }).then(setProvincias);
  }, []);

  useEffect(() => {
    if (!form.provincia) { setPartidos([]); return; }
    const provinciaId = georefIdFor(provincias, form.provincia);
    if (!provinciaId) { setPartidos([]); return; }
    georefFetch("departamentos", { provincia: provinciaId, campos: "id,nombre", max: 300, orden: "nombre" }).then(setPartidos);
  }, [form.provincia, provincias]);

  useEffect(() => {
    if (!form.partido) { setLocalidades([]); return; }
    const partidoId = georefIdFor(partidos, form.partido);
    if (!partidoId) { setLocalidades([]); return; }
    georefFetch("localidades", { departamento: partidoId, campos: "id,nombre", max: 800, orden: "nombre" }).then(setLocalidades);
  }, [form.partido, partidos]);

  useEffect(() => {
    if (isDaSalud) {
      supabase.from("clientes").select("id, nombre").order("nombre").then(({ data }) => setClientes(data || []));
    } else if (isPrestador) {
      setClientes(perfil.clientesContratados || []);
    }
  }, [isDaSalud, isPrestador]);

  const [planes, setPlanes] = useState([]);
  useEffect(() => {
    if (!clienteId) { setPlanes([]); return; }
    supabase.from("planes").select("id, nombre, contrato_ruta").eq("cliente_id", clienteId).eq("activo", true).order("nombre")
      .then(({ data }) => setPlanes(data || []));
  }, [clienteId]);

  const loadAfiliados = () => {
    setShowForm(false); setShowBulk(false); setBulkStatus("");
    if (!clienteId) { setAfiliados([]); return; }
    setLoading(true); setError("");
    supabase.from("afiliados")
      .select("id, nombre, dni, fecha_nacimiento, numero_afiliado, provincia, partido, localidad, domicilio, telefono_celular, email, plan_id, plan_contratado, estado, titular_id")
      .eq("cliente_id", clienteId).order("nombre")
      .then(({ data, error }) => {
        if (error) setError(error.message); else setAfiliados(data || []);
        setLoading(false);
      });
  };
  useEffect(loadAfiliados, [clienteId]);

  const q = search.trim().toLowerCase();
  const filtrados = !q ? afiliados : afiliados.filter((a) =>
    (a.nombre || "").toLowerCase().includes(q) ||
    (a.dni || "").toLowerCase().includes(q) ||
    (a.numero_afiliado || "").toLowerCase().includes(q)
  );

  const openNew = () => { setEditingId(null); setForm(emptyAfiliadoForm()); setFormError(""); setShowBulk(false); setShowForm(true); };
  const openEdit = (a) => {
    if (!canManage) return;
    setEditingId(a.id);
    setForm({
      nombre: a.nombre || "", dni: a.dni || "", fecha_nacimiento: a.fecha_nacimiento || "",
      numero_afiliado: a.numero_afiliado || "", provincia: a.provincia || "", partido: a.partido || "", localidad: a.localidad || "",
      domicilio: a.domicilio || "", telefono_celular: a.telefono_celular || "", email: a.email || "",
      plan_id: a.plan_id || "", estado: a.estado || "Activo", titular_id: a.titular_id || "",
    });
    setFormError(""); setShowBulk(false); setShowForm(true);
  };
  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardarAfiliado = async () => {
    if (!form.nombre.trim() || !clienteId) return;
    setSaving(true); setFormError("");
    const payload = { ...form, cliente_id: clienteId, fecha_nacimiento: form.fecha_nacimiento || null, titular_id: form.titular_id || null, plan_id: form.plan_id || null };
    const { error } = editingId
      ? await supabase.from("afiliados").update(payload).eq("id", editingId)
      : await supabase.from("afiliados").insert(payload);
    setSaving(false);
    if (error) { setFormError(error.message); return; }
    loadAfiliados();
  };

  const subirMasivo = async () => {
    if (!bulkFile || !clienteId) return;
    setBulkLoading(true); setBulkStatus("");
    try {
      const text = await bulkFile.text();
      const filas = parseAfiliadosCsv(text);
      if (filas.length === 0) { setBulkStatus("El archivo no tiene filas para cargar."); setBulkLoading(false); return; }
      const fechasInvalidas = [];
      const payload = filas.map((f, i) => {
        let fecha = null;
        if (f.fecha_nacimiento) {
          fecha = fechaDdMmAaaaAIso(f.fecha_nacimiento);
          if (!fecha) fechasInvalidas.push(`fila ${i + 2}: "${f.fecha_nacimiento}"`);
        }
        return {
          cliente_id: clienteId,
          nombre: f.nombre || "", dni: f.dni || "", fecha_nacimiento: fecha,
          numero_afiliado: f.numero_afiliado || "", provincia: f.provincia || "", partido: f.partido || "", localidad: f.localidad || "",
          domicilio: f.domicilio || "", telefono_celular: f.telefono_celular || "", email: f.email || "",
          plan_contratado: f.plan_contratado || "", estado: f.estado || "Activo",
        };
      });
      if (fechasInvalidas.length > 0) {
        setBulkLoading(false);
        setBulkStatus(`Hay fechas con formato inválido (tiene que ser DD-MM-AAAA): ${fechasInvalidas.join(", ")}.`);
        return;
      }
      const { error } = await supabase.from("afiliados").insert(payload);
      setBulkLoading(false);
      if (error) { setBulkStatus("Error: " + error.message); return; }
      setBulkStatus(`✓ ${payload.length} afiliados cargados.`);
      setBulkFile(null);
      loadAfiliados();
    } catch (e) {
      setBulkLoading(false);
      setBulkStatus("No se pudo leer el archivo.");
    }
  };

  const thStyle = { textAlign: "left", padding: "9px 10px", fontSize: 11, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--muted)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 10px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Padrón</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Afiliados visibles para tu usuario, según las reglas de acceso reales.</p>

      {needsSelector && (
        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ ...inputStyle, maxWidth: 360 }}>
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      )}

      {clienteId && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
            <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
              <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por apellido y nombre, DNI o N° afiliado..."
                style={{ ...inputStyle, paddingLeft: 34 }}
              />
            </div>
            {canManage && (
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => { setShowBulk((v) => !v); setShowForm(false); }} style={{ ...btnPrimary(true), background: "var(--surface)", color: "var(--primary-dark)", border: "1px solid var(--primary)" }}>
                  <Upload size={15} /> Carga masiva
                </button>
                <button onClick={openNew} style={btnPrimary(true)}>
                  <Plus size={15} /> Agregar afiliado
                </button>
              </div>
            )}
          </div>

          {showBulk && (
            <div style={{ ...cardStyle, padding: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Carga masiva de afiliados</div>
              <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
                Subí un archivo CSV con la primera fila como encabezado, con estas columnas en cualquier orden:{" "}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                  nombre, dni, fecha_nacimiento, numero_afiliado, provincia, partido, localidad, domicilio, telefono_celular, email, plan_contratado, estado
                </span>. La fecha de nacimiento en formato DD-MM-AAAA.
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <input type="file" accept=".csv,text/csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5, fontFamily: "var(--font-body)" }} />
                <button onClick={subirMasivo} disabled={!bulkFile || bulkLoading} style={btnPrimary(!!bulkFile && !bulkLoading)}>
                  {bulkLoading ? "Subiendo..." : "Subir archivo"}
                </button>
              </div>
              {bulkStatus && <div style={{ marginTop: 10, fontSize: 12.5, color: bulkStatus.startsWith("Error") || bulkStatus.startsWith("No se") ? "#A13333" : "#27500A" }}>{bulkStatus}</div>}
            </div>
          )}

          {showForm && (
            <div
              onClick={() => setShowForm(false)}
              style={{
                position: "fixed", inset: 0, background: "rgba(15,37,71,0.4)", zIndex: 1000,
                display: "flex", alignItems: "flex-start", justifyContent: "center",
                padding: "40px 20px", overflowY: "auto",
              }}
            >
            <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, marginBottom: 20, maxWidth: 780, width: "100%" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{editingId ? "Editar afiliado" : "Nuevo afiliado"}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                    {isDaSalud ? (clientes.find((c) => c.id === clienteId)?.nombre || "") : (perfil.cliente_nombre || "")}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 210 }}>
                    <label style={labelStyle}>Plan contratado</label>
                    <select value={form.plan_id} onChange={(e) => setCampo("plan_id", e.target.value)} style={inputStyle}>
                      <option value="">Sin plan asignado</option>
                      {planes.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                    </select>
                    {form.plan_id && planes.find((p) => p.id === form.plan_id)?.contrato_ruta && (
                      <button onClick={() => verContratoDePlan(form.plan_id)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 11.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", marginTop: 4, padding: 0 }}>
                        <FileText size={12} /> Ver contrato del plan
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowForm(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", marginTop: 18 }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label style={labelStyle}>Nombre y apellido</label>
                  <input value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>DNI</label>
                  <input value={form.dni} onChange={(e) => setCampo("dni", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Fecha de nacimiento</label>
                  <input type="date" value={form.fecha_nacimiento} onChange={(e) => setCampo("fecha_nacimiento", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>N° Afiliado</label>
                  <input value={form.numero_afiliado} onChange={(e) => setCampo("numero_afiliado", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Provincia</label>
                  <select
                    value={form.provincia}
                    onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value, partido: "", localidad: "" }))}
                    style={inputStyle}
                  >
                    <option value="">Seleccionar...</option>
                    {(form.provincia && !provincias.some((p) => p.nombre === form.provincia)) && <option value={form.provincia}>{form.provincia}</option>}
                    {provincias.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Partido/Departamento</label>
                  <select
                    value={form.partido}
                    onChange={(e) => setForm((f) => ({ ...f, partido: e.target.value, localidad: "" }))}
                    style={inputStyle}
                    disabled={!form.provincia}
                  >
                    <option value="">{form.provincia ? "Seleccionar..." : "Elegí primero la provincia"}</option>
                    {(form.partido && !partidos.some((p) => p.nombre === form.partido)) && <option value={form.partido}>{form.partido}</option>}
                    {partidos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Localidad</label>
                  <select
                    value={form.localidad}
                    onChange={(e) => setCampo("localidad", e.target.value)}
                    style={inputStyle}
                    disabled={!form.partido}
                  >
                    <option value="">{form.partido ? "Seleccionar..." : "Elegí primero el partido"}</option>
                    {(form.localidad && !localidades.some((l) => l.nombre === form.localidad)) && <option value={form.localidad}>{form.localidad}</option>}
                    {localidades.map((l) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Domicilio</label>
                  <input value={form.domicilio} onChange={(e) => setCampo("domicilio", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono celular</label>
                  <input value={form.telefono_celular} onChange={(e) => setCampo("telefono_celular", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Correo electrónico</label>
                  <input type="email" value={form.email} onChange={(e) => setCampo("email", e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Estado</label>
                  <select value={form.estado} onChange={(e) => setCampo("estado", e.target.value)} style={inputStyle}>
                    <option value="Activo">Activo</option>
                    <option value="Baja">Baja</option>
                  </select>
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>Grupo familiar — Titular</label>
                  <select value={form.titular_id} onChange={(e) => setCampo("titular_id", e.target.value)} style={inputStyle}>
                    <option value="">Es titular / independiente</option>
                    {afiliados.filter((a) => !a.titular_id && a.id !== editingId).map((a) => (
                      <option key={a.id} value={a.id}>{a.nombre}{a.dni ? " · DNI " + a.dni : ""}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                    Para menores u otros integrantes de un grupo familiar, elegí quién es el titular (padre/madre/tutor). Dejalo en "Es titular" si esta persona no depende de nadie.
                  </div>
                </div>
              </div>

              {formError && <div style={{ marginTop: 12, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{formError}</div>}

              <button onClick={guardarAfiliado} disabled={!form.nombre.trim() || saving} style={{ ...btnPrimary(!!form.nombre.trim()), marginTop: 16 }}>
                {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Agregar afiliado"}
              </button>
            </div>
            </div>
          )}

          {loading && <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>}
          {error && <div style={{ fontSize: 13, color: "#791F1F", background: "#FCEBEB", padding: "10px 12px", borderRadius: 8 }}>{error}</div>}

          {!loading && !error && (
            filtrados.length === 0 ? (
              <EmptyState icon={Users} text={afiliados.length === 0 ? "No hay afiliados cargados para este cliente." : "Ningún afiliado coincide con la búsqueda."} />
            ) : (
              <div style={{ ...cardStyle, overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%" }}>
                  <thead>
                    <tr>
                      {AFILIADO_CAMPOS.map(([campo, label]) => <th key={campo} style={thStyle}>{label}</th>)}
                      <th style={thStyle}>Edad</th>
                      <th style={thStyle}>Titular</th>
                      <th style={thStyle}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtrados.map((a) => {
                      const edad = calcularEdad(a.fecha_nacimiento);
                      const esMenor = edad !== null && edad < 18;
                      const titular = a.titular_id ? afiliados.find((x) => x.id === a.titular_id) : null;
                      const plan = a.plan_id ? planes.find((p) => p.id === a.plan_id) : null;
                      return (
                        <tr
                          key={a.id}
                          onClick={() => openEdit(a)}
                          style={{ cursor: canManage ? "pointer" : "default" }}
                          onMouseEnter={(e) => { if (canManage) e.currentTarget.style.background = "var(--bg)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                        >
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{a.nombre || "—"}</td>
                          <td style={tdStyle}>{a.dni || "—"}</td>
                          <td style={tdStyle}>{a.fecha_nacimiento || "—"}</td>
                          <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{a.numero_afiliado || "—"}</td>
                          <td style={tdStyle}>{a.provincia || "—"}</td>
                          <td style={tdStyle}>{a.partido || "—"}</td>
                          <td style={tdStyle}>{a.localidad || "—"}</td>
                          <td style={tdStyle}>{a.domicilio || "—"}</td>
                          <td style={tdStyle}>{a.telefono_celular || "—"}</td>
                          <td style={tdStyle}>{a.email || "—"}</td>
                          <td style={tdStyle}>
                            {plan ? (
                              plan.contrato_ruta ? (
                                <button onClick={(e) => { e.stopPropagation(); verContratoStorage(plan.contrato_ruta); }} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0 }}>
                                  <FileText size={12} /> {plan.nombre}
                                </button>
                              ) : plan.nombre
                            ) : (a.plan_contratado || "—")}
                          </td>
                          <td style={tdStyle}>
                            {edad === null ? "—" : edad}
                            {esMenor && <span style={{ marginLeft: 6 }}><Pill bg="#FAEEDA" fg="#633806">Menor</Pill></span>}
                          </td>
                          <td style={tdStyle}>{titular ? titular.nombre : "—"}</td>
                          <td style={tdStyle}>
                            <Pill bg={a.estado === "Activo" ? "#EAF3DE" : "#FCEBEB"} fg={a.estado === "Activo" ? "#27500A" : "#791F1F"}>{a.estado}</Pill>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}

/* ---------- selector de catálogo en cascada ---------- */

function CatalogPicker({ catalogoKey, onChange, canManage }) {
  const [levels, setLevels] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(true);

  const loadLevel = async (parentId) => {
    let q = supabase.from("catalogo_items").select("id, nombre").eq("catalogo_key", catalogoKey).order("nombre");
    q = parentId === null ? q.is("parent_id", null) : q.eq("parent_id", parentId);
    const { data } = await q;
    return data || [];
  };

  useEffect(() => {
    let active = true;
    setLoading(true); setShowAdd(false);
    loadLevel(null).then((items) => {
      if (!active) return;
      setLevels([{ parentId: null, items, selected: "" }]);
      setLoading(false);
      onChange("", "");
    });
    return () => { active = false; };
  }, [catalogoKey]);

  const selectAt = async (depth, id) => {
    if (id === "__new__") { setShowAdd(true); return; }
    setShowAdd(false);
    const trimmed = levels.slice(0, depth + 1);
    trimmed[depth] = { ...trimmed[depth], selected: id };
    if (!id) { setLevels(trimmed); onChange("", ""); return; }
    const item = trimmed[depth].items.find((i) => i.id === id);
    const children = await loadLevel(id);
    if (children.length > 0) {
      setLevels([...trimmed, { parentId: id, items: children, selected: "" }]);
      onChange("", "");
    } else {
      setLevels(trimmed);
      onChange(id, item?.nombre || "");
    }
  };

  const addItem = async () => {
    if (!newName.trim()) return;
    const depth = levels.length - 1;
    const parentId = levels[depth].parentId;
    const { data, error } = await supabase.from("catalogo_items")
      .insert({ catalogo_key: catalogoKey, nombre: newName.trim(), parent_id: parentId })
      .select().single();
    if (error) return;
    const updated = [...levels];
    updated[depth] = { ...updated[depth], items: [...updated[depth].items, data], selected: data.id };
    setLevels(updated);
    setShowAdd(false); setNewName("");
    onChange(data.id, data.nombre);
  };

  if (loading) return <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
        {levels.map((lvl, depth) => (
          <select
            key={depth} value={lvl.selected} onChange={(e) => selectAt(depth, e.target.value)}
            style={{ ...inputStyle, flex: "0 0 200px", width: 200 }}
          >
            <option value="">Seleccionar...</option>
            {lvl.items.map((it) => <option key={it.id} value={it.id}>{it.nombre}</option>)}
            {canManage && <option value="__new__">+ Agregar</option>}
          </select>
        ))}
      </div>
      {showAdd && (
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, flex: 1 }} />
          <button onClick={addItem} disabled={!newName.trim()} style={btnPrimary(!!newName.trim())}>Agregar</button>
        </div>
      )}
    </div>
  );
}



/* ---------- nuevo caso ---------- */

function NewCaseView({ perfil, onCreated, goTo }) {
  const isFixedCliente = perfil.rol === "Administrador Cliente";
  const isPrestador = perfil.rol === "Prestador";

  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteIdRaw] = useState(
    isFixedCliente ? perfil.cliente_id : (localStorage.getItem("da_salud_nc_cliente") || "")
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
  const [detailValue, setDetailValue] = useState("");
  const [detailName, setDetailName] = useState("");

  const [priority, setPriority] = useState("Media");
  const [title, setTitle] = useState("");
  const [titleTouched, setTitleTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastCreated, setLastCreated] = useState(null);

  const canManagePadron = perfil.rol === "Auditor" || perfil.rol === "Coordinador" || perfil.rol === "Administrador" || perfil.rol === "Administrador Cliente";
  const canManageCatalog = perfil.rol === "Administrador" || perfil.rol === "Administrador Cliente";

  useEffect(() => {
    if (isFixedCliente) return;
    if (isPrestador) { setClientes(perfil.clientesContratados || []); return; }
    supabase.from("clientes").select("id, nombre, tipo").order("nombre").then(({ data }) => setClientes(data || []));
  }, [perfil.rol]);

  const isFirstClienteEffect = useRef(true);
  useEffect(() => {
    const wasFirst = isFirstClienteEffect.current;
    isFirstClienteEffect.current = false;
    if (!wasFirst) setAfiliadoId("");
    setShowNewAffiliate(false); setLastCreated(null);
    if (!clienteId) { setAfiliados([]); return; }
    supabase.from("afiliados").select("id, nombre, numero_afiliado, estado, plan_id").eq("cliente_id", clienteId).order("nombre")
      .then(({ data }) => setAfiliados(data || []));
  }, [clienteId]);

  useEffect(() => {
    setDetailValue(""); setDetailName(""); setLastCreated(null);
  }, [tipo]);

  const afiliado = afiliados.find((a) => a.id === afiliadoId);

  useEffect(() => {
    if (titleTouched) return;
    const parts = [];
    if (afiliado) { parts.push(afiliado.nombre); if (afiliado.numero_afiliado) parts.push("N° " + afiliado.numero_afiliado); }
    if (detailName) parts.push(detailName);
    setTitle(parts.join(" — "));
  }, [afiliadoId, detailName]);

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
    onCreated();
    goTo("casos");
  };

  return (
    <div style={{ maxWidth: 920, margin: "0 auto", padding: "28px 32px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Nuevo caso</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>El plazo de respuesta y el auditor se calculan solos.</p>

      <div style={{ display: "grid", gridTemplateColumns: isFixedCliente ? "1fr" : "1fr 1fr", gap: 14 }}>
        {!isFixedCliente && (
          <div>
            <label style={labelStyle}>Solicitante</label>
            <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={inputStyle}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}{c.tipo ? " · " + c.tipo : ""}</option>)}
            </select>
          </div>
        )}

        {clienteId && (
          <div>
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
            {afiliado?.plan_id && (
              <button onClick={() => verContratoDePlan(afiliado.plan_id)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 11.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", marginTop: 6, padding: 0 }}>
                <FileText size={12} /> Ver contrato del plan
              </button>
            )}
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
      </div>

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
      <CatalogPicker
        key={tipo}
        catalogoKey={CASE_TYPE_CONFIG[tipo].catalogKey}
        canManage={canManageCatalog}
        onChange={(id, nombre) => { setDetailValue(id); setDetailName(nombre); }}
      />

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

function CasesView({ refreshKey, perfil, goTo }) {
  const [casos, setCasos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tipoFilter, setTipoFilter] = useState("all");
  const [now, setNow] = useState(Date.now());
  const [openId, setOpenId] = useState(null);
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
      .select("id, titulo, descripcion, tipo, estado, prioridad, vence_en, creado_en, creado_por, clientes(nombre), afiliados(nombre, numero_afiliado, plan_id), asignado:perfiles!casos_asignado_a_fkey(nombre)")
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

  const openCase = openId ? casos.find((c) => c.id === openId) : null;

  const thStyle = { textAlign: "left", padding: "10px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--primary-dark)", background: "var(--primary-tint)", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 10px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)" }}>
          Casos ({filtered.length})
        </h2>
        <button onClick={() => goTo("nuevo")} style={btnPrimary(true)}>
          <Plus size={15} /> Nuevo caso
        </button>
      </div>
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
          <div style={{ ...cardStyle, overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", width: "100%" }}>
              <thead>
                <tr>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Título</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Afiliado</th>
                  <th style={thStyle}>Asignado a</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Vencimiento</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const st = STATUS_STYLE[c.estado] || { bg: "#eee", fg: "#333" };
                  const sla = slaInfo(c.vence_en, c.estado, now);
                  const tone = TONE_COLORS[sla.tone];
                  return (
                    <tr
                      key={c.id}
                      onClick={() => setOpenId(c.id)}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <td style={{ ...tdStyle, fontFamily: "var(--font-mono)" }}>{displayCode(c.id)}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{c.titulo}</td>
                      <td style={tdStyle}>{c.tipo}</td>
                      <td style={tdStyle}>{c.clientes?.nombre || "—"}</td>
                      <td style={tdStyle}>{c.afiliados?.nombre || "—"}</td>
                      <td style={tdStyle}>{c.asignado?.nombre || "Sin asignar"}</td>
                      <td style={tdStyle}><Pill bg={st.bg} fg={st.fg}>{c.estado}</Pill></td>
                      <td style={tdStyle}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: tone.bg, color: tone.fg, fontFamily: "var(--font-mono)" }}>
                          <Clock size={12} /> {sla.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {openCase && (
        <CaseModal
          c={openCase} now={now} canDecide={canDecide} perfil={perfil}
          onClose={() => setOpenId(null)}
          onChanged={() => setBump((b) => b + 1)}
        />
      )}
    </div>
  );
}

function CaseModal({ c, now, canDecide, perfil, onClose, onChanged }) {
  const [notas, setNotas] = useState([]);
  const [loadingNotas, setLoadingNotas] = useState(false);
  const [note, setNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [adjuntos, setAdjuntos] = useState([]);
  const [loadingAdjuntos, setLoadingAdjuntos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const canEditOwn = perfil?.id && c.creado_por === perfil.id && (now - new Date(c.creado_en).getTime() < 2 * 60 * 60 * 1000);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ titulo: c.titulo, tipo: c.tipo, prioridad: c.prioridad, descripcion: c.descripcion || "" });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [convenioRuta, setConvenioRuta] = useState(null);
  useEffect(() => {
    if (!canDecide || !c.creado_por) return;
    supabase.from("perfiles").select("prestador_id").eq("id", c.creado_por).single().then(({ data: perf }) => {
      if (!perf?.prestador_id) return;
      supabase.from("prestador_clientes").select("contrato_ruta").eq("prestador_id", perf.prestador_id).eq("cliente_id", c.cliente_id).single()
        .then(({ data }) => { if (data?.contrato_ruta) setConvenioRuta(data.contrato_ruta); });
    });
  }, [canDecide, c.creado_por, c.cliente_id]);

  const st = STATUS_STYLE[c.estado] || { bg: "#eee", fg: "#333" };
  const sla = slaInfo(c.vence_en, c.estado, now);
  const tone = TONE_COLORS[sla.tone];

  useEffect(() => {
    setLoadingNotas(true);
    supabase.from("notas").select("texto, creado_en").eq("caso_id", c.id).order("creado_en", { ascending: false })
      .then(({ data }) => { setNotas(data || []); setLoadingNotas(false); });
    setLoadingAdjuntos(true);
    supabase.from("adjuntos").select("id, nombre_archivo, ruta, creado_en").eq("caso_id", c.id).order("creado_en", { ascending: false })
      .then(({ data }) => { setAdjuntos(data || []); setLoadingAdjuntos(false); });
  }, [c.id]);

  const changeStatus = async (estado) => {
    setSavingStatus(true);
    await supabase.from("casos").update({ estado }).eq("id", c.id);
    setSavingStatus(false);
    onChanged();
  };

  const guardarEdicion = async () => {
    if (!editForm.titulo.trim()) return;
    setSavingEdit(true); setEditError("");
    const { error } = await supabase.from("casos").update({
      titulo: editForm.titulo.trim(), tipo: editForm.tipo, prioridad: editForm.prioridad,
      descripcion: editForm.descripcion.trim() || null,
    }).eq("id", c.id);
    setSavingEdit(false);
    if (error) { setEditError(error.message); return; }
    setShowEdit(false);
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
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(15,37,71,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, maxWidth: 640, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, marginBottom: 4 }}>
          <div>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--muted)" }}>{displayCode(c.id)}</span>
            <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{c.titulo}</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{c.tipo} · {c.clientes?.nombre || "—"}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {canEditOwn && !showEdit && (
              <button onClick={() => setShowEdit(true)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12, fontWeight: 500, color: "var(--primary-dark)", fontFamily: "var(--font-body)" }}>
                Editar
              </button>
            )}
            <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {canEditOwn && showEdit && (
          <div style={{ ...cardStyle, background: "var(--bg)", padding: 14, marginTop: 10, marginBottom: 4 }}>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginBottom: 10 }}>
              Podés editar este caso hasta 2 horas después de haberlo cargado.
            </div>
            <label style={labelStyle}>Título</label>
            <input value={editForm.titulo} onChange={(e) => setEditForm((f) => ({ ...f, titulo: e.target.value }))} style={inputStyle} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Tipo de auditoría</label>
                <select value={editForm.tipo} onChange={(e) => setEditForm((f) => ({ ...f, tipo: e.target.value }))} style={inputStyle}>
                  {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Prioridad</label>
                <select value={editForm.prioridad} onChange={(e) => setEditForm((f) => ({ ...f, prioridad: e.target.value }))} style={inputStyle}>
                  {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <label style={{ ...labelStyle, marginTop: 12 }}>Descripción</label>
            <textarea value={editForm.descripcion} onChange={(e) => setEditForm((f) => ({ ...f, descripcion: e.target.value }))} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            {editError && <div style={{ marginTop: 10, fontSize: 12, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{editError}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={guardarEdicion} disabled={!editForm.titulo.trim() || savingEdit} style={btnPrimary(!!editForm.titulo.trim())}>
                {savingEdit ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={() => setShowEdit(false)} style={{ padding: "11px 16px", borderRadius: 9, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 13.5, fontFamily: "var(--font-body)", color: "var(--muted)" }}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Pill bg={st.bg} fg={st.fg}>{c.estado}</Pill>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 6, fontSize: 12, fontWeight: 500, background: tone.bg, color: tone.fg, fontFamily: "var(--font-mono)" }}>
            <Clock size={12} /> {sla.label}
          </span>
        </div>

        {c.descripcion && (
          <div style={{ fontSize: 13, color: "var(--ink)", background: "var(--bg)", padding: 12, borderRadius: 8, margin: "14px 0" }}>
            {c.descripcion}
          </div>
        )}
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", fontSize: 13, marginBottom: 14, marginTop: c.descripcion ? 0 : 14 }}>
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Afiliado</div>
            <div style={{ fontWeight: 500, color: "var(--ink)" }}>{c.afiliados?.nombre || "—"}{c.afiliados?.numero_afiliado ? " · N° " + c.afiliados.numero_afiliado : ""}</div>
            {c.afiliados?.plan_id && (
              <button onClick={() => verContratoDePlan(c.afiliados.plan_id)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 11.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0, marginTop: 3 }}>
                <FileText size={11} /> Ver contrato del plan
              </button>
            )}
            {convenioRuta && (
              <button onClick={() => verContratoStorage(convenioRuta)} style={{ display: "flex", alignItems: "center", gap: 4, border: "none", background: "transparent", cursor: "pointer", fontSize: 11.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0, marginTop: 3 }}>
                <FileText size={11} /> Ver convenio con el prestador
              </button>
            )}
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
    </div>
  );
}

/* ---------- shared atoms ---------- */

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}

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

/* ---------- clientes (alta de financiadores) ---------- */

const MESES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const TIPOS_CONTRATO = ["Fee mensual", "Paquete por volumen", "Valor por caso", "Proyecto cerrado", "Bolsa de horas", "Servicio tecnológico", "Modelo mixto"];

function emptyClienteForm() {
  return {
    nombre: "", sigla: "", tipo: CLIENT_TYPES[0], mes_inicio_ejercicio: 1,
    nombre_contacto: "", telefono_contacto: "", email_contacto: "", cuit: "",
    domicilio_fiscal: "", localidad: "", departamento: "", provincia: "", tipo_contrato: TIPOS_CONTRATO[0],
  };
}

async function verContratoStorage(ruta) {
  if (!ruta) return;
  const { data, error } = await supabase.storage.from("contratos").createSignedUrl(ruta, 60);
  if (!error && data) window.open(data.signedUrl, "_blank");
}

async function verContratoDePlan(planId) {
  if (!planId) return;
  const { data: plan } = await supabase.from("planes").select("contrato_ruta").eq("id", planId).single();
  if (plan?.contrato_ruta) verContratoStorage(plan.contrato_ruta);
}

function ClientesView() {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyClienteForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [planes, setPlanes] = useState([]);
  const [planNombre, setPlanNombre] = useState("");
  const [planSaving, setPlanSaving] = useState(false);
  const [planError, setPlanError] = useState("");

  const [provincias, setProvincias] = useState([]);
  const [departamentos, setDepartamentos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  useEffect(() => {
    georefFetch("provincias", { campos: "id,nombre", max: 24, orden: "nombre" }).then(setProvincias);
  }, []);

  useEffect(() => {
    if (!form.provincia) { setDepartamentos([]); return; }
    const provinciaId = georefIdFor(provincias, form.provincia);
    if (!provinciaId) { setDepartamentos([]); return; }
    georefFetch("departamentos", { provincia: provinciaId, campos: "id,nombre", max: 300, orden: "nombre" }).then(setDepartamentos);
  }, [form.provincia, provincias]);

  useEffect(() => {
    if (!form.departamento) { setLocalidades([]); return; }
    const departamentoId = georefIdFor(departamentos, form.departamento);
    if (!departamentoId) { setLocalidades([]); return; }
    georefFetch("localidades", { departamento: departamentoId, campos: "id,nombre", max: 800, orden: "nombre" }).then(setLocalidades);
  }, [form.departamento, departamentos]);

  const load = () => {
    setLoading(true);
    supabase.from("clientes").select("*").order("nombre")
      .then(({ data, error }) => { if (error) setFormError(error.message); else setClientes(data || []); setLoading(false); });
  };
  useEffect(load, []);

  const loadPlanes = (clienteId) => {
    if (!clienteId) { setPlanes([]); return; }
    supabase.from("planes").select("id, nombre, contrato_ruta, activo").eq("cliente_id", clienteId).order("nombre")
      .then(({ data }) => setPlanes(data || []));
  };

  const q = search.trim().toLowerCase();
  const filtrados = !q ? clientes : clientes.filter((c) =>
    (c.nombre || "").toLowerCase().includes(q) ||
    (c.sigla || "").toLowerCase().includes(q) ||
    (c.cuit || "").toLowerCase().includes(q)
  );

  const openNew = () => { setEditingId(null); setForm(emptyClienteForm()); setFormError(""); setPlanes([]); setShowForm(true); };
  const openEdit = (c) => {
    setEditingId(c.id);
    setForm({
      nombre: c.nombre || "", sigla: c.sigla || "", tipo: c.tipo || CLIENT_TYPES[0],
      mes_inicio_ejercicio: c.mes_inicio_ejercicio || 1,
      nombre_contacto: c.nombre_contacto || "", telefono_contacto: c.telefono_contacto || "",
      email_contacto: c.email_contacto || "", cuit: c.cuit || "",
      domicilio_fiscal: c.domicilio_fiscal || "", localidad: c.localidad || "", departamento: c.departamento || "",
      provincia: c.provincia || "", tipo_contrato: c.tipo_contrato || TIPOS_CONTRATO[0],
    });
    setFormError(""); setPlanNombre(""); setPlanError("");
    loadPlanes(c.id);
    setShowForm(true);
  };
  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));

  const guardarCliente = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true); setFormError("");
    const payload = {
      nombre: form.nombre.trim(), sigla: form.sigla.trim() || null, tipo: form.tipo,
      mes_inicio_ejercicio: form.mes_inicio_ejercicio,
      nombre_contacto: form.nombre_contacto.trim() || null, telefono_contacto: form.telefono_contacto.trim() || null,
      email_contacto: form.email_contacto.trim() || null, cuit: form.cuit.trim() || null,
      domicilio_fiscal: form.domicilio_fiscal.trim() || null, localidad: form.localidad.trim() || null,
      departamento: form.departamento.trim() || null, provincia: form.provincia.trim() || null, tipo_contrato: form.tipo_contrato,
    };
    if (editingId) {
      const { error } = await supabase.from("clientes").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) { setFormError(error.message); return; }
      load();
    } else {
      const { data, error } = await supabase.from("clientes").insert(payload).select().single();
      setSaving(false);
      if (error) { setFormError(error.message); return; }
      load();
      openEdit(data);
    }
  };

  const agregarPlan = async () => {
    if (!planNombre.trim() || !editingId) return;
    setPlanSaving(true); setPlanError("");
    const { error } = await supabase.from("planes").insert({ cliente_id: editingId, nombre: planNombre.trim() });
    setPlanSaving(false);
    if (error) { setPlanError(error.message); return; }
    setPlanNombre("");
    loadPlanes(editingId);
  };

  const thStyle = { textAlign: "left", padding: "10px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--primary-dark)", background: "var(--primary-tint)", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 10px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Clientes</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>Financiadores, prestadores y demás organizaciones.</p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        <button onClick={openNew} style={btnPrimary(true)}>
          <Plus size={15} /> Nuevo cliente
        </button>
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, sigla o CUIT..."
            style={{ ...inputStyle, paddingLeft: 34 }}
          />
        </div>
      </div>

      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(15,37,71,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, maxWidth: 780, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{editingId ? "Editar cliente" : "Nuevo cliente"}</div>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre</label>
                <input value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} placeholder="Ej. OSDE" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sigla</label>
                <input value={form.sigla} onChange={(e) => setCampo("sigla", e.target.value)} placeholder="Ej. OSDE" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo</label>
                <select value={form.tipo} onChange={(e) => setCampo("tipo", e.target.value)} style={inputStyle}>
                  {CLIENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Inicio de ejercicio fiscal</label>
                <select value={form.mes_inicio_ejercicio} onChange={(e) => setCampo("mes_inicio_ejercicio", Number(e.target.value))} style={inputStyle}>
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}{i === 0 ? " (año calendario)" : ""}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Nombre de contacto</label>
                <input value={form.nombre_contacto} onChange={(e) => setCampo("nombre_contacto", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono de contacto</label>
                <input value={form.telefono_contacto} onChange={(e) => setCampo("telefono_contacto", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email de contacto</label>
                <input type="email" value={form.email_contacto} onChange={(e) => setCampo("email_contacto", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CUIT</label>
                <input value={form.cuit} onChange={(e) => setCampo("cuit", e.target.value)} placeholder="30-12345678-9" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Tipo de contrato</label>
                <select value={form.tipo_contrato} onChange={(e) => setCampo("tipo_contrato", e.target.value)} style={inputStyle}>
                  {TIPOS_CONTRATO.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Domicilio fiscal</label>
                <input value={form.domicilio_fiscal} onChange={(e) => setCampo("domicilio_fiscal", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Provincia</label>
                <select
                  value={form.provincia}
                  onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value, departamento: "", localidad: "" }))}
                  style={inputStyle}
                >
                  <option value="">Seleccionar...</option>
                  {(form.provincia && !provincias.some((p) => p.nombre === form.provincia)) && <option value={form.provincia}>{form.provincia}</option>}
                  {provincias.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Departamento/Partido</label>
                <select
                  value={form.departamento}
                  onChange={(e) => setForm((f) => ({ ...f, departamento: e.target.value, localidad: "" }))}
                  style={inputStyle}
                  disabled={!form.provincia}
                >
                  <option value="">{form.provincia ? "Seleccionar..." : "Elegí primero la provincia"}</option>
                  {(form.departamento && !departamentos.some((d) => d.nombre === form.departamento)) && <option value={form.departamento}>{form.departamento}</option>}
                  {departamentos.map((d) => <option key={d.id} value={d.nombre}>{d.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Localidad</label>
                <select
                  value={form.localidad}
                  onChange={(e) => setCampo("localidad", e.target.value)}
                  style={inputStyle}
                  disabled={!form.departamento}
                >
                  <option value="">{form.departamento ? "Seleccionar..." : "Elegí primero el departamento"}</option>
                  {(form.localidad && !localidades.some((l) => l.nombre === form.localidad)) && <option value={form.localidad}>{form.localidad}</option>}
                  {localidades.map((l) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                </select>
              </div>
            </div>

            {formError && <div style={{ marginTop: 12, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{formError}</div>}

            <button onClick={guardarCliente} disabled={!form.nombre.trim() || saving} style={{ ...btnPrimary(!!form.nombre.trim()), marginTop: 16 }}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear cliente"}
            </button>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Planes</div>
              {!editingId ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Los planes se agregan después de crear el cliente.</div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    Cada plan puede tener su propio contrato adjunto (para saber exactamente qué cubre). Los afiliados se vinculan a uno de estos planes desde el Padrón.
                  </p>
                  {planes.length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                      {planes.map((p) => <PlanRow key={p.id} plan={p} clienteId={editingId} onChanged={() => loadPlanes(editingId)} />)}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8 }}>
                    <input value={planNombre} onChange={(e) => setPlanNombre(e.target.value)} placeholder="Nombre del plan (ej. 210, Binario)" style={{ ...inputStyle, flex: 1 }} />
                    <button onClick={agregarPlan} disabled={!planNombre.trim() || planSaving} style={btnPrimary(!!planNombre.trim())}>
                      {planSaving ? "Agregando..." : "Agregar plan"}
                    </button>
                  </div>
                  {planError && <div style={{ marginTop: 10, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{planError}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Building2} text={clientes.length === 0 ? "Todavía no hay clientes cargados." : "Ningún cliente coincide con la búsqueda."} />
      ) : (
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Sigla</th>
                <th style={thStyle}>Tipo</th>
                <th style={thStyle}>CUIT</th>
                <th style={thStyle}>Contacto</th>
                <th style={thStyle}>Teléfono</th>
                <th style={thStyle}>Departamento</th>
                <th style={thStyle}>Localidad</th>
                <th style={thStyle}>Provincia</th>
                <th style={thStyle}>Ejercicio desde</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((c) => (
                <tr
                  key={c.id} onClick={() => openEdit(c)} style={{ cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ ...tdStyle, fontWeight: 500 }}>{c.nombre}</td>
                  <td style={tdStyle}>{c.sigla || "—"}</td>
                  <td style={tdStyle}>{c.tipo || "—"}</td>
                  <td style={tdStyle}>{c.cuit || "—"}</td>
                  <td style={tdStyle}>{c.nombre_contacto || "—"}</td>
                  <td style={tdStyle}>{c.telefono_contacto || "—"}</td>
                  <td style={tdStyle}>{c.departamento || "—"}</td>
                  <td style={tdStyle}>{c.localidad || "—"}</td>
                  <td style={tdStyle}>{c.provincia || "—"}</td>
                  <td style={tdStyle}>{MESES[(c.mes_inicio_ejercicio || 1) - 1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan, clienteId, onChanged }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true); setUploadError("");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${clienteId}/planes/${plan.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("contratos").upload(path, file);
    if (upErr) { setUploadError(upErr.message); setUploading(false); return; }
    await supabase.from("planes").update({ contrato_ruta: path }).eq("id", plan.id);
    setUploading(false);
    onChanged();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "8px 12px", border: "1px solid var(--border)", borderRadius: 8, flexWrap: "wrap" }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)" }}>{plan.nombre}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {plan.contrato_ruta ? (
          <button onClick={() => verContratoStorage(plan.contrato_ruta)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 12, color: "var(--primary-dark)", fontFamily: "var(--font-body)" }}>
            <FileText size={13} /> Ver contrato
          </button>
        ) : (
          <span style={{ fontSize: 11.5, color: "var(--muted)" }}>Sin contrato</span>
        )}
        <label style={{ fontSize: 12, fontWeight: 500, color: "var(--primary-dark)", cursor: uploading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5 }}>
          <Paperclip size={12} /> {uploading ? "Subiendo..." : (plan.contrato_ruta ? "Reemplazar" : "Adjuntar")}
          <input type="file" onChange={handleFile} disabled={uploading} style={{ display: "none" }} />
        </label>
      </div>
      {uploadError && <div style={{ width: "100%", fontSize: 11.5, color: "#A13333" }}>{uploadError}</div>}
    </div>
  );
}

/* ---------- reglas de autorizacion ---------- */

/* ---------- prestadores ---------- */

const NIVELES_ATENCION = [
  ["1", "1º nivel"],
  ["2", "2º nivel"],
  ["3", "3º nivel"],
];

const CATALOG_KEY_TO_TIPO = Object.fromEntries(
  Object.entries(CASE_TYPE_CONFIG).map(([tipo, cfg]) => [cfg.catalogKey, tipo])
);

function buildCatalogTree(items) {
  const byParent = {};
  const byId = {};
  items.forEach((it) => {
    byId[it.id] = it;
    const key = it.parent_id || "root";
    (byParent[key] ||= []).push(it);
  });
  Object.values(byParent).forEach((arr) => arr.sort((a, b) => a.nombre.localeCompare(b.nombre)));
  return { byParent, byId };
}

function leafDescendants(id, byParent) {
  const children = byParent[id];
  if (!children || children.length === 0) return [id];
  return children.flatMap((c) => leafDescendants(c.id, byParent));
}

function CatalogTreeNode({ item, depth, byParent, selected, toggleLeaf, toggleBranch, collapsed, toggleCollapse }) {
  const children = byParent[item.id];
  const isLeaf = !children || children.length === 0;

  if (isLeaf) {
    return (
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)", cursor: "pointer", padding: "3px 0", paddingLeft: depth * 18 }}>
        <input type="checkbox" checked={selected.has(item.id)} onChange={() => toggleLeaf(item.id)} />
        {item.nombre}
      </label>
    );
  }

  const leafIds = leafDescendants(item.id, byParent);
  const allSelected = leafIds.every((id) => selected.has(id));
  const someSelected = !allSelected && leafIds.some((id) => selected.has(id));
  const isCollapsed = collapsed.has(item.id);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, paddingLeft: depth * 18 }}>
        <button onClick={() => toggleCollapse(item.id)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 2 }}>
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
        </button>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink)", cursor: "pointer" }}>
          <input
            type="checkbox" checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected; }}
            onChange={() => toggleBranch(leafIds, !allSelected)}
          />
          {item.nombre} <span style={{ fontWeight: 400, color: "var(--muted)" }}>({leafIds.length})</span>
        </label>
      </div>
      {!isCollapsed && children.map((c) => (
        <CatalogTreeNode
          key={c.id} item={c} depth={depth + 1} byParent={byParent}
          selected={selected} toggleLeaf={toggleLeaf} toggleBranch={toggleBranch}
          collapsed={collapsed} toggleCollapse={toggleCollapse}
        />
      ))}
    </div>
  );
}

function CategoryExplorerModal({ onClose, onAdd }) {
  const [tipo, setTipo] = useState(CASE_TYPES[0]);
  const [loading, setLoading] = useState(true);
  const [tree, setTree] = useState({ byParent: {}, byId: {} });
  const [selected, setSelected] = useState(new Set());
  const [collapsed, setCollapsed] = useState(new Set());
  const [query, setQuery] = useState("");

  const catalogoKey = CASE_TYPE_CONFIG[tipo].catalogKey;

  useEffect(() => {
    setLoading(true); setSelected(new Set()); setCollapsed(new Set());
    supabase.from("catalogo_items").select("id, nombre, parent_id").eq("catalogo_key", catalogoKey)
      .then(({ data }) => { setTree(buildCatalogTree(data || [])); setLoading(false); });
  }, [tipo]);

  const roots = tree.byParent["root"] || [];

  const toggleLeaf = (id) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleBranch = (leafIds, makeSelected) => setSelected((prev) => {
    const next = new Set(prev);
    leafIds.forEach((id) => { if (makeSelected) next.add(id); else next.delete(id); });
    return next;
  });
  const toggleCollapse = (id) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // si hay búsqueda, filtramos a las hojas cuyo nombre matchea y expandimos sus padres
  const q = query.trim().toLowerCase();
  const visibleRoots = !q ? roots : roots.filter((r) => leafDescendants(r.id, tree.byParent).some((id) => tree.byId[id].nombre.toLowerCase().includes(q)));

  const agregar = () => {
    const items = [...selected].map((id) => {
      const item = tree.byId[id];
      const parent = item?.parent_id ? tree.byId[item.parent_id] : null;
      return { id, nombre: item?.nombre || "", tipo, grupo: parent?.nombre || "" };
    });
    onAdd(items);
    onClose();
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,37,71,0.5)", zIndex: 1100, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, maxWidth: 640, width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Elegir por categoría</div>
          <button onClick={onClose} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
            <X size={16} />
          </button>
        </div>

        <label style={labelStyle}>Tipo de auditoría</label>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={{ ...inputStyle, marginBottom: 12 }}>
          {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>
        ) : (
          <>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filtrar por nombre..." style={{ ...inputStyle, marginBottom: 10 }} />
            {selected.size > 0 && (
              <div style={{ fontSize: 12, color: "var(--primary-dark)", marginBottom: 8 }}>{selected.size} seleccionadas</div>
            )}
            <div style={{ border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px", maxHeight: 340, overflowY: "auto" }}>
              {visibleRoots.length === 0 && <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Sin resultados.</div>}
              {visibleRoots.map((r) => (
                <CatalogTreeNode
                  key={r.id} item={r} depth={0} byParent={tree.byParent}
                  selected={selected} toggleLeaf={toggleLeaf} toggleBranch={toggleBranch}
                  collapsed={collapsed} toggleCollapse={toggleCollapse}
                />
              ))}
            </div>
            <button onClick={agregar} disabled={selected.size === 0} style={{ ...btnPrimary(selected.size > 0), marginTop: 14 }}>
              Agregar {selected.size > 0 ? `${selected.size} ` : ""}prestaciones
            </button>
          </>
        )}
      </div>
    </div>
  );
}

async function buscarPrestacionesCatalogo(query) {
  if (!query.trim()) return [];
  const { data } = await supabase.from("catalogo_items").select("id, nombre, catalogo_key, parent_id")
    .ilike("nombre", `%${query.trim()}%`).order("nombre").limit(12);
  if (!data || data.length === 0) return [];
  const parentIds = [...new Set(data.map((d) => d.parent_id).filter(Boolean))];
  let parentNames = {};
  if (parentIds.length > 0) {
    const { data: parents } = await supabase.from("catalogo_items").select("id, nombre").in("id", parentIds);
    (parents || []).forEach((p) => { parentNames[p.id] = p.nombre; });
  }
  return data.map((it) => ({
    id: it.id, nombre: it.nombre, tipo: CATALOG_KEY_TO_TIPO[it.catalogo_key] || it.catalogo_key,
    grupo: parentNames[it.parent_id] || "",
  }));
}

function emptyPrestadorForm() {
  return {
    razon_social: "", nombre: "", cuit: "", telefono: "", email: "",
    domicilio: "", provincia: "", partido: "", localidad: "",
    niveles_atencion: [], prestaciones_ofrecidas: [], activo: true,
  };
}

function splitPipe(text) {
  return (text || "").split("|").map((s) => s.trim()).filter(Boolean);
}

function parsePrestadoresCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return obj;
  });
}

function PrestadoresView({ perfil }) {
  const isAdmin = perfil.rol === "Administrador";
  const isAdminCliente = perfil.rol === "Administrador Cliente";

  const [prestadores, setPrestadores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyPrestadorForm());
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [clientes, setClientes] = useState([]);
  const [linkedIds, setLinkedIds] = useState(new Set());
  const [linkError, setLinkError] = useState("");
  const [financiadorQuery, setFinanciadorQuery] = useState("");

  const [provincias, setProvincias] = useState([]);
  const [partidos, setPartidos] = useState([]);
  const [localidades, setLocalidades] = useState([]);

  const [prestacionQuery, setPrestacionQuery] = useState("");
  const [prestacionResultados, setPrestacionResultados] = useState([]);
  const [prestacionBuscando, setPrestacionBuscando] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [ofrecidasQuery, setOfrecidasQuery] = useState("");
  const [ofrecidasExpanded, setOfrecidasExpanded] = useState(new Set());

  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);

  // Administrador Cliente: qué contrató con cada prestador (niveles + camas)
  const [contratos, setContratos] = useState({}); // prestador_id -> { niveles_contratados, cupo_camas, cantidad_camas }
  const [editingVinculo, setEditingVinculo] = useState(null); // prestador siendo vinculado/editado
  const [vinculoForm, setVinculoForm] = useState({ cupo_camas: false, cantidad_camas: "", prestaciones_contratadas: [] });
  const [vinculoPrestacionQuery, setVinculoPrestacionQuery] = useState("");
  const [vinculoSaving, setVinculoSaving] = useState(false);
  const [vinculoError, setVinculoError] = useState("");

  const load = () => {
    setLoading(true);
    supabase.from("prestadores").select("*").order("nombre")
      .then(({ data, error }) => { if (error) setFormError(error.message); else setPrestadores(data || []); setLoading(false); });
  };
  useEffect(load, []);

  useEffect(() => {
    if (!isAdmin) return;
    supabase.from("clientes").select("id, nombre, sigla").order("nombre").then(({ data }) => setClientes(data || []));
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdminCliente) return;
    supabase.from("prestador_clientes").select("prestador_id, niveles_contratados, cupo_camas, cantidad_camas, contrato_ruta, prestaciones_contratadas").eq("cliente_id", perfil.cliente_id)
      .then(({ data }) => {
        const ids = new Set();
        const map = {};
        (data || []).forEach((r) => {
          ids.add(r.prestador_id);
          map[r.prestador_id] = { niveles_contratados: r.niveles_contratados || [], cupo_camas: r.cupo_camas, cantidad_camas: r.cantidad_camas, contrato_ruta: r.contrato_ruta, prestaciones_contratadas: r.prestaciones_contratadas || [] };
        });
        setLinkedIds(ids);
        setContratos(map);
      });
  }, [isAdminCliente]);

  useEffect(() => {
    georefFetch("provincias", { campos: "id,nombre", max: 24, orden: "nombre" }).then(setProvincias);
  }, []);
  useEffect(() => {
    if (!form.provincia) { setPartidos([]); return; }
    const provinciaId = georefIdFor(provincias, form.provincia);
    if (!provinciaId) { setPartidos([]); return; }
    georefFetch("departamentos", { provincia: provinciaId, campos: "id,nombre", max: 300, orden: "nombre" }).then(setPartidos);
  }, [form.provincia, provincias]);
  useEffect(() => {
    if (!form.partido) { setLocalidades([]); return; }
    const partidoId = georefIdFor(partidos, form.partido);
    if (!partidoId) { setLocalidades([]); return; }
    georefFetch("localidades", { departamento: partidoId, campos: "id,nombre", max: 800, orden: "nombre" }).then(setLocalidades);
  }, [form.partido, partidos]);

  const loadLinks = (prestadorId) => {
    if (!prestadorId) { setLinkedIds(new Set()); return; }
    supabase.from("prestador_clientes").select("cliente_id").eq("prestador_id", prestadorId)
      .then(({ data }) => setLinkedIds(new Set((data || []).map((r) => r.cliente_id))));
  };

  const q = search.trim().toLowerCase();
  const filtrados = !q ? prestadores : prestadores.filter((p) =>
    (p.nombre || "").toLowerCase().includes(q) || (p.cuit || "").toLowerCase().includes(q) || (p.razon_social || "").toLowerCase().includes(q)
  );

  const openNew = () => {
    setEditingId(null); setForm(emptyPrestadorForm()); setFormError("");
    setLinkedIds(new Set()); setFinanciadorQuery(""); setShowBulk(false); setShowForm(true);
    setPrestacionQuery(""); setPrestacionResultados([]); setOfrecidasQuery("");
  };
  const openEdit = (p) => {
    setEditingId(p.id);
    setForm({
      razon_social: p.razon_social || "", nombre: p.nombre || "", cuit: p.cuit || "",
      telefono: p.telefono || "", email: p.email || "", domicilio: p.domicilio || "",
      provincia: p.provincia || "", partido: p.partido || "", localidad: p.localidad || "",
      niveles_atencion: p.niveles_atencion || [], prestaciones_ofrecidas: p.prestaciones_ofrecidas || [], activo: p.activo,
    });
    setFormError(""); setLinkError(""); setFinanciadorQuery(""); setShowBulk(false);
    setPrestacionQuery(""); setPrestacionResultados([]); setOfrecidasQuery("");
    loadLinks(p.id);
    setShowForm(true);
  };
  const setCampo = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }));
  const toggleNivelForm = (nivel) => setForm((f) => ({
    ...f, niveles_atencion: f.niveles_atencion.includes(nivel) ? f.niveles_atencion.filter((n) => n !== nivel) : [...f.niveles_atencion, nivel],
  }));

  useEffect(() => {
    if (!prestacionQuery.trim()) { setPrestacionResultados([]); return; }
    setPrestacionBuscando(true);
    const t = setTimeout(() => {
      buscarPrestacionesCatalogo(prestacionQuery).then((r) => { setPrestacionResultados(r); setPrestacionBuscando(false); });
    }, 300);
    return () => clearTimeout(t);
  }, [prestacionQuery]);

  const agregarPrestacionOfrecida = (pr) => {
    setForm((f) => {
      if (f.prestaciones_ofrecidas.some((x) => x.id === pr.id)) return f;
      return { ...f, prestaciones_ofrecidas: [...f.prestaciones_ofrecidas, pr] };
    });
    setPrestacionQuery(""); setPrestacionResultados([]);
  };
  const quitarPrestacionOfrecida = (id) => setForm((f) => ({
    ...f, prestaciones_ofrecidas: f.prestaciones_ofrecidas.filter((x) => x.id !== id),
  }));

  const guardarPrestador = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true); setFormError("");
    const payload = {
      razon_social: form.razon_social.trim() || null, nombre: form.nombre.trim(), cuit: form.cuit.trim() || null,
      telefono: form.telefono.trim() || null, email: form.email.trim() || null, domicilio: form.domicilio.trim() || null,
      provincia: form.provincia || null, partido: form.partido || null, localidad: form.localidad || null,
      niveles_atencion: form.niveles_atencion, prestaciones_ofrecidas: form.prestaciones_ofrecidas, activo: form.activo,
    };
    if (editingId) {
      const { error } = await supabase.from("prestadores").update(payload).eq("id", editingId);
      setSaving(false);
      if (error) { setFormError(error.message); return; }
      load();
    } else {
      const { data, error } = await supabase.from("prestadores").insert(payload).select().single();
      setSaving(false);
      if (error) { setFormError(error.message); return; }
      load();
      openEdit(data);
    }
  };

  // Administrador: tilda/destilda qué financiadores trabajan con el prestador que está editando
  const toggleFinanciador = async (clienteId) => {
    if (!editingId) return;
    setLinkError("");
    if (linkedIds.has(clienteId)) {
      const { error } = await supabase.from("prestador_clientes").delete().eq("prestador_id", editingId).eq("cliente_id", clienteId);
      if (error) { setLinkError(error.message); return; }
      setLinkedIds((prev) => { const next = new Set(prev); next.delete(clienteId); return next; });
    } else {
      const { error } = await supabase.from("prestador_clientes").insert({ prestador_id: editingId, cliente_id: clienteId });
      if (error) { setLinkError(error.message); return; }
      setLinkedIds((prev) => new Set(prev).add(clienteId));
    }
  };

  const subirMasivo = async () => {
    if (!bulkFile) return;
    setBulkLoading(true); setBulkStatus("");
    try {
      const text = await bulkFile.text();
      const filas = parsePrestadoresCsv(text);
      if (filas.length === 0) { setBulkStatus("El archivo no tiene filas para cargar."); setBulkLoading(false); return; }
      const payload = filas.map((f) => ({
        razon_social: f.razon_social || null, nombre: f.nombre || f.razon_social || "", cuit: f.cuit || null,
        telefono: f.telefono || null, email: f.email || null, domicilio: f.domicilio || null,
        provincia: f.provincia || null, partido: f.partido || null, localidad: f.localidad || null,
        niveles_atencion: splitPipe(f.niveles_atencion), activo: true,
      }));
      const { error } = await supabase.from("prestadores").insert(payload);
      setBulkLoading(false);
      if (error) { setBulkStatus("Error: " + error.message); return; }
      setBulkStatus(`✓ ${payload.length} prestadores cargados.`);
      setBulkFile(null);
      load();
    } catch {
      setBulkLoading(false);
      setBulkStatus("No se pudo leer el archivo.");
    }
  };

  // Administrador Cliente: abre el detalle de un vínculo ya tildado (camas + convenio)
  const abrirVinculo = (p) => {
    const actual = contratos[p.id];
    setEditingVinculo(p);
    setVinculoForm({
      cupo_camas: actual?.cupo_camas || false,
      cantidad_camas: actual?.cantidad_camas != null ? String(actual.cantidad_camas) : "",
      prestaciones_contratadas: actual?.prestaciones_contratadas || [],
    });
    setVinculoPrestacionQuery("");
    setConvenioError(""); setVinculoError("");
  };
  const toggleprestacionContratada = (pr) => setVinculoForm((f) => ({
    ...f,
    prestaciones_contratadas: f.prestaciones_contratadas.some((x) => x.id === pr.id)
      ? f.prestaciones_contratadas.filter((x) => x.id !== pr.id)
      : [...f.prestaciones_contratadas, pr],
  }));
  const guardarVinculo = async () => {
    if (!editingVinculo) return;
    setVinculoSaving(true); setVinculoError("");
    const payload = {
      cupo_camas: vinculoForm.cupo_camas,
      cantidad_camas: (vinculoForm.cupo_camas && vinculoForm.cantidad_camas) ? Number(vinculoForm.cantidad_camas) : null,
      prestaciones_contratadas: vinculoForm.prestaciones_contratadas,
    };
    const { error } = await supabase.from("prestador_clientes").update(payload).eq("prestador_id", editingVinculo.id).eq("cliente_id", perfil.cliente_id);
    setVinculoSaving(false);
    if (error) { setVinculoError(error.message); return; }
    setContratos((prev) => ({ ...prev, [editingVinculo.id]: { ...prev[editingVinculo.id], ...payload } }));
    setEditingVinculo(null);
  };
  const quitarVinculo = async () => {
    if (!editingVinculo) return;
    const ok = window.confirm(
      `¿Desvincular a ${editingVinculo.nombre} de tu organización? Se van a borrar los niveles tildados, las prestaciones contratadas y el convenio adjunto. El prestador va a dejar de poder cargar casos y ver tu padrón.`
    );
    if (!ok) return;
    setVinculoSaving(true); setVinculoError("");
    const { error } = await supabase.from("prestador_clientes").delete().eq("prestador_id", editingVinculo.id).eq("cliente_id", perfil.cliente_id);
    setVinculoSaving(false);
    if (error) { setVinculoError(error.message); return; }
    setLinkedIds((prev) => { const next = new Set(prev); next.delete(editingVinculo.id); return next; });
    setContratos((prev) => { const next = { ...prev }; delete next[editingVinculo.id]; return next; });
    setEditingVinculo(null);
  };

  // Administrador Cliente: tilda/destilda un nivel directo desde la tabla (sin abrir modal)
  const toggleNivelInline = async (p, nivel) => {
    setLinkError("");
    const actual = contratos[p.id]?.niveles_contratados || [];
    const next = actual.includes(nivel) ? actual.filter((n) => n !== nivel) : [...actual, nivel];
    const yaVinculado = linkedIds.has(p.id);

    if (next.length === 0) {
      if (yaVinculado) {
        const { error } = await supabase.from("prestador_clientes").delete().eq("prestador_id", p.id).eq("cliente_id", perfil.cliente_id);
        if (error) { setLinkError(error.message); return; }
      }
      setLinkedIds((prev) => { const s = new Set(prev); s.delete(p.id); return s; });
      setContratos((prev) => { const c = { ...prev }; delete c[p.id]; return c; });
      return;
    }

    const cupoCamas = next.includes("3") ? (contratos[p.id]?.cupo_camas || false) : false;
    const cantidadCamas = next.includes("3") ? (contratos[p.id]?.cantidad_camas ?? null) : null;
    const payload = { prestador_id: p.id, cliente_id: perfil.cliente_id, niveles_contratados: next, cupo_camas: cupoCamas, cantidad_camas: cantidadCamas };
    const { error } = yaVinculado
      ? await supabase.from("prestador_clientes").update(payload).eq("prestador_id", p.id).eq("cliente_id", perfil.cliente_id)
      : await supabase.from("prestador_clientes").insert(payload);
    if (error) { setLinkError(error.message); return; }
    setLinkedIds((prev) => new Set(prev).add(p.id));
    setContratos((prev) => ({ ...prev, [p.id]: { niveles_contratados: next, cupo_camas: cupoCamas, cantidad_camas: cantidadCamas, contrato_ruta: prev[p.id]?.contrato_ruta, prestaciones_contratadas: prev[p.id]?.prestaciones_contratadas || [] } }));
  };

  const [convenioUploading, setConvenioUploading] = useState(false);
  const [convenioError, setConvenioError] = useState("");
  const subirConvenio = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file || !editingVinculo) return;
    setConvenioUploading(true); setConvenioError("");
    const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
    const path = `${perfil.cliente_id}/prestadores/${editingVinculo.id}/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabase.storage.from("contratos").upload(path, file);
    if (upErr) { setConvenioError(upErr.message); setConvenioUploading(false); return; }
    const { error } = await supabase.from("prestador_clientes").update({ contrato_ruta: path }).eq("prestador_id", editingVinculo.id).eq("cliente_id", perfil.cliente_id);
    setConvenioUploading(false);
    if (error) { setConvenioError(error.message); return; }
    setContratos((prev) => ({ ...prev, [editingVinculo.id]: { ...prev[editingVinculo.id], contrato_ruta: path } }));
  };

  const thStyle = { textAlign: "left", padding: "10px 10px", fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--primary-dark)", background: "var(--primary-tint)", borderBottom: "2px solid var(--primary)", whiteSpace: "nowrap" };
  const tdStyle = { padding: "9px 10px", fontSize: 13, color: "var(--ink)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Prestadores</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 20 }}>
        {isAdmin
          ? "Consultorios, clínicas y profesionales contratados por los financiadores. Un prestador puede trabajar con varios financiadores a la vez."
          : "Tildá con qué prestadores trabajás y qué nivel de atención les contrataste. Solo ellos van a poder cargar casos y ver el padrón de tu organización."}
      </p>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 16 }}>
        {isAdmin ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { setShowBulk((v) => !v); setShowForm(false); }} style={{ ...btnPrimary(true), background: "var(--surface)", color: "var(--primary-dark)", border: "1px solid var(--primary)" }}>
              <Upload size={15} /> Carga masiva
            </button>
            <button onClick={openNew} style={btnPrimary(true)}>
              <Plus size={15} /> Nuevo prestador
            </button>
          </div>
        ) : <div />}
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <Search size={15} color="var(--muted)" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por nombre, razón social o CUIT..." style={{ ...inputStyle, paddingLeft: 34 }} />
        </div>
      </div>

      {linkError && <div style={{ marginBottom: 12, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{linkError}</div>}

      {isAdmin && showBulk && (
        <div style={{ ...cardStyle, padding: 18, marginBottom: 20 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Carga masiva de prestadores</div>
          <p style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10, lineHeight: 1.5 }}>
            CSV con primera fila de encabezado, columnas en cualquier orden:{" "}
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
              razon_social, nombre, cuit, telefono, email, domicilio, provincia, partido, localidad, niveles_atencion
            </span>. Para "niveles_atencion", separá varios con una barra, ej. <span style={{ fontFamily: "var(--font-mono)", fontSize: 11.5 }}>1|2|3</span>.
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <input type="file" accept=".csv,text/csv" onChange={(e) => setBulkFile(e.target.files?.[0] || null)} style={{ fontSize: 12.5, fontFamily: "var(--font-body)" }} />
            <button onClick={subirMasivo} disabled={!bulkFile || bulkLoading} style={btnPrimary(!!bulkFile && !bulkLoading)}>
              {bulkLoading ? "Subiendo..." : "Subir archivo"}
            </button>
          </div>
          {bulkStatus && <div style={{ marginTop: 10, fontSize: 12.5, color: bulkStatus.startsWith("Error") || bulkStatus.startsWith("No se") ? "#A13333" : "#27500A" }}>{bulkStatus}</div>}
        </div>
      )}

      {isAdmin && showForm && (
        <div onClick={() => setShowForm(false)} style={{ position: "fixed", inset: 0, background: "rgba(15,37,71,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, maxWidth: 780, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{editingId ? "Editar prestador" : "Nuevo prestador"}</div>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label style={labelStyle}>Nombre de la persona jurídica</label>
                <input value={form.razon_social} onChange={(e) => setCampo("razon_social", e.target.value)} placeholder="Ej. Consultorio Pérez S.R.L." style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Nombre de fantasía</label>
                <input value={form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} placeholder="Ej. Consultorio Dr. Pérez" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>CUIT</label>
                <input value={form.cuit} onChange={(e) => setCampo("cuit", e.target.value)} placeholder="30-12345678-9" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Teléfono</label>
                <input value={form.telefono} onChange={(e) => setCampo("telefono", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Correo electrónico</label>
                <input type="email" value={form.email} onChange={(e) => setCampo("email", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Domicilio</label>
                <input value={form.domicilio} onChange={(e) => setCampo("domicilio", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Provincia</label>
                <select value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value, partido: "", localidad: "" }))} style={inputStyle}>
                  <option value="">Seleccionar...</option>
                  {(form.provincia && !provincias.some((p) => p.nombre === form.provincia)) && <option value={form.provincia}>{form.provincia}</option>}
                  {provincias.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Partido/Departamento</label>
                <select value={form.partido} onChange={(e) => setForm((f) => ({ ...f, partido: e.target.value, localidad: "" }))} style={inputStyle} disabled={!form.provincia}>
                  <option value="">{form.provincia ? "Seleccionar..." : "Elegí primero la provincia"}</option>
                  {(form.partido && !partidos.some((p) => p.nombre === form.partido)) && <option value={form.partido}>{form.partido}</option>}
                  {partidos.map((p) => <option key={p.id} value={p.nombre}>{p.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Localidad</label>
                <select value={form.localidad} onChange={(e) => setCampo("localidad", e.target.value)} style={inputStyle} disabled={!form.partido}>
                  <option value="">{form.partido ? "Seleccionar..." : "Elegí primero el partido"}</option>
                  {(form.localidad && !localidades.some((l) => l.nombre === form.localidad)) && <option value={form.localidad}>{form.localidad}</option>}
                  {localidades.map((l) => <option key={l.id} value={l.nombre}>{l.nombre}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Estado</label>
                <select value={form.activo ? "1" : "0"} onChange={(e) => setCampo("activo", e.target.value === "1")} style={inputStyle}>
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>Niveles de atención que ofrece</label>
                <div style={{ display: "flex", gap: 16, marginTop: 4 }}>
                  {NIVELES_ATENCION.map(([val, label]) => (
                    <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--ink)", cursor: "pointer" }}>
                      <input type="checkbox" checked={form.niveles_atencion.includes(val)} onChange={() => toggleNivelForm(val)} />
                      {label}
                    </label>
                  ))}
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                  Lo que este prestador puede ofrecer en general. Cada financiador después elige, al vincularlo, cuál de estos niveles le contrató puntualmente.
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Prestaciones que ofrece</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                Buscá por nombre y agregá las prestaciones puntuales que este prestador puede brindar. Cada financiador después elige, al vincularlo, cuáles de estas le contrató.
              </p>

              {form.prestaciones_ofrecidas.length > 0 && (() => {
                const q = ofrecidasQuery.trim().toLowerCase();
                const visibles = form.prestaciones_ofrecidas.filter((pr) => pr.nombre.toLowerCase().includes(q));
                const grupos = {};
                visibles.forEach((pr) => { (grupos[pr.grupo || pr.tipo] ||= []).push(pr); });
                const quitarGrupo = (items) => setForm((f) => {
                  const ids = new Set(items.map((x) => x.id));
                  return { ...f, prestaciones_ofrecidas: f.prestaciones_ofrecidas.filter((x) => !ids.has(x.id)) };
                });
                const toggleGrupoExpandido = (grupo) => setOfrecidasExpanded((prev) => {
                  const next = new Set(prev);
                  if (next.has(grupo)) next.delete(grupo); else next.add(grupo);
                  return next;
                });
                return (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 6 }}>
                      {form.prestaciones_ofrecidas.length} cargada{form.prestaciones_ofrecidas.length === 1 ? "" : "s"}
                    </div>
                    {form.prestaciones_ofrecidas.length > 8 && (
                      <input
                        value={ofrecidasQuery} onChange={(e) => setOfrecidasQuery(e.target.value)}
                        placeholder="Buscar en las ya agregadas..." style={{ ...inputStyle, marginBottom: 8 }}
                      />
                    )}
                    <div style={{ border: "1px solid var(--border)", borderRadius: 8, maxHeight: 260, overflowY: "auto" }}>
                      {Object.entries(grupos).map(([grupo, items]) => {
                        const expandido = ofrecidasExpanded.has(grupo) || !!q;
                        return (
                          <div key={grupo}>
                            <div
                              onClick={() => toggleGrupoExpandido(grupo)}
                              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", background: "var(--bg)", cursor: "pointer" }}
                            >
                              <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 600, color: "var(--muted)" }}>
                                {expandido ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                                {grupo} ({items.length})
                              </span>
                              <button onClick={(e) => { e.stopPropagation(); quitarGrupo(items); }} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 11, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0 }}>
                                Quitar todas
                              </button>
                            </div>
                            {expandido && items.map((pr) => (
                              <div key={pr.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px 6px 26px", borderTop: "1px solid var(--border)" }}>
                                <span style={{ fontSize: 13, color: "var(--ink)" }}>{pr.nombre}</span>
                                <button onClick={() => quitarPrestacionOfrecida(pr.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "var(--muted)" }}>
                                  <X size={13} />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      {visibles.length === 0 && (
                        <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--muted)" }}>Ninguna coincide con la búsqueda.</div>
                      )}
                    </div>
                  </div>
                );
              })()}

              <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                  <input
                    value={prestacionQuery} onChange={(e) => setPrestacionQuery(e.target.value)}
                    placeholder="Buscar prestación por nombre (ej. Pediatría, Ecografía)..." style={{ ...inputStyle, paddingLeft: 30 }}
                  />
                </div>
                <button onClick={() => setShowExplorer(true)} style={{ ...btnPrimary(true), background: "var(--surface)", color: "var(--primary-dark)", border: "1px solid var(--primary)", whiteSpace: "nowrap" }}>
                  Elegir por categoría
                </button>
              </div>
              {prestacionQuery.trim() && (
                <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 8, maxHeight: 220, overflowY: "auto" }}>
                  {prestacionBuscando && <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--muted)" }}>Buscando...</div>}
                  {!prestacionBuscando && prestacionResultados.length === 0 && (
                    <div style={{ padding: "8px 10px", fontSize: 12.5, color: "var(--muted)" }}>Sin resultados.</div>
                  )}
                  {!prestacionBuscando && prestacionResultados.map((pr) => (
                    <button
                      key={pr.id}
                      onClick={() => agregarPrestacionOfrecida(pr)}
                      style={{
                        display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none",
                        background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-body)",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{pr.tipo}</span> · {pr.nombre}
                    </button>
                  ))}
                </div>
              )}

              {showExplorer && (
                <CategoryExplorerModal
                  onClose={() => setShowExplorer(false)}
                  onAdd={(items) => setForm((f) => {
                    const yaIds = new Set(f.prestaciones_ofrecidas.map((x) => x.id));
                    return { ...f, prestaciones_ofrecidas: [...f.prestaciones_ofrecidas, ...items.filter((it) => !yaIds.has(it.id))] };
                  })}
                />
              )}
            </div>

            {formError && <div style={{ marginTop: 12, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{formError}</div>}

            <button onClick={guardarPrestador} disabled={!form.nombre.trim() || saving} style={{ ...btnPrimary(!!form.nombre.trim()), marginTop: 16 }}>
              {saving ? "Guardando..." : editingId ? "Guardar cambios" : "Crear prestador"}
            </button>

            <div style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Financiadores con los que trabaja</div>
              {!editingId ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>Se vincula después de crear el prestador.</div>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                    Buscá y agregá los financiadores que contrataron a este prestador.
                  </p>

                  {linkedIds.size > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {clientes.filter((c) => linkedIds.has(c.id)).map((c) => (
                        <span key={c.id} style={{
                          display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 20,
                          background: "var(--primary-tint)", border: "1px solid var(--primary)", fontSize: 12.5, color: "var(--primary-dark)",
                        }}>
                          {c.nombre}
                          <button onClick={() => toggleFinanciador(c.id)} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, display: "flex", color: "var(--primary-dark)" }}>
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ position: "relative" }}>
                    <Search size={14} color="var(--muted)" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
                    <input
                      value={financiadorQuery} onChange={(e) => setFinanciadorQuery(e.target.value)}
                      placeholder="Buscar financiador por nombre o sigla..." style={{ ...inputStyle, paddingLeft: 30 }}
                    />
                  </div>
                  {financiadorQuery.trim() && (
                    <div style={{ marginTop: 6, border: "1px solid var(--border)", borderRadius: 8, maxHeight: 200, overflowY: "auto" }}>
                      {clientes
                        .filter((c) => !linkedIds.has(c.id))
                        .filter((c) => {
                          const qq = financiadorQuery.trim().toLowerCase();
                          return (c.nombre || "").toLowerCase().includes(qq) || (c.sigla || "").toLowerCase().includes(qq);
                        })
                        .slice(0, 8)
                        .map((c) => (
                          <button
                            key={c.id}
                            onClick={() => { toggleFinanciador(c.id); setFinanciadorQuery(""); }}
                            style={{
                              display: "block", width: "100%", textAlign: "left", padding: "8px 10px", border: "none",
                              background: "transparent", cursor: "pointer", fontSize: 13, color: "var(--ink)", fontFamily: "var(--font-body)",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--bg)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                          >
                            {c.nombre}{c.sigla ? " · " + c.sigla : ""}
                          </button>
                        ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {isAdminCliente && editingVinculo && (
        <div onClick={() => setEditingVinculo(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,37,71,0.4)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ ...cardStyle, padding: 20, maxWidth: 480, width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{editingVinculo.nombre}</div>
              <button onClick={() => setEditingVinculo(null)} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 16 }}>
              Nivel contratado: {(contratos[editingVinculo.id]?.niveles_contratados || []).map((v) => NIVELES_ATENCION.find(([val]) => val === v)?.[1]).join(", ") || "—"}
              {" "}<span style={{ color: "var(--primary-dark)" }}>(se tilda desde la tabla)</span>
            </div>

            {(contratos[editingVinculo.id]?.niveles_contratados || []).includes("3") && (
              <div style={{ padding: 12, background: "var(--bg)", borderRadius: 8, marginBottom: 14 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)", cursor: "pointer" }}>
                  <input type="checkbox" checked={vinculoForm.cupo_camas} onChange={(e) => setVinculoForm((f) => ({ ...f, cupo_camas: e.target.checked }))} />
                  ¿Tiene cupo de camas asignado en 3º nivel?
                </label>
                {vinculoForm.cupo_camas && (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>Cantidad de camas</label>
                    <input type="number" min="0" value={vinculoForm.cantidad_camas} onChange={(e) => setVinculoForm((f) => ({ ...f, cantidad_camas: e.target.value }))} style={{ ...inputStyle, maxWidth: 140 }} />
                  </div>
                )}
              </div>
            )}

            {(editingVinculo.prestaciones_ofrecidas || []).length > 0 && (() => {
              const q = vinculoPrestacionQuery.trim().toLowerCase();
              const visibles = editingVinculo.prestaciones_ofrecidas.filter((pr) => pr.nombre.toLowerCase().includes(q));
              const contratadasIds = new Set(vinculoForm.prestaciones_contratadas.map((x) => x.id));
              const todasVisiblesContratadas = visibles.length > 0 && visibles.every((pr) => contratadasIds.has(pr.id));
              const seleccionarVisibles = () => setVinculoForm((f) => {
                const yaIds = new Set(f.prestaciones_contratadas.map((x) => x.id));
                return { ...f, prestaciones_contratadas: [...f.prestaciones_contratadas, ...visibles.filter((pr) => !yaIds.has(pr.id))] };
              });
              const quitarVisibles = () => setVinculoForm((f) => {
                const visIds = new Set(visibles.map((x) => x.id));
                return { ...f, prestaciones_contratadas: f.prestaciones_contratadas.filter((x) => !visIds.has(x.id)) };
              });
              const grupos = {};
              visibles.forEach((pr) => { (grupos[pr.tipo] ||= []).push(pr); });
              const toggleGrupo = (items) => setVinculoForm((f) => {
                const itemIds = new Set(items.map((x) => x.id));
                const todosEnGrupo = items.every((pr) => contratadasIds.has(pr.id));
                return todosEnGrupo
                  ? { ...f, prestaciones_contratadas: f.prestaciones_contratadas.filter((x) => !itemIds.has(x.id)) }
                  : { ...f, prestaciones_contratadas: [...f.prestaciones_contratadas, ...items.filter((pr) => !contratadasIds.has(pr.id))] };
              });

              return (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Prestaciones contratadas</label>
                  <p style={{ fontSize: 11.5, color: "var(--muted)", margin: "2px 0 8px" }}>
                    Tildá cuáles de las prestaciones que ofrece este prestador le contrataste.
                    {vinculoForm.prestaciones_contratadas.length > 0 && ` (${vinculoForm.prestaciones_contratadas.length} de ${editingVinculo.prestaciones_ofrecidas.length} seleccionadas)`}
                  </p>
                  {editingVinculo.prestaciones_ofrecidas.length > 6 && (
                    <input
                      value={vinculoPrestacionQuery} onChange={(e) => setVinculoPrestacionQuery(e.target.value)}
                      placeholder="Filtrar por nombre..." style={{ ...inputStyle, marginBottom: 8 }}
                    />
                  )}
                  <button onClick={todasVisiblesContratadas ? quitarVisibles : seleccionarVisibles} style={{ border: "none", background: "transparent", cursor: "pointer", padding: 0, marginBottom: 8, fontSize: 12, fontWeight: 500, color: "var(--primary-dark)", fontFamily: "var(--font-body)" }}>
                    {todasVisiblesContratadas ? `Quitar las ${visibles.length}` : (q ? `Seleccionar las ${visibles.length} de la búsqueda` : `Seleccionar las ${visibles.length}`)}
                  </button>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto" }}>
                    {Object.entries(grupos).map(([tipo, items]) => {
                      const todosDelGrupo = items.every((pr) => contratadasIds.has(pr.id));
                      return (
                        <div key={tipo}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--muted)", cursor: "pointer", marginBottom: 4 }}>
                            <input type="checkbox" checked={todosDelGrupo} onChange={() => toggleGrupo(items)} />
                            {tipo} ({items.length})
                          </label>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 22 }}>
                            {items.map((pr) => (
                              <label key={pr.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--ink)", cursor: "pointer" }}>
                                <input type="checkbox" checked={contratadasIds.has(pr.id)} onChange={() => toggleprestacionContratada(pr)} />
                                {pr.nombre}
                              </label>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {vinculoError && <div style={{ marginBottom: 10, fontSize: 12, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{vinculoError}</div>}
            <button onClick={guardarVinculo} disabled={vinculoSaving} style={{ ...btnPrimary(true), marginBottom: 14 }}>
              {vinculoSaving ? "Guardando..." : "Guardar"}
            </button>

            <div style={{ paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Convenio</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 10 }}>
                Subí el contrato/convenio firmado con este prestador — ahí están las reglas de negocio que después vamos a auditar.
              </p>
              {contratos[editingVinculo.id]?.contrato_ruta ? (
                <button onClick={() => verContratoStorage(contratos[editingVinculo.id].contrato_ruta)} style={{ display: "flex", alignItems: "center", gap: 6, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0, marginBottom: 8 }}>
                  <FileText size={14} /> Ver convenio actual
                </button>
              ) : (
                <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>Todavía no hay convenio adjunto.</div>
              )}
              <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--primary-dark)", cursor: convenioUploading ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5, width: "fit-content" }}>
                <Paperclip size={12} /> {convenioUploading ? "Subiendo..." : (contratos[editingVinculo.id]?.contrato_ruta ? "Reemplazar convenio" : "Adjuntar convenio")}
                <input type="file" onChange={subirConvenio} disabled={convenioUploading} style={{ display: "none" }} />
              </label>
              {convenioError && <div style={{ marginTop: 10, fontSize: 12, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{convenioError}</div>}
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px solid var(--border)" }}>
              <button onClick={quitarVinculo} disabled={vinculoSaving} style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #E3B8B8", background: "transparent", cursor: "pointer", fontSize: 13, fontFamily: "var(--font-body)", color: "#A13333" }}>
                Desvincular este prestador de mi organización
              </button>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
                Borra todo lo tildado (niveles, prestaciones y convenio) y el prestador deja de poder cargar casos o ver tu padrón. No borra los casos ya cargados.
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>
      ) : filtrados.length === 0 ? (
        <EmptyState icon={Stethoscope} text={prestadores.length === 0 ? "Todavía no hay prestadores cargados." : "Ningún prestador coincide con la búsqueda."} />
      ) : (
        <div style={{ ...cardStyle, overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>CUIT</th>
                <th style={thStyle}>Localidad</th>
                {isAdmin && <th style={thStyle}>Estado</th>}
                {isAdminCliente && NIVELES_ATENCION.map(([val, label]) => <th key={val} style={{ ...thStyle, textAlign: "center" }}>{label}</th>)}
                {isAdminCliente && <th style={thStyle}>Detalle</th>}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((p) => {
                const contrato = contratos[p.id];
                const niveles = contrato?.niveles_contratados || [];
                const ofrece = (val) => (p.niveles_atencion || []).length === 0 || (p.niveles_atencion || []).includes(val);
                return (
                  <tr
                    key={p.id}
                    onClick={() => { if (isAdmin) openEdit(p); }}
                    style={{ cursor: isAdmin ? "pointer" : "default" }}
                    onMouseEnter={(e) => { if (isAdmin) e.currentTarget.style.background = "var(--bg)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td style={{ ...tdStyle, fontWeight: 500 }}>{p.nombre}</td>
                    <td style={tdStyle}>{p.cuit || "—"}</td>
                    <td style={tdStyle}>{p.localidad || "—"}</td>
                    {isAdmin && (
                      <td style={tdStyle}>
                        <Pill bg={p.activo ? "#EAF3DE" : "#FCEBEB"} fg={p.activo ? "#27500A" : "#791F1F"}>{p.activo ? "Activo" : "Inactivo"}</Pill>
                      </td>
                    )}
                    {isAdminCliente && NIVELES_ATENCION.map(([val]) => (
                      <td key={val} style={{ ...tdStyle, textAlign: "center" }}>
                        <input
                          type="checkbox" checked={niveles.includes(val)} disabled={!ofrece(val)}
                          onChange={() => toggleNivelInline(p, val)}
                          title={!ofrece(val) ? "Este prestador no ofrece este nivel" : ""}
                        />
                      </td>
                    ))}
                    {isAdminCliente && (
                      <td style={tdStyle}>
                        {!linkedIds.has(p.id) ? (
                          <span style={{ fontSize: 12, color: "var(--muted)" }}>—</span>
                        ) : (
                          <button onClick={() => abrirVinculo(p)} style={{ display: "flex", alignItems: "center", gap: 5, border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--primary-dark)", fontFamily: "var(--font-body)", padding: 0 }}>
                            {contrato?.contrato_ruta ? <FileText size={13} /> : <Paperclip size={13} />}
                            {(contrato?.prestaciones_contratadas || []).length > 0 ? `${contrato.prestaciones_contratadas.length} prestaciones` : "Prestaciones y convenio"}
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ReglasView({ perfil }) {
  const isAdminGeneral = perfil.rol === "Administrador";
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState(isAdminGeneral ? "" : perfil.cliente_id);

  const [tipo, setTipo] = useState(CASE_TYPES[0]);
  const [catalogoItemId, setCatalogoItemId] = useState("");
  const [catalogoItemName, setCatalogoItemName] = useState("");
  const [tipoRegla, setTipoRegla] = useState("cantidad");
  const [anioCalendario, setAnioCalendario] = useState(true);
  const [limite, setLimite] = useState(3);
  const [periodoMeses, setPeriodoMeses] = useState(12);
  const [limitePeriodo, setLimitePeriodo] = useState(1);
  const [intervaloMeses, setIntervaloMeses] = useState(12);
  const [margenGracia, setMargenGracia] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [reglas, setReglas] = useState([]);
  const [loadingReglas, setLoadingReglas] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!isAdminGeneral) return;
    supabase.from("clientes").select("id, nombre").order("nombre").then(({ data }) => setClientes(data || []));
  }, [isAdminGeneral]);

  useEffect(() => {
    setCatalogoItemId(""); setCatalogoItemName("");
  }, [tipo]);

  const loadReglas = () => {
    setShowForm(false);
    if (!clienteId) { setReglas([]); return; }
    setLoadingReglas(true);
    supabase.from("reglas_autorizacion")
      .select("id, tipo_regla, limite_anual, periodo_meses, limite_periodo, intervalo_meses, margen_gracia_meses, activo, catalogo_items(nombre, catalogo_key)")
      .eq("cliente_id", clienteId)
      .then(({ data }) => { setReglas(data || []); setLoadingReglas(false); });
  };
  useEffect(loadReglas, [clienteId]);

  const dbTipoRegla = tipoRegla === "intervalo" ? "intervalo" : (anioCalendario ? "anual" : "periodo");

  const guardarRegla = async () => {
    if (!clienteId || !catalogoItemId) return;
    if (dbTipoRegla === "anual" && !limite) return;
    if (dbTipoRegla === "periodo" && (!periodoMeses || !limitePeriodo)) return;
    if (dbTipoRegla === "intervalo" && !intervaloMeses) return;
    setSaving(true); setError("");
    const payload = {
      cliente_id: clienteId, catalogo_item_id: catalogoItemId, activo: true, tipo_regla: dbTipoRegla,
      limite_anual: null, periodo_meses: null, limite_periodo: null, intervalo_meses: null, margen_gracia_meses: 0,
    };
    if (dbTipoRegla === "anual") { payload.limite_anual = limite; payload.margen_gracia_meses = margenGracia; }
    else if (dbTipoRegla === "periodo") { payload.periodo_meses = periodoMeses; payload.limite_periodo = limitePeriodo; }
    else { payload.intervalo_meses = intervaloMeses; payload.margen_gracia_meses = margenGracia; }

    const { error } = await supabase.from("reglas_autorizacion")
      .upsert(payload, { onConflict: "cliente_id,catalogo_item_id" });
    setSaving(false);
    if (error) { setError(error.message); return; }
    setCatalogoItemId(""); setCatalogoItemName("");
    setLimite(3); setPeriodoMeses(12); setLimitePeriodo(1); setIntervaloMeses(24); setMargenGracia(1);
    loadReglas();
  };

  const toggleActivo = async (id, activo) => {
    await supabase.from("reglas_autorizacion").update({ activo: !activo }).eq("id", id);
    loadReglas();
  };

  return (
    <div style={{ padding: "28px 24px" }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 4 }}>Reglas de autorización</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 24 }}>
        Cantidad por año, o intervalo mínimo entre solicitudes. Al no cumplirse, el sistema no deja cargar el caso y pide gestionar una autorización especial.
      </p>

      {isAdminGeneral && (
        <>
          <label style={labelStyle}>Cliente</label>
          <select value={clienteId} onChange={(e) => setClienteId(e.target.value)} style={{ ...inputStyle, marginBottom: 20 }}>
            <option value="">Seleccionar cliente...</option>
            {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </>
      )}

      {clienteId && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              {loadingReglas ? "Cargando..." : `${reglas.length} regla${reglas.length === 1 ? "" : "s"} cargada${reglas.length === 1 ? "" : "s"}`}
            </div>
            {!showForm && (
              <button onClick={() => setShowForm(true)} style={btnPrimary(true)}>
                <Plus size={16} /> Nueva regla
              </button>
            )}
          </div>

          {showForm && (
          <div style={{ ...cardStyle, padding: 20, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>Nueva regla</div>
              <button onClick={() => setShowForm(false)} style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: 12.5, color: "var(--muted)", fontFamily: "var(--font-body)" }}>
                Cancelar
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
              <div>
                <label style={labelStyle}>Tipo de auditoría</label>
                <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={inputStyle}>
                  {CASE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Tipo de regla</label>
                <select value={tipoRegla} onChange={(e) => setTipoRegla(e.target.value)} style={inputStyle}>
                  <option value="anual">Cantidad por año</option>
                  <option value="intervalo">Intervalo mínimo (meses)</option>
                </select>
              </div>
            </div>

            <label style={{ ...labelStyle, marginTop: 14 }}>{CASE_TYPE_CONFIG[tipo].fieldLabel}</label>
            <CatalogPicker
              key={tipo}
              catalogoKey={CASE_TYPE_CONFIG[tipo].catalogKey}
              canManage={true}
              onChange={(id, nombre) => { setCatalogoItemId(id); setCatalogoItemName(nombre); }}
            />

            <label style={{ ...labelStyle, marginTop: 14 }}>Tipo de regla</label>
            <select value={tipoRegla} onChange={(e) => setTipoRegla(e.target.value)} style={inputStyle}>
              <option value="cantidad">Cantidad de veces</option>
              <option value="intervalo">Intervalo mínimo entre solicitudes</option>
            </select>

            {tipoRegla === "cantidad" ? (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: 13, color: "var(--ink)", cursor: "pointer" }}>
                  <input type="checkbox" checked={anioCalendario} onChange={(e) => setAnioCalendario(e.target.checked)} />
                  ¿Año calendario?
                </label>

                {anioCalendario ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
                      <div>
                        <label style={labelStyle}>Cantidad de estudios por año</label>
                        <input type="number" min={1} value={limite} onChange={(e) => setLimite(Number(e.target.value))} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Meses de tolerancia</label>
                        <input type="number" min={0} value={margenGracia} onChange={(e) => setMargenGracia(Number(e.target.value))} style={inputStyle} />
                      </div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                      Enero a diciembre exclusivamente. Si se supera el límite pero faltan pocos meses para que cierre el año (según la tolerancia), se deja cargar igual, marcado para revisión especial.
                    </div>
                  </>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 10 }}>
                    <div>
                      <label style={labelStyle}>Cantidad de meses</label>
                      <input type="number" min={1} value={periodoMeses} onChange={(e) => setPeriodoMeses(Number(e.target.value))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Cantidad de estudios en ese período</label>
                      <input type="number" min={1} value={limitePeriodo} onChange={(e) => setLimitePeriodo(Number(e.target.value))} style={inputStyle} />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 }}>
                  <div>
                    <label style={labelStyle}>Cada cuántos meses</label>
                    <input type="number" min={1} value={intervaloMeses} onChange={(e) => setIntervaloMeses(Number(e.target.value))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Meses de tolerancia</label>
                    <input type="number" min={0} value={margenGracia} onChange={(e) => setMargenGracia(Number(e.target.value))} style={inputStyle} />
                  </div>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
                  Ej: cada 12 meses con 1 de tolerancia → se bloquea antes de los 11 meses; entre 11 y 12 se deja cargar pero queda marcado para revisión especial.
                </div>

              </>
            )}

            {error && <div style={{ marginTop: 12, fontSize: 12.5, color: "#A13333", background: "#FBE7E7", padding: "8px 10px", borderRadius: 8 }}>{error}</div>}

            <button
              onClick={guardarRegla}
              disabled={!catalogoItemId || saving}
              style={{ ...btnPrimary(!!catalogoItemId), marginTop: 16 }}
            >
              {saving ? "Guardando..." : "Guardar regla"}
            </button>
          </div>
          )}

          {loadingReglas ? (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>Cargando...</div>
          ) : reglas.length === 0 ? (
            <EmptyState icon={ShieldCheck} text="Todavía no hay reglas cargadas para este cliente." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reglas.map((r) => (
                <div key={r.id} style={{ ...cardStyle, padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)" }}>{r.catalogo_items?.nombre}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      {r.tipo_regla === "anual" && `Límite: ${r.limite_anual} por año (tolerancia ${r.margen_gracia_meses} meses)`}
                      {r.tipo_regla === "periodo" && `Límite: ${r.limite_periodo} cada ${r.periodo_meses} meses`}
                      {r.tipo_regla === "intervalo" && `Mínimo cada ${r.intervalo_meses} meses (tolerancia ${r.margen_gracia_meses})`}
                    </div>
                  </div>
                  <button onClick={() => toggleActivo(r.id, r.activo)} style={{
                    padding: "5px 12px", borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: "var(--font-body)",
                    border: "1px solid var(--border)", background: r.activo ? "var(--primary-tint)" : "var(--bg)",
                    color: r.activo ? "var(--primary-dark)" : "var(--muted)",
                  }}>
                    {r.activo ? "Activa" : "Inactiva"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}


/* ---------- sidebar ---------- */

const SIDEBAR_WIDTH = 232;

function buildNavGroups(perfil) {
  const groups = [];

  if (perfil.rol === "Administrador" || perfil.rol === "Administrador Cliente") {
    const adminItems = [];
    if (perfil.rol === "Administrador") {
      adminItems.push({
        key: "clientes", label: "Clientes", icon: Building2, view: "clientes",
        children: [
          { key: "padron", label: "Padrón", icon: Users, view: "padron" },
          { key: "reglas", label: "Reglas de negocio", icon: ShieldCheck, view: "reglas" },
        ],
      });
    } else {
      adminItems.push({ key: "reglas", label: "Reglas de negocio", icon: ShieldCheck, view: "reglas" });
    }
    adminItems.push({ key: "prestadores", label: "Prestadores", icon: Stethoscope, view: "prestadores" });
    groups.push({ key: "admin", label: "Administración", items: adminItems });
  }

  groups.push({ key: "auditoria", label: "Auditoría", items: [
    { key: "casos", label: "Casos", icon: ClipboardList, view: "casos" },
  ] });

  if (perfil.rol !== "Administrador" && perfil.rol !== "Prestador") {
    groups.push({ key: "padron", label: "Padrón", items: [
      { key: "padron", label: "Padrón", icon: Users, view: "padron" },
    ] });
  }

  groups.push({ key: "censos", label: "Censos y relevamientos", items: [
    { key: "censo-camas", label: "Censo de camas", icon: BedDouble, view: "censo-camas" },
  ] });
  groups.push({ key: "facturacion", label: "Facturación y recuperos", items: [
    { key: "facturacion", label: "Facturación", icon: Receipt, view: "facturacion" },
  ] });
  groups.push({ key: "traslados", label: "Traslados", items: [
    { key: "traslados", label: "Traslados", icon: Ambulance, view: "traslados" },
  ] });

  if (perfil.rol !== "Prestador") {
    groups.push({ key: "bi", label: "Business Intelligence", items: [
      { key: "bi", label: "Tablero", icon: BarChart3, view: "bi" },
    ] });
  }

  return groups;
}

// Vistas que el rol puede alcanzar según el menú, más las que se llegan por botón (no por nav)
function allowedViewsFor(perfil) {
  const keys = new Set(["nuevo"]);
  buildNavGroups(perfil).forEach((g) => g.items.forEach((item) => {
    keys.add(item.view);
    if (item.children) item.children.forEach((c) => keys.add(c.view));
  }));
  return keys;
}

function Sidebar({ perfil, view, setView }) {
  const groups = buildNavGroups(perfil);

  const [collapsed, setCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem("da_salud_nav_collapsed") || "{}"); } catch { return {}; }
  });
  const toggleGroup = (key) => {
    setCollapsed((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem("da_salud_nav_collapsed", JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <aside style={{
      width: SIDEBAR_WIDTH, flex: `0 0 ${SIDEBAR_WIDTH}px`, minHeight: "100vh",
      background: "var(--surface)", borderRight: "1px solid var(--border)",
      display: "flex", flexDirection: "column", padding: "20px 12px",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 22px" }}>
        <img src="/logo.png" alt="DA Salud" style={{ height: 30, width: "auto" }} />
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>DA Salud</div>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {groups.map((g) => {
          const isCollapsed = !!collapsed[g.key];
          return (
            <div key={g.key} style={{ marginBottom: 4 }}>
              <button
                onClick={() => toggleGroup(g.key)}
                style={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "8px 8px", border: "none", background: "transparent", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase",
                  color: "var(--muted)", fontFamily: "var(--font-body)",
                }}
              >
                {g.label}
                {isCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              </button>
              {!isCollapsed && (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {g.items.map((item) => {
                    const { key, label, icon: Icon, view: itemView, children } = item;
                    const active = view === itemView;
                    const childActive = children?.some((c) => c.view === view);
                    return (
                      <div key={key}>
                        <button
                          onClick={() => setView(itemView)}
                          style={{
                            width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8,
                            border: "none", cursor: "pointer", textAlign: "left",
                            fontSize: 13.5, fontWeight: 500, fontFamily: "var(--font-body)",
                            background: active ? "var(--primary-tint)" : "transparent",
                            color: (active || childActive) ? "var(--primary-dark)" : "var(--ink)",
                          }}
                        >
                          <Icon size={16} /> {label}
                        </button>
                        {children && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                            {children.map((c) => {
                              const CIcon = c.icon;
                              const cActive = view === c.view;
                              return (
                                <button
                                  key={c.key}
                                  onClick={() => setView(c.view)}
                                  style={{
                                    display: "flex", alignItems: "center", gap: 9, padding: "8px 12px 8px 30px", borderRadius: 8,
                                    border: "none", cursor: "pointer", textAlign: "left",
                                    fontSize: 13, fontWeight: 500, fontFamily: "var(--font-body)",
                                    background: cActive ? "var(--primary-tint)" : "transparent",
                                    color: cActive ? "var(--primary-dark)" : "var(--muted)",
                                  }}
                                >
                                  <CIcon size={14} /> {c.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}

/* ---------- próximamente ---------- */

function ProximamenteView({ titulo, descripcion }) {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px", textAlign: "center" }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: "var(--primary-tint)",
        display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px",
      }}>
        <Clock size={26} color="var(--primary-dark)" />
      </div>
      <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", marginBottom: 8 }}>{titulo}</h2>
      <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{descripcion}</p>
    </div>
  );
}

function AppShell({ session }) {
  const [perfil, setPerfil] = useState(null);
  const [view, setViewRaw] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const setView = (v) => {
    setViewRaw(v);
    try { localStorage.setItem("da_salud_view", v); } catch { /* ignore */ }
  };

  useEffect(() => {
    supabase.from("perfiles").select("nombre, rol, cliente_id, clientes(nombre), prestador_id, prestadores(nombre)").eq("id", session.user.id).single()
      .then(async ({ data }) => {
        if (!data) { setPerfil(null); return; }
        let p = { ...data, id: session.user.id, cliente_nombre: data.clientes?.nombre, prestador_nombre: data.prestadores?.nombre };
        if (data.rol === "Prestador" && data.prestador_id) {
          const { data: pc } = await supabase.from("prestador_clientes").select("clientes(id, nombre)").eq("prestador_id", data.prestador_id);
          p.clientesContratados = (pc || []).map((row) => row.clientes).filter(Boolean);
        }
        setPerfil(p);
        const allowed = allowedViewsFor(p);
        let saved = null;
        try { saved = localStorage.getItem("da_salud_view"); } catch { /* ignore */ }
        setViewRaw(saved && allowed.has(saved) ? saved : "casos");
      });
  }, [session]);

  if (!perfil || !view) return <div style={{ minHeight: "100vh", background: "var(--bg)" }} />;

  const VIEW_TITLES = {
    padron: "Padrón", nuevo: "Nuevo caso", casos: "Casos", clientes: "Clientes", prestadores: "Prestadores", reglas: "Reglas de negocio",
    "censo-camas": "Censo de camas", facturacion: "Facturación y recuperos", traslados: "Traslados", bi: "Business Intelligence",
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex" }}>
      <Sidebar perfil={perfil} view={view} setView={setView} />

      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 28px", borderBottom: "1px solid var(--border)", background: "var(--surface)", flexWrap: "wrap", gap: 12 }}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: 16, color: "var(--ink)" }}>
            {VIEW_TITLES[view]}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {(perfil.cliente_nombre || perfil.prestador_nombre) && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 20,
                background: "var(--primary-tint)", border: "1px solid var(--primary)",
              }}>
                <Building2 size={13} color="var(--primary-dark)" />
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--primary-dark)" }}>{perfil.cliente_nombre || perfil.prestador_nombre}</span>
              </div>
            )}
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink)" }}>{perfil.nombre}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{perfil.rol}</div>
            </div>
            <button onClick={() => { try { localStorage.removeItem("da_salud_view"); } catch { /* ignore */ } supabase.auth.signOut(); }} style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "transparent", cursor: "pointer", fontSize: 12.5, fontFamily: "var(--font-body)" }}>
              <LogOut size={14} /> Salir
            </button>
          </div>
        </header>

        <div style={{ flex: 1, minWidth: 0 }}>
          {view === "padron" && <PadronView perfil={perfil} />}
          {view === "nuevo" && <NewCaseView perfil={perfil} goTo={setView} onCreated={() => setRefreshKey((k) => k + 1)} />}
          {view === "casos" && <CasesView refreshKey={refreshKey} perfil={perfil} goTo={setView} />}
          {view === "clientes" && <ClientesView />}
          {view === "prestadores" && <PrestadoresView perfil={perfil} />}
          {view === "reglas" && <ReglasView perfil={perfil} />}
          {view === "censo-camas" && <ProximamenteView titulo="Censo de camas" descripcion="Vas a poder cargar el estado de cada cama (disponible, ocupada o bloqueada) y el afiliado internado, día por día. Es lo próximo que vamos a construir." />}
          {view === "facturacion" && <ProximamenteView titulo="Facturación y recuperos" descripcion="Control de prestaciones facturadas, validación contra lo autorizado y documentado, débitos y detección de oportunidades de recupero." />}
          {view === "traslados" && <ProximamenteView titulo="Traslados" descripcion="Auditoría de pertinencia, coordinación, trazabilidad y control operativo de traslados programados, urgentes y de derivación." />}
          {view === "bi" && <ProximamenteView titulo="Business Intelligence" descripcion="Tablero con indicadores de pendientes, vencidos, tiempo promedio de resolución, consumos y desvíos." />}
        </div>
      </div>
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
