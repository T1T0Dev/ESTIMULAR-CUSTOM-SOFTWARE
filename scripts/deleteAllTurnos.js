#!/usr/bin/env node

/**
 * Script para eliminar todos los turnos y limpiar datos relacionados.
 *
 * Uso: node scripts/deleteAllTurnos.js
 */

const path = require('node:path');
const { createRequire } = require('node:module');

let createClient;
let dotenv;
try {
  ({ createClient } = require('@supabase/supabase-js'));
  dotenv = require('dotenv');
} catch (error) {
  const backendRequire = createRequire(path.resolve(__dirname, '..', 'backend', 'package.json'));
  ({ createClient } = backendRequire('@supabase/supabase-js'));
  dotenv = backendRequire('dotenv');
}

// Carga variables de entorno (local) desde backend/.env si existe.
dotenv.config({ path: path.resolve(__dirname, '..', 'backend', '.env') });

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_KEY ||
  ''
).trim();

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Faltan variables de entorno para Supabase.');
  console.error('   Configura SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en Estimular-Tesis/backend/.env');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CHUNK_SIZE = 500;

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

async function deleteFromTable(tableName, ids, label) {
  let totalAffected = 0;
  for (const chunk of chunkArray(ids, CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from(tableName)
      .delete()
      .in('turno_id', chunk)
      .select('turno_id');

    if (error) {
      throw new Error(`Error eliminando en ${tableName}: ${error.message || error}`);
    }

    totalAffected += data?.length || 0;
  }
  console.log(`✔ ${label}: ${totalAffected} registros eliminados`);
}

async function cleanNotificaciones(ids) {
  let total = 0;
  for (const chunk of chunkArray(ids, CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from('notificaciones')
      .update({ turno_id: null })
      .in('turno_id', chunk)
      .select('id');

    if (error) {
      throw new Error(`Error actualizando notificaciones: ${error.message || error}`);
    }
    total += data?.length || 0;
  }
  console.log(`✔ Notificaciones actualizadas: ${total} registros desvinculados`);
}

async function deleteTurnos(ids) {
  let total = 0;
  for (const chunk of chunkArray(ids, CHUNK_SIZE)) {
    const { data, error } = await supabaseAdmin
      .from('turnos')
      .delete()
      .in('id', chunk)
      .select('id');

    if (error) {
      throw new Error(`Error eliminando turnos: ${error.message || error}`);
    }
    total += data?.length || 0;
  }
  console.log(`✔ Turnos eliminados: ${total}`);
}

async function main() {
  try {
    const { data: turnos, error } = await supabaseAdmin
      .from('turnos')
      .select('id');

    if (error) {
      throw new Error(`No se pudieron obtener los turnos: ${error.message || error}`);
    }

    if (!turnos || turnos.length === 0) {
      console.log('ℹ No hay turnos para eliminar.');
      return;
    }

    const turnoIds = turnos.map((t) => t.id);
    console.log(`Se encontraron ${turnoIds.length} turnos. Iniciando limpieza...`);

    await cleanNotificaciones(turnoIds);
    await deleteFromTable('turno_profesionales', turnoIds, 'Relaciones turno-profesionales');
    await deleteFromTable('pagos', turnoIds, 'Pagos vinculados a turnos');
    await deleteTurnos(turnoIds);

    console.log('✅ Proceso finalizado correctamente.');
  } catch (err) {
    console.error('❌ Error eliminando turnos:', err.message || err);
    process.exitCode = 1;
  }
}

main();
