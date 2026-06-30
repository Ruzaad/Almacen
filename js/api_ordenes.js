// ============================================================
// src/api/ordenes.js
// Todas las operaciones sobre la tabla ordenes
// ============================================================
import { dbGet, dbInsert, dbUpdate, dbDelete } from './supabase.js';

const now = () => new Date().toISOString();

// ── LECTURA ─────────────────────────────────────────────────

export async function getOrdenes(filtros = {}) {
  let params = 'order=created_at.desc';
  if (filtros.encargado) params += `&usuario_encargado=eq.${encodeURIComponent(filtros.encargado)}`;
  if (filtros.estado)    params += `&estado=eq.${encodeURIComponent(filtros.estado)}`;
  return dbGet('ordenes', params);
}

export async function getOrdenesOperario(usuarioOperario) {
  // Órdenes asignadas al operario que no están completadas/canceladas/erróneas
  return dbGet('ordenes',
    `usuario_asignado=eq.${encodeURIComponent(usuarioOperario)}&estado=not.in.(Completada,Cancelada,Erronea)&order=created_at.desc`
  );
}

// ── CREACIÓN ────────────────────────────────────────────────

export async function crearOrden(numero, encargado, of4 = null) {
  const ofFormatted = of4 ? `400000${of4}` : null;
  return dbInsert('ordenes', {
    numero_orden:      numero,
    usuario_encargado: encargado,
    estado:            'Registrada',
    of:                ofFormatted,
    created_at:        now(),
    updated_at:        now(),
  });
}

// ── EDICIÓN ─────────────────────────────────────────────────

export async function marcarFinalOrden(numero, encargado, area, operario = null, of4 = null) {
  const ofFormatted = of4 ? `400000${of4}` : null;
  const campos = {
    usuario_encargado: encargado,
    final_encargado:   now(),
    area,
    estado:            operario ? 'Asignada' : 'Pendiente_De_Asignación',
    updated_at:        now(),
  };
  if (operario)    campos.usuario_asignado = operario;
  if (ofFormatted) campos.of = ofFormatted;
  return dbUpdate('ordenes', `numero_orden=eq.${encodeURIComponent(numero)}`, campos);
}

export async function editarOrdenInicio(numeroOriginal, numeroNuevo, of4 = null) {
  const campos = { updated_at: now() };
  if (numeroNuevo !== numeroOriginal) campos.numero_orden = numeroNuevo;
  if (of4) campos.of = `400000${of4}`;
  return dbUpdate('ordenes', `numero_orden=eq.${encodeURIComponent(numeroOriginal)}`, campos);
}

export async function editarOrden(numero, area = null, operario = null, of4 = null) {
  const campos = { updated_at: now() };
  if (area)    campos.area = area;
  if (operario) { campos.usuario_asignado = operario; campos.estado = 'Asignada'; }
  if (of4)     campos.of = `400000${of4}`;
  return dbUpdate('ordenes', `numero_orden=eq.${encodeURIComponent(numero)}`, campos);
}

export async function rechazarOrden(numero) {
  return dbUpdate('ordenes', `numero_orden=eq.${encodeURIComponent(numero)}`, {
    estado:     'Erronea',
    updated_at: now(),
  });
}

export async function adminEditarOrden(numero, campos) {
  return dbUpdate('ordenes', `numero_orden=eq.${encodeURIComponent(numero)}`, {
    ...campos,
    updated_at: now(),
  });
}

export async function adminEliminarOrden(numero) {
  return dbDelete('ordenes', `numero_orden=eq.${encodeURIComponent(numero)}`);
}

// ── MÉTRICAS ────────────────────────────────────────────────

export async function getMetricasDiarias(fecha) {
  // fecha: 'YYYY-MM-DD'
  const inicio = `${fecha}T00:00:00`;
  const fin    = `${fecha}T23:59:59`;
  const ordenes   = await dbGet('ordenes',   `created_at=gte.${inicio}&created_at=lte.${fin}`);
  const entregas  = await dbGet('entregas',  `created_at=gte.${inicio}&created_at=lte.${fin}`);
  const tiempos   = await dbGet('tiempos',   `created_at=gte.${inicio}&created_at=lte.${fin}`);

  const operariosActivos = [...new Set(tiempos.map(t => t.usuario_operario))].length;

  return {
    ordenes: {
      total:     ordenes.length,
      completadas: ordenes.filter(o => o.estado === 'Completada').length,
      detalle:   ordenes.map(o => ({ numero: o.numero_orden, of: o.of, encargado: o.usuario_encargado, estado: o.estado })),
    },
    entregas: {
      total:    entregas.length,
      detalle:  entregas.map(e => ({ numero: e.numero_entrega, encargado: e.usuario_encargado, estado: e.estado })),
    },
    operariosActivos,
    tiempoPromedioMin: tiempos.length
      ? Math.round(tiempos.filter(t => t.tiempo_neto_minutos).reduce((a,t) => a + t.tiempo_neto_minutos, 0) / tiempos.length)
      : 0,
  };
}
