// ============================================================
// src/api/supabase.js
// Cliente único de Supabase — importar desde todos los módulos
// ============================================================

const SUPABASE_URL  = 'https://mwivnsbybzsivicrrbpd.supabase.co';
const SUPABASE_ANON = 'sb_publishable_O0H19Ni20_MsQ7kYsRtlHA_AJ250EKE';

const headers = {
  'Content-Type':  'application/json',
  'apikey':        SUPABASE_ANON,
  'Authorization': `Bearer ${SUPABASE_ANON}`,
};

// GET con query params opcionales
export async function dbGet(table, params = '') {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${params ? '?' + params : ''}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// INSERT — retorna fila insertada
export async function dbInsert(table, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method:  'POST',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// UPDATE por filtro
export async function dbUpdate(table, params, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method:  'PATCH',
    headers: { ...headers, 'Prefer': 'return=representation' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

// DELETE por filtro
export async function dbDelete(table, params) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    method:  'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(await res.text());
  return true;
}
