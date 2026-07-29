export const CASE_TYPE_CONFIG = {
  "Autorización ambulatoria": { fieldLabel: "Especialidad", catalogKey: "especialidades-ambulatorio" },
  "Interconsulta": { fieldLabel: "Especialidad", catalogKey: "especialidades-interconsulta" },
  "Cirugía programada": { fieldLabel: "Especialidad", catalogKey: "especialidades-cirugia" },
  "Internación": { fieldLabel: "Tipo de internación", catalogKey: "sectores-internacion" },
  "Alto costo": { fieldLabel: "Prestación", catalogKey: "prestaciones-alto-costo" },
  "Discapacidad": { fieldLabel: "Prestación", catalogKey: "prestaciones-discapacidad" },
  "Prótesis e implantes": { fieldLabel: "Insumo", catalogKey: "protesis" },
  "Medicamento especial": { fieldLabel: "Medicación", catalogKey: "medicamentos" },
  "Segunda opinión": { fieldLabel: "Especialidad", catalogKey: "especialidades-segunda-opinion" },
};

export const CASE_TYPES = Object.keys(CASE_TYPE_CONFIG);

export const PRIORITIES = ["Alta", "Media", "Baja"];

export const STATUSES = ["Pendiente", "En revisión", "Información adicional", "Autorizado", "Rechazado"];
export const RESOLVED_STATUSES = ["Autorizado", "Rechazado"];

export const STATUS_STYLE = {
  "Pendiente": { bg: "#E1F0EF", fg: "#145F65" },
  "En revisión": { bg: "#FDEFD9", fg: "#8A5A0D" },
  "Información adicional": { bg: "#FDEFD9", fg: "#8A5A0D" },
  "Autorizado": { bg: "#DFF3E1", fg: "#1F6B3A" },
  "Rechazado": { bg: "#FBE7E7", fg: "#A13333" },
};

export function displayCode(id) {
  return "DA-" + id.slice(-6).toUpperCase();
}

export function fmtDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export function slaInfo(dueAt, status, now) {
  if (!dueAt) return { label: "—", tone: "done" };
  if (RESOLVED_STATUSES.includes(status)) return { label: "Resuelto", tone: "done" };
  const diff = new Date(dueAt).getTime() - now;
  const overdue = diff < 0;
  const abs = Math.abs(diff);
  const h = Math.floor(abs / 3600000);
  const m = Math.floor((abs % 3600000) / 60000);
  const txt = (h > 0 ? h + "h " : "") + m + "m";
  if (overdue) return { label: txt + " vencido", tone: "danger" };
  if (diff < 2 * 3600000) return { label: txt, tone: "urgent" };
  return { label: txt, tone: "ok" };
}

export const TONE_COLORS = {
  ok: { bg: "#E1F0EF", fg: "#145F65" },
  urgent: { bg: "#FDEFD9", fg: "#8A5A0D" },
  danger: { bg: "#FBE7E7", fg: "#A13333" },
  done: { bg: "#EEF0F2", fg: "#56697C" },
};
