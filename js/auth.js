// ============================================================
// src/auth/session.js
// Login, logout, sesión activa — sin Supabase Auth
// ============================================================
import { dbGet } from './supabase.js';

// SHA-256 nativo del navegador
async function sha256(texto) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

// ── LOGIN ───────────────────────────────────────────────────
// Retorna el objeto usuario si ok, lanza error si falla
export async function login(usuario, contrasena) {
  const hash = await sha256(contrasena);
  const rows  = await dbGet('usuarios',
    `usuario=eq.${encodeURIComponent(usuario)}&password_hash=eq.${encodeURIComponent(hash)}&activo=eq.true&select=dni,usuario,nombres,rol,email`
  );
  if (!rows.length) throw new Error('Usuario o contraseña incorrectos');
  return rows[0];
}

// ── SESIÓN ──────────────────────────────────────────────────
export function guardarSesion(usuario) {
  localStorage.setItem('usuario', JSON.stringify(usuario));
  localStorage.setItem('lastActivity', Date.now());
}

export function getSesion() {
  try { return JSON.parse(localStorage.getItem('usuario')); }
  catch { return null; }
}

export function cerrarSesion() {
  localStorage.removeItem('usuario');
  localStorage.removeItem('lastActivity');
  window.location.href = 'index.html';
}

// Inactividad: 4 horas en ms
const INACTIVITY_MS = 4 * 60 * 60 * 1000;

export function actualizarActividad() {
  localStorage.setItem('lastActivity', Date.now());
}

export function verificarInactividad() {
  const last = parseInt(localStorage.getItem('lastActivity') || '0');
  if (Date.now() - last > INACTIVITY_MS) {
    cerrarSesion();
    return false;
  }
  return true;
}

// Registrar eventos de actividad
export function iniciarWatchdogInactividad(onTimeout) {
  ['click','keydown','touchstart'].forEach(ev =>
    document.addEventListener(ev, () => actualizarActividad(), { passive: true })
  );
  setInterval(() => {
    if (!verificarInactividad()) onTimeout?.();
  }, 60 * 1000); // check cada minuto
}
