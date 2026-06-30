// ============================================================
// src/api/entregas.js + areas.js + usuarios.js  (un archivo por claridad)
// ============================================================
import { dbGet, dbInsert, dbUpdate, dbDelete } from './supabase.js';

const now = () => new Date().toISOString();

// ══════════════════════════════════════════════════════════════
// ENTREGAS
// ══════════════════════════════════════════════════════════════

export async function getEntregas(filtros = {}) {
  let params = 'order=created_at.desc';
  if (filtros.encargado) params += `&usuario_encargado=eq.${encodeURIComponent(filtros.encargado)}`;
  return dbGet('entregas', params);
}

export async function crearEntrega(numero, encargado) {
  return dbInsert('entregas', {
    numero_entrega:    numero,
    usuario_encargado: encargado,
    estado:            'Iniciada',
    inicio:            now(),
    created_at:        now(),
    updated_at:        now(),
  });
}

export async function finalizarEntrega(numero) {
  return dbUpdate('entregas', `numero_entrega=eq.${encodeURIComponent(numero)}`, {
    estado:     'Completada',
    final:      now(),
    updated_at: now(),
  });
}

export async function adminEditarEntrega(numero, campos) {
  return dbUpdate('entregas', `numero_entrega=eq.${encodeURIComponent(numero)}`, {
    ...campos,
    updated_at: now(),
  });
}

export async function adminEliminarEntrega(numero) {
  return dbDelete('entregas', `numero_entrega=eq.${encodeURIComponent(numero)}`);
}

// ══════════════════════════════════════════════════════════════
// AREAS
// ══════════════════════════════════════════════════════════════

export async function getAreas() {
  const rows = await dbGet('areas', 'order=nombre.asc');
  return rows.map(r => r.nombre);
}

export async function adminCrearArea(nombre) {
  return dbInsert('areas', { nombre });
}

export async function adminEditarArea(nombreAntiguo, nombreNuevo) {
  return dbUpdate('areas', `nombre=eq.${encodeURIComponent(nombreAntiguo)}`, { nombre: nombreNuevo });
}

export async function adminEliminarArea(nombre) {
  return dbDelete('areas', `nombre=eq.${encodeURIComponent(nombre)}`);
}

// ══════════════════════════════════════════════════════════════
// USUARIOS
// ══════════════════════════════════════════════════════════════

export async function getUsuarios() {
  return dbGet('usuarios', 'order=nombres.asc');
}

export async function getOperarios() {
  return dbGet('usuarios', 'rol=eq.Operario&activo=eq.true&select=usuario,nombres&order=nombres.asc');
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function crearUsuario(dni, usuario, nombre, rol, contrasena, email) {
  const hash = await sha256(contrasena);
  return dbInsert('usuarios', { dni, usuario, nombres: nombre, rol, password_hash: hash, email, activo: true });
}

export async function adminEditarUsuario(dni, campos) {
  if (campos.contrasena) {
    campos.password_hash = await sha256(campos.contrasena);
    delete campos.contrasena;
  }
  return dbUpdate('usuarios', `dni=eq.${encodeURIComponent(dni)}`, campos);
}
