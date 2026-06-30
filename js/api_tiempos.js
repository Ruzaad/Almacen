// ============================================================
// src/api/tiempos.js
// Operaciones sobre tiempos (registro de trabajo operario)
// ============================================================
import { dbGet, dbInsert, dbUpdate } from './supabase.js';
import { dbUpdate as dbUpd } from './supabase.js';

const now = () => new Date().toISOString();

export async function getTiemposOperario(usuario) {
  const params = usuario && usuario !== '--Todos--'
    ? `usuario_operario=eq.${encodeURIComponent(usuario)}&order=created_at.desc`
    : 'order=created_at.desc';
  return dbGet('tiempos', params);
}

export async function getTiempoActivo(numeroOrden, usuario) {
  const rows = await dbGet('tiempos',
    `numero_orden=eq.${encodeURIComponent(numeroOrden)}&usuario_operario=eq.${encodeURIComponent(usuario)}&estado=eq.En_Progreso`
  );
  return rows[0] || null;
}

// ── INICIAR TRABAJO ─────────────────────────────────────────
export async function iniciarTrabajo(numeroOrden, usuarioOperario) {
  // 1. Crear registro de tiempo
  await dbInsert('tiempos', {
    numero_orden:     numeroOrden,
    usuario_operario: usuarioOperario,
    inicio_operario:  now(),
    estado:           'En_Progreso',
    total_pausas_minutos: 0,
    detalles_pausas:  [],
    created_at:       now(),
  });
  // 2. Actualizar estado de la orden
  await dbUpd('ordenes', `numero_orden=eq.${encodeURIComponent(numeroOrden)}`, {
    estado:     'En_Progreso',
    updated_at: now(),
  });
}

// ── PAUSAR TRABAJO ──────────────────────────────────────────
export async function pausarTrabajo(numeroOrden, usuarioOperario, motivo) {
  const tiempo = await getTiempoActivo(numeroOrden, usuarioOperario);
  if (!tiempo) throw new Error('No hay registro activo para esta orden');

  const pausas = Array.isArray(tiempo.detalles_pausas) ? tiempo.detalles_pausas : [];
  pausas.push({ inicio: now(), fin: null, motivo });

  await dbUpd('tiempos', `id=eq.${tiempo.id}`, {
    estado:          'Pausado',
    detalles_pausas: pausas,
  });
  await dbUpd('ordenes', `numero_orden=eq.${encodeURIComponent(numeroOrden)}`, {
    estado:     'Pausada',
    updated_at: now(),
  });
}

// ── REANUDAR TRABAJO ────────────────────────────────────────
export async function reanudarTrabajo(numeroOrden, usuarioOperario) {
  const rows = await dbGet('tiempos',
    `numero_orden=eq.${encodeURIComponent(numeroOrden)}&usuario_operario=eq.${encodeURIComponent(usuarioOperario)}&estado=eq.Pausado`
  );
  const tiempo = rows[0];
  if (!tiempo) throw new Error('No hay registro pausado para esta orden');

  const pausas = Array.isArray(tiempo.detalles_pausas) ? tiempo.detalles_pausas : [];
  const ultima = pausas[pausas.length - 1];
  if (ultima && !ultima.fin) ultima.fin = now();

  // Calcular minutos de pausa acumulados
  const totalPausas = pausas.reduce((acc, p) => {
    if (p.inicio && p.fin) {
      acc += (new Date(p.fin) - new Date(p.inicio)) / 60000;
    }
    return acc;
  }, 0);

  await dbUpd('tiempos', `id=eq.${tiempo.id}`, {
    estado:               'En_Progreso',
    detalles_pausas:      pausas,
    total_pausas_minutos: Math.round(totalPausas * 100) / 100,
  });
  await dbUpd('ordenes', `numero_orden=eq.${encodeURIComponent(numeroOrden)}`, {
    estado:     'En_Progreso',
    updated_at: now(),
  });
}

// ── COMPLETAR TRABAJO ───────────────────────────────────────
export async function completarTrabajo(numeroOrden, usuarioOperario) {
  const tiempo = await getTiempoActivo(numeroOrden, usuarioOperario);
  if (!tiempo) throw new Error('No hay registro activo para esta orden');

  const finTs  = now();
  const inicio = new Date(tiempo.inicio_operario);
  const fin    = new Date(finTs);
  const bruto  = (fin - inicio) / 60000;
  const neto   = Math.round((bruto - (tiempo.total_pausas_minutos || 0)) * 100) / 100;

  await dbUpd('tiempos', `id=eq.${tiempo.id}`, {
    fin_operario:        finTs,
    estado:              'Completado',
    tiempo_neto_minutos: neto,
  });
  await dbUpd('ordenes', `numero_orden=eq.${encodeURIComponent(numeroOrden)}`, {
    estado:      'Completada',
    fin_operario: finTs,
    updated_at:  finTs,
  });
}

// ── ADMIN: EDITAR TIEMPO ────────────────────────────────────
export async function adminEditarTiempo(numeroOrden, usuarioOperario, campos) {
  const rows = await dbGet('tiempos',
    `numero_orden=eq.${encodeURIComponent(numeroOrden)}&usuario_operario=eq.${encodeURIComponent(usuarioOperario)}`
  );
  if (!rows.length) throw new Error('Registro no encontrado');
  return dbUpd('tiempos', `id=eq.${rows[0].id}`, campos);
}
