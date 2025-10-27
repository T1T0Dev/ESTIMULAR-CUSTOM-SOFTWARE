/*
    Script de inserción masiva de usuarios (y opcionalmente sus perfiles en profesionales/secretarios)

    Cómo usar:
    1) Configura .env con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.
    2) Edita el array USERS con los datos a insertar.
    3) Ejecuta:  node backend/scriptInsertar.js

    Notas:
    - El esquema requiere usuarios con dni (bigint, UNIQUE) y relaciones en usuario_roles.
    - Para profesionales: provee "tipo: 'profesional'" y "profesionId" (id_departamento en profesiones).
    - Para secretarios: usa "tipo: 'secretario'".
    - Campos mínimos para perfil: nombre, apellido, fecha_nacimiento (YYYY-MM-DD).
*/

require('dotenv').config()
const bcrypt = require('bcrypt')
const { supabaseAdmin } = require('./src/config/db')

const DEFAULT_PASSWORD = 'estimular_2025'
const UPDATE_IF_EXISTS = false // si el usuario (dni) ya existe: false=omitir, true=actualizar password_hash y/o rol

// Personaliza aquí los usuarios a insertar.
// Puedes pasar id_rol (numérico) o rolNombre (string, debe existir en tabla roles).
// Para crear profesional/secretario, provee al menos: nombre, apellido, fecha_nacimiento (YYYY-MM-DD)
// Para profesionales: incluir profesionId (id_departamento) o profesionNombre existente en tabla profesiones.
const USERS = [
    // Ejemplos:
    // {
    //   dni: '44028630',
    //   contrasena: null, // usa DEFAULT_PASSWORD
    //   id_rol: 1,        // o rolNombre: 'profesional'
    //   activo: true,
    //   equipo: {
    //     nombre: 'Tito',
    //     apellido: 'Dev',
    //     telefono: '11-5555-5555',
    //     fecha_nacimiento: '1995-10-24',
    //     profesion: 'Psicólogo',
    //     email: 'tito@estimular.com',
    //     foto_perfil: null,
    //   },
    // },
]

function isValidDni(dni) {
    return /^\d{7,15}$/.test(String(dni || ''))
}

function isValidDateYYYYMMDD(s) {
    if (!s || typeof s !== 'string') return false
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false
    const d = new Date(s)
    return !isNaN(d.getTime())
}

async function fetchRoleIdByName(nombreRol) {
    const { data, error } = await supabaseAdmin
        .from('roles')
        .select('id_rol, nombre_rol')
        .eq('nombre_rol', String(nombreRol))
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data ? data.id_rol : null
}

async function resolveRoleId(u) {
    if (u.id_rol !== undefined && u.id_rol !== null && !Number.isNaN(Number(u.id_rol))) {
        return Number(u.id_rol)
    }
    if (u.rolNombre) {
        const id = await fetchRoleIdByName(u.rolNombre)
        if (!id) throw new Error(`El rol "${u.rolNombre}" no existe. Crea el rol o usa id_rol.`)
        return id
    }
    throw new Error('id_rol es obligatorio (o especifica rolNombre existente)')
}

async function findUserByDni(dni) {
    const { data, error } = await supabaseAdmin
        .from('usuarios')
        .select('id_usuario, dni, id_rol, activo')
        .eq('dni', Number(dni))
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data
}

async function insertUser({ dni, contrasena, id_rol, activo = true }) {
    const password = String(contrasena || DEFAULT_PASSWORD)
    const hash = await bcrypt.hash(password, 12)
    const payload = { dni: Number(dni), password_hash: hash, activo: !!activo }
    if (id_rol !== undefined && id_rol !== null) payload.id_rol = Number(id_rol)

    let data = null
    let error = null

        ; ({ data, error } = await supabaseAdmin
            .from('usuarios')
            .insert([payload])
            .select('id_usuario, dni, id_rol, activo')
            .maybeSingle())

    if (error && error.message && error.message.includes('column "id_rol"')) {
        const retryPayload = { ...payload }
        delete retryPayload.id_rol
            ; ({ data, error } = await supabaseAdmin
                .from('usuarios')
                .insert([retryPayload])
                .select('id_usuario, dni, activo')
                .maybeSingle())
    }

    if (error) throw error

    if (id_rol !== undefined && id_rol !== null) {
        await supabaseAdmin
            .from('usuario_roles')
            .upsert([
                { usuario_id: data.id_usuario, rol_id: Number(id_rol) },
            ], { onConflict: 'usuario_id' })
    }

    return data
}

async function updateExistingUser(userId, { contrasena, id_rol, activo }) {
    const update = {}
    if (contrasena) update.password_hash = await bcrypt.hash(String(contrasena), 12)
    if (id_rol !== undefined && id_rol !== null) update.id_rol = Number(id_rol)
    if (typeof activo === 'boolean') update.activo = activo
    if (Object.keys(update).length === 0) return null
    let data = null
    let error = null
        ; ({ data, error } = await supabaseAdmin
            .from('usuarios')
            .update(update)
            .eq('id_usuario', Number(userId))
            .select('id_usuario, dni, id_rol, activo')
            .maybeSingle())
    if (error && error.message && error.message.includes('column "id_rol"')) {
        const retryPayload = { ...update }
        delete retryPayload.id_rol
            ; ({ data, error } = await supabaseAdmin
                .from('usuarios')
                .update(retryPayload)
                .eq('id_usuario', Number(userId))
                .select('id_usuario, dni, activo')
                .maybeSingle())
    }
    if (error) throw error

    if (id_rol !== undefined && id_rol !== null) {
        await supabaseAdmin
            .from('usuario_roles')
            .upsert([
                { usuario_id: Number(userId), rol_id: Number(id_rol) },
            ], { onConflict: 'usuario_id' })
    }
    return data
}

async function fetchProfesionIdByName(nombre) {
    const { data, error } = await supabaseAdmin
        .from('profesiones')
        .select('id_departamento, nombre')
        .ilike('nombre', nombre)
        .limit(1)
        .maybeSingle()
    if (error) throw error
    return data ? data.id_departamento : null
}

async function upsertProfesional(id_profesional, perfil) {
    if (!perfil) return null
    const { nombre, apellido, fecha_nacimiento } = perfil
    if (!nombre || !apellido || !isValidDateYYYYMMDD(String(fecha_nacimiento))) {
        console.warn(`↪ Profesional omitido para id=${id_profesional}: datos obligatorios incompletos.`)
        return null
    }
    let departamentoId = perfil.profesionId ?? perfil.departamento_id ?? null
    if (!departamentoId && perfil.profesionNombre) {
        departamentoId = await fetchProfesionIdByName(String(perfil.profesionNombre))
    }
    if (!departamentoId) {
        console.warn(`↪ Profesional id=${id_profesional} sin departamento asignado.`)
    }
    const payload = {
        id_profesional: Number(id_profesional),
        nombre: String(nombre),
        apellido: String(apellido),
        telefono: perfil.telefono ? String(perfil.telefono) : null,
        email: perfil.email ? String(perfil.email) : null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: perfil.foto_perfil || null,
        id_departamento: departamentoId || null,
    }
    const { data, error } = await supabaseAdmin
        .from('profesionales')
        .upsert([payload], { onConflict: 'id_profesional' })
        .select('id_profesional, nombre, apellido, id_departamento')
        .maybeSingle()
    if (error) throw error

    if (departamentoId) {
        await supabaseAdmin
            .from('profesional_departamentos')
            .upsert([
                { profesional_id: Number(id_profesional), departamento_id: departamentoId },
            ], { onConflict: 'profesional_id,departamento_id' })
    }

    return data
}

async function upsertSecretario(id_usuario, perfil) {
    if (!perfil) return null
    const { nombre, apellido, fecha_nacimiento } = perfil
    if (!nombre || !apellido || !isValidDateYYYYMMDD(String(fecha_nacimiento))) {
        console.warn(`↪ Secretario omitido para id=${id_usuario}: datos obligatorios incompletos.`)
        return null
    }
    const payload = {
        id: Number(id_usuario),
        nombre: String(nombre),
        apellido: String(apellido),
        telefono: perfil.telefono ? String(perfil.telefono) : null,
        email: perfil.email ? String(perfil.email) : null,
        fecha_nacimiento: String(fecha_nacimiento),
        foto_perfil: perfil.foto_perfil || null,
    }
    const { data, error } = await supabaseAdmin
        .from('secretarios')
        .upsert([payload], { onConflict: 'id' })
        .select('id, nombre, apellido')
        .maybeSingle()
    if (error) throw error
    return data
}

async function run() {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env')
        process.exit(1)
    }

    if (!Array.isArray(USERS) || USERS.length === 0) {
        console.log('No hay usuarios en la lista USERS. Edita el archivo y vuelve a ejecutar.')
        return
    }

    const results = { inserted: 0, updated: 0, skipped: 0, errors: 0 }

    for (const raw of USERS) {
        try {
            if (!isValidDni(raw.dni)) {
                throw new Error(`DNI inválido: ${raw.dni}`)
            }
            const id_rol = await resolveRoleId(raw)

            const existing = await findUserByDni(raw.dni)
            if (existing && !UPDATE_IF_EXISTS) {
                console.log(`↪ Usuario dni=${raw.dni} ya existe (id=${existing.id_usuario}). Omitido.`)
                results.skipped++
                continue
            }

            let userRow = existing
            if (!existing) {
                userRow = await insertUser({ dni: raw.dni, contrasena: raw.contrasena, id_rol, activo: raw.activo })
                console.log(`✔ Insertado usuario id=${userRow.id_usuario} dni=${userRow.dni}`)
                results.inserted++
            } else {
                const updated = await updateExistingUser(existing.id_usuario, { contrasena: raw.contrasena, id_rol, activo: raw.activo })
                if (updated) {
                    console.log(`✔ Actualizado usuario id=${updated.id_usuario} dni=${updated.dni}`)
                    results.updated++
                    userRow = updated
                } else {
                    console.log(`↪ Usuario id=${existing.id_usuario} sin cambios`)
                    results.skipped++
                }
            }

            const tipo = (raw.tipo || 'profesional').toLowerCase()
            if (tipo === 'profesional') {
                const perfil = raw.perfil || raw.equipo || {}
                perfil.profesionId = perfil.profesionId ?? raw.profesionId
                perfil.profesionNombre = perfil.profesionNombre ?? raw.profesionNombre
                const prof = await upsertProfesional(userRow.id_usuario, {
                    nombre: raw.nombre || perfil.nombre,
                    apellido: raw.apellido || perfil.apellido,
                    fecha_nacimiento: raw.fecha_nacimiento || perfil.fecha_nacimiento,
                    telefono: raw.telefono || perfil.telefono,
                    email: raw.email || perfil.email,
                    foto_perfil: raw.foto_perfil || perfil.foto_perfil,
                    profesionId: perfil.profesionId,
                    profesionNombre: perfil.profesionNombre,
                })
                if (prof) console.log(`  ↳ Profesional preparado para id_profesional=${prof.id_profesional}`)
            } else if (tipo === 'secretario') {
                const perfil = raw.perfil || {}
                const sec = await upsertSecretario(userRow.id_usuario, {
                    nombre: raw.nombre || perfil.nombre,
                    apellido: raw.apellido || perfil.apellido,
                    fecha_nacimiento: raw.fecha_nacimiento || perfil.fecha_nacimiento,
                    telefono: raw.telefono || perfil.telefono,
                    email: raw.email || perfil.email,
                    foto_perfil: raw.foto_perfil || perfil.foto_perfil,
                })
                if (sec) console.log(`  ↳ Secretario preparado para id=${sec.id}`)
            }
        } catch (err) {
            results.errors++
            console.error('✖ Error procesando usuario', raw && raw.dni, '-', err && err.message ? err.message : err)
        }
    }

    console.log('--- Resumen ---')
    console.log(results)
}

run().then(() => process.exit(0)).catch((e) => {
    console.error('Fallo general del script:', e && e.message ? e.message : e)
    process.exit(1)
})

