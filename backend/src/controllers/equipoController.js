const { supabaseAdmin } = require('../config/db');
const bcrypt = require('bcrypt');

function sanitize(text = '') {
    return String(text).replace(/[%']/g, '').trim();
}

function isValidDateYYYYMMDD(s) {
    if (!s || typeof s !== 'string') return false;
    const m = s.match(/^\d{4}-\d{2}-\d{2}$/);
    if (!m) return false;
    const d = new Date(s);
    return !isNaN(d.getTime());
}

async function resolveRoleIdMaybe(body) {
    if (!body) return null;
    const idCandidate = body.id_rol ?? body.rol_id;
    if (idCandidate !== undefined && idCandidate !== null && !Number.isNaN(Number(idCandidate))) {
        return Number(idCandidate);
    }
    if (body.rolNombre) {
        const roleName = String(body.rolNombre).trim();
        if (!roleName) return null;
        try {
            const { data, error } = await supabaseAdmin
                .from('roles')
                .select('id_rol, nombre_rol')
                .eq('nombre_rol', roleName)
                .limit(1)
                .maybeSingle();
            if (error) {
                console.error('resolveRoleIdMaybe roles error:', error);
                return null;
            }
            return data ? Number(data.id_rol) : null;
        } catch (err) {
            console.error('resolveRoleIdMaybe exception:', err);
            return null;
        }
    }
    return null;
}

async function assignRoleToUser(usuarioId, rolId) {
    if (!usuarioId || !rolId) return;
    try {
        const { error } = await supabaseAdmin
            .from('usuario_roles')
            .upsert(
                [{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }],
                { onConflict: 'usuario_id' }
            );
        if (error && error.code !== '23505') {
            console.error('assignRoleToUser error:', error);
        }
    } catch (err) {
        console.error('assignRoleToUser exception:', err);
    }
}

async function insertUsuario({ dni, contrasena, id_rol, activo = true }) {
    const hash = await bcrypt.hash(String(contrasena), 12);
    const basePayload = { dni: Number(dni), password_hash: hash, activo: !!activo };
    if (id_rol !== undefined && id_rol !== null) {
        basePayload.id_rol = Number(id_rol);
    }

    let insertData = null;
    let insertErr = null;

    ({ data: insertData, error: insertErr } = await supabaseAdmin
        .from('usuarios')
        .insert([basePayload])
        .select('id_usuario, dni, activo, id_rol')
        .maybeSingle());

    if (insertErr && insertErr.message && insertErr.message.includes('column "id_rol"')) {
        const retryPayload = { ...basePayload };
        delete retryPayload.id_rol;
        ({ data: insertData, error: insertErr } = await supabaseAdmin
            .from('usuarios')
            .insert([retryPayload])
            .select('id_usuario, dni, activo')
            .maybeSingle());
    }

    if (insertErr) throw insertErr;

    await assignRoleToUser(insertData.id_usuario, id_rol);
    return insertData;
}

function mapProfesionalRow(row) {
    if (!row) return row;
    const departamento = row.departamento || null;
    return {
        ...row,
        profesion: departamento?.nombre || null,
        profesion_id: departamento?.id_departamento ?? row.id_departamento ?? null,
    };
}

// GET /api/equipo
const listEquipo = async (req, res) => {
    const { search = '', page = 1, pageSize = 10, activo = 'true', profesion = '', tipo = 'profesional' } = req.query || {};
    if (String(tipo) !== 'profesional') {
        return res.json({ success: true, data: [], total: 0 });
    }

    const offset = (parseInt(page, 10) - 1) * parseInt(pageSize, 10);
    try {
        const searchSafe = sanitize(search);
        const profesionSafe = sanitize(profesion);

        let q = supabaseAdmin
            .from('profesionales')
            .select(`
        id_profesional,
        nombre,
        apellido,
        telefono,
        email,
        fecha_nacimiento,
        foto_perfil,
        id_departamento,
        departamento:profesiones ( id_departamento, nombre ),
        usuario:usuarios ( id_usuario, dni, activo, id_rol )
      `, { count: 'exact' })
            .order('apellido', { ascending: true })
            .range(offset, offset + parseInt(pageSize, 10) - 1);

        if (String(activo) === 'true') {
            q = q.eq('usuario.activo', true);
        }

        if (searchSafe) {
            const pattern = `%${searchSafe}%`;
            q = q.or(
                [
                    `nombre.ilike.${pattern}`,
                    `apellido.ilike.${pattern}`,
                    `email.ilike.${pattern}`,
                    `telefono.ilike.${pattern}`,
                    `departamento.nombre.ilike.${pattern}`,
                ].join(',')
            );
            if (/^\d{6,15}$/.test(searchSafe)) {
                q = q.eq('usuario.dni', Number(searchSafe));
            }
        }

        if (profesionSafe) {
            if (/^\d+$/.test(profesionSafe)) {
                q = q.eq('id_departamento', Number(profesionSafe));
            } else {
                const ptn = `%${profesionSafe}%`;
                q = q.ilike('departamento.nombre', ptn);
            }
        }

        const { data, error, count } = await q;
        if (error) throw error;

        const mapped = (data || []).map(mapProfesionalRow);
        return res.json({ success: true, data: mapped, total: count || 0 });
    } catch (err) {
        console.error('listEquipo error:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener equipo', error: err.message });
    }
};

// POST /api/equipo
const crearIntegrante = async (req, res) => {
    const body = req.body || {};
    const {
        tipo = 'profesional',
        nombre,
        apellido,
        telefono,
        email,
        fecha_nacimiento,
        foto_perfil,
        profesionId,
        departamento_id,
        dni,
        contrasena,
    } = body;

    const roleId = await resolveRoleIdMaybe(body);

    if (!nombre || !apellido || !dni || !contrasena || !fecha_nacimiento) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (nombre, apellido, dni, contrasena, fecha_nacimiento)' });
    }
    if (!/^\d{7,15}$/.test(String(dni))) {
        return res.status(400).json({ success: false, message: 'DNI inválido (7-15 dígitos)' });
    }
    if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
        return res.status(400).json({ success: false, message: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    const normalizedTipo = String(tipo).toLowerCase();
    if (normalizedTipo === 'profesional') {
        const resolvedDep = profesionId ?? departamento_id;
        if (resolvedDep === undefined || resolvedDep === null || Number.isNaN(Number(resolvedDep))) {
            return res.status(400).json({ success: false, message: 'profesionId es obligatorio para profesionales' });
        }
    }

    let insertedUsuario = null;
    try {
        insertedUsuario = await insertUsuario({ dni, contrasena, id_rol: roleId, activo: true });

        if (normalizedTipo === 'profesional') {
            const resolvedDep = Number(profesionId ?? departamento_id);
            const profesionalPayload = {
                id_profesional: insertedUsuario.id_usuario,
                nombre,
                apellido,
                telefono: telefono || null,
                email: email || null,
                fecha_nacimiento: String(fecha_nacimiento),
                foto_perfil: foto_perfil || null,
                id_departamento: resolvedDep,
            };

            const { data: profesional, error: profesionalErr } = await supabaseAdmin
                .from('profesionales')
                .insert([profesionalPayload])
                .select(`
          id_profesional,
          nombre,
          apellido,
          telefono,
          email,
          fecha_nacimiento,
          foto_perfil,
          id_departamento,
          departamento:profesiones ( id_departamento, nombre )
        `)
                .maybeSingle();
            if (profesionalErr) throw profesionalErr;

            await supabaseAdmin
                .from('profesional_departamentos')
                .upsert(
                    [{ profesional_id: insertedUsuario.id_usuario, departamento_id: resolvedDep }],
                    { onConflict: 'profesional_id,departamento_id' }
                );

            return res.status(201).json({ success: true, data: mapProfesionalRow(profesional) });
        }

        // Secretarios
        const secretarioPayload = {
            id: insertedUsuario.id_usuario,
            nombre,
            apellido,
            telefono: telefono || null,
            email: email || null,
            fecha_nacimiento: String(fecha_nacimiento),
            foto_perfil: foto_perfil || null,
        };

        const { data: secretario, error: secretarioErr } = await supabaseAdmin
            .from('secretarios')
            .insert([secretarioPayload])
            .select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
            .maybeSingle();
        if (secretarioErr) throw secretarioErr;

        return res.status(201).json({ success: true, data: secretario });
    } catch (err) {
        if (insertedUsuario) {
            try {
                await supabaseAdmin.from('usuarios').delete().eq('id_usuario', insertedUsuario.id_usuario);
            } catch (rollbackErr) {
                console.error('rollback usuario error:', rollbackErr);
            }
        }
        console.error('crearIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al crear integrante', error: err.message });
    }
};

// PUT /api/equipo/:id_profesional
const editarIntegrante = async (req, res) => {
    const { id_profesional } = req.params;
    if (!id_profesional) return res.status(400).json({ success: false, message: 'Falta id_profesional' });
    const body = req.body || {};
    const usuarioUpd = body.usuario || {};

    try {
        const allowedProfesional = ['nombre', 'apellido', 'telefono', 'email', 'fecha_nacimiento', 'foto_perfil', 'id_departamento', 'profesionId'];
        const profPayload = {};
        for (const k of allowedProfesional) {
            if (body[k] !== undefined) profPayload[k] = body[k];
        }

        let updatedProfesional = null;
        if (Object.keys(profPayload).length > 0) {
            if (profPayload.fecha_nacimiento) {
                const d = new Date(profPayload.fecha_nacimiento);
                if (!isNaN(d)) profPayload.fecha_nacimiento = d.toISOString().slice(0, 10);
            }
            const depValue = profPayload.profesionId ?? profPayload.id_departamento;
            if (depValue !== undefined) {
                profPayload.id_departamento = depValue === null ? null : Number(depValue);
                delete profPayload.profesionId;
            }

            const { data, error } = await supabaseAdmin
                .from('profesionales')
                .update(profPayload)
                .eq('id_profesional', Number(id_profesional))
                .select(`
          id_profesional,
          nombre,
          apellido,
          telefono,
          email,
          fecha_nacimiento,
          foto_perfil,
          id_departamento,
          departamento:profesiones ( id_departamento, nombre )
        `)
                .maybeSingle();
            if (error) throw error;
            updatedProfesional = mapProfesionalRow(data);

            if (profPayload.id_departamento !== undefined && profPayload.id_departamento !== null) {
                const { error: depErr } = await supabaseAdmin
                    .from('profesional_departamentos')
                    .upsert(
                        [{ profesional_id: Number(id_profesional), departamento_id: profPayload.id_departamento }],
                        { onConflict: 'profesional_id,departamento_id' }
                    );
                if (depErr && depErr.code !== '23505') {
                    console.warn('editarIntegrante profesional_departamentos warning:', depErr.message);
                }
            }
        }

        let updatedUser = null;
        if (usuarioUpd && Object.keys(usuarioUpd).length > 0) {
            const userPayload = {};
            if (usuarioUpd.dni !== undefined) userPayload.dni = Number(usuarioUpd.dni);
            if (usuarioUpd.id_rol !== undefined) userPayload.id_rol = Number(usuarioUpd.id_rol);
            if (usuarioUpd.activo !== undefined) userPayload.activo = !!usuarioUpd.activo;
            if (usuarioUpd.contrasena) {
                userPayload.password_hash = await bcrypt.hash(String(usuarioUpd.contrasena), 12);
            }

            if (Object.keys(userPayload).length > 0) {
                let userUpdateErr = null;
                ({ data: updatedUser, error: userUpdateErr } = await supabaseAdmin
                    .from('usuarios')
                    .update(userPayload)
                    .eq('id_usuario', Number(id_profesional))
                    .select('id_usuario, dni, activo, id_rol')
                    .maybeSingle());

                if (userUpdateErr && userUpdateErr.message && userUpdateErr.message.includes('column "id_rol"')) {
                    const retryPayload = { ...userPayload };
                    delete retryPayload.id_rol;
                    ({ data: updatedUser, error: userUpdateErr } = await supabaseAdmin
                        .from('usuarios')
                        .update(retryPayload)
                        .eq('id_usuario', Number(id_profesional))
                        .select('id_usuario, dni, activo')
                        .maybeSingle());
                }

                if (userUpdateErr) throw userUpdateErr;

                if (usuarioUpd.id_rol !== undefined) {
                    await assignRoleToUser(Number(id_profesional), Number(usuarioUpd.id_rol));
                }
            }
        }

        if (!updatedProfesional || !updatedUser) {
            const { data: current, error: currErr } = await supabaseAdmin
                .from('profesionales')
                .select(`
          id_profesional,
          nombre,
          apellido,
          telefono,
          email,
          fecha_nacimiento,
          foto_perfil,
          id_departamento,
          departamento:profesiones ( id_departamento, nombre ),
          usuario:usuarios ( id_usuario, dni, activo, id_rol )
        `)
                .eq('id_profesional', Number(id_profesional))
                .maybeSingle();
            if (currErr) throw currErr;
            return res.json({ success: true, data: mapProfesionalRow(current) });
        }

        return res.json({ success: true, data: { ...(updatedProfesional || {}), usuario: updatedUser || {} } });
    } catch (err) {
        console.error('editarIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al editar integrante', error: err.message });
    }
};

// DELETE /api/equipo/:id_profesional
const borrarIntegrante = async (req, res) => {
    const { id_profesional } = req.params;
    if (!id_profesional) return res.status(400).json({ success: false, message: 'Falta id_profesional' });
    try {
        const { data, error } = await supabaseAdmin
            .from('usuarios')
            .update({ activo: false })
            .eq('id_usuario', Number(id_profesional))
            .select('id_usuario, activo')
            .maybeSingle();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        console.error('borrarIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al eliminar integrante', error: err.message });
    }
};

module.exports = { listEquipo, crearIntegrante, editarIntegrante, borrarIntegrante };
