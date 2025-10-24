const { supabaseAdmin } = require('../config/db');
const bcrypt = require('bcrypt');

// Helper: sanitize search
function sanitize(text = '') {
    return String(text).replace(/[%']/g, '').trim();
}

// GET /api/equipo?search=&page=1&pageSize=10&activo=true&profesion=
const listEquipo = async (req, res) => {
    const { search = '', page = 1, pageSize = 10, activo = 'true', profesion = '' } = req.query || {};
    const offset = (parseInt(page) - 1) * parseInt(pageSize);
    try {
        const searchSafe = sanitize(search);
        const profesionSafe = sanitize(profesion);
        // Base select with embedded usuario
        let q = supabaseAdmin
            .from('equipo')
            .select('id_profesional, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, profesion, usuario:usuarios (id_usuario, dni, activo, id_rol)', { count: 'exact' })
            .order('apellido', { ascending: true })
            .range(offset, offset + parseInt(pageSize) - 1);

        if (String(activo) === 'true') {
            // Filtrar solo usuarios activos (tabla relacionada alias: usuario)
            q = q.eq('usuario.activo', true);
        }

        if (searchSafe) {
            const pattern = `%${searchSafe}%`;
            // Buscar por nombre, apellido, email, profesion
            q = q.or(
                `nombre.ilike.${pattern},apellido.ilike.${pattern},email.ilike.${pattern},profesion.ilike.${pattern}`
            );
            // Si es numérico, intentar por DNI exacto
            if (/^\d{6,15}$/.test(searchSafe)) {
                q = q.eq('usuario.dni', Number(searchSafe));
            }
        }

        // Filtro por profesion explícito (como en Ninos.jsx con tipo)
        if (profesionSafe) {
            const ptn = `%${profesionSafe}%`;
            q = q.ilike('profesion', ptn);
        }

        const { data, error, count } = await q;
        if (error) throw error;
        return res.json({ success: true, data: data || [], total: count || 0 });
    } catch (err) {
        console.error('listEquipo error:', err);
        return res.status(500).json({ success: false, message: 'Error al obtener equipo', error: err.message });
    }
};

// POST /api/equipo
// body: { nombre, apellido, telefono?, email?, fecha_nacimiento, foto_perfil?, profesion?, dni, contrasena, rol? }
const crearIntegrante = async (req, res) => {
    const body = req.body || {};
    const { nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, profesion, dni, contrasena, rol } = body;
    if (!nombre || !apellido || !dni || !contrasena) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (nombre, apellido, dni, contrasena)' });
    }

    let insertedUsuario = null;
    let insertedEquipo = null;
    try {
        // 1) Crear usuario (dni + hash)
        const hash = await bcrypt.hash(String(contrasena), 12);
        const userPayload = { dni: Number(dni), password_hash: hash, rol: rol || null, activo: true };
        const { data: user, error: userErr } = await supabaseAdmin
            .from('usuarios')
            .insert([userPayload])
            .select('id_usuario, dni, activo, rol')
            .maybeSingle();
        if (userErr) throw userErr;
        insertedUsuario = user;

        // 2) Crear miembro de equipo
        const equipoPayload = {
            id_profesional: user.id_usuario,
            nombre,
            apellido,
            telefono: telefono || null,
            email: email || null,
            fecha_nacimiento: fecha_nacimiento ? new Date(fecha_nacimiento).toISOString().slice(0, 10) : null,
            foto_perfil: foto_perfil || null,
            profesion: profesion || null,
        };
        const { data: eq, error: eqErr } = await supabaseAdmin
            .from('equipo')
            .insert([equipoPayload])
            .select('id_profesional, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, profesion')
            .maybeSingle();
        if (eqErr) throw eqErr;
        insertedEquipo = eq;

        return res.status(201).json({ success: true, data: { ...eq, usuario: user } });
    } catch (err) {
        // rollbacks best effort
        try {
            if (insertedEquipo) await supabaseAdmin.from('equipo').delete().eq('id_profesional', insertedEquipo.id_profesional);
            if (insertedUsuario) await supabaseAdmin.from('usuarios').delete().eq('id_usuario', insertedUsuario.id_usuario);
        } catch { }
        console.error('crearIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al crear integrante', error: err.message });
    }
};

// PUT /api/equipo/:id_profesional
// body: puede incluir campos de equipo y/o { usuario: { dni?, rol?, activo? } }
const editarIntegrante = async (req, res) => {
    const { id_profesional } = req.params;
    if (!id_profesional) return res.status(400).json({ success: false, message: 'Falta id_profesional' });
    const body = req.body || {};
    const usuarioUpd = body.usuario || {};

    try {
        // Update equipo
        const allowedEquipo = ['nombre', 'apellido', 'telefono', 'email', 'fecha_nacimiento', 'foto_perfil', 'profesion'];
        const eqPayload = {};
        for (const k of allowedEquipo) if (k in body) eqPayload[k] = body[k];
        if ('fecha_nacimiento' in eqPayload && eqPayload.fecha_nacimiento) {
            const d = new Date(eqPayload.fecha_nacimiento);
            if (!isNaN(d)) eqPayload.fecha_nacimiento = d.toISOString().slice(0, 10);
        }
        let updatedEq = null;
        if (Object.keys(eqPayload).length > 0) {
            const { data, error } = await supabaseAdmin
                .from('equipo')
                .update(eqPayload)
                .eq('id_profesional', Number(id_profesional))
                .select('id_profesional, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, profesion')
                .maybeSingle();
            if (error) throw error;
            updatedEq = data;
        }

        // Update usuario
        let updatedUser = null;
        if (usuarioUpd && Object.keys(usuarioUpd).length > 0) {
            const userPayload = {};
            if (usuarioUpd.dni !== undefined) userPayload.dni = Number(usuarioUpd.dni);
            if (usuarioUpd.rol !== undefined) userPayload.rol = usuarioUpd.rol;
            if (usuarioUpd.activo !== undefined) userPayload.activo = !!usuarioUpd.activo;
            if (usuarioUpd.contrasena) {
                userPayload.password_hash = await bcrypt.hash(String(usuarioUpd.contrasena), 12);
            }
            if (Object.keys(userPayload).length > 0) {
                const { data, error } = await supabaseAdmin
                    .from('usuarios')
                    .update(userPayload)
                    .eq('id_usuario', Number(id_profesional))
                    .select('id_usuario, dni, activo, rol')
                    .maybeSingle();
                if (error) throw error;
                updatedUser = data;
            }
        }

        // Return combined
        // If nothing updated, fetch current
        if (!updatedEq || !updatedUser) {
            const { data: current, error: currErr } = await supabaseAdmin
                .from('equipo')
                .select('id_profesional, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil, profesion, usuario:usuarios (id_usuario, dni, activo, id_rol)')
                .eq('id_profesional', Number(id_profesional))
                .maybeSingle();
            if (currErr) throw currErr;
            return res.json({ success: true, data: current });
        }

        return res.json({ success: true, data: { ...(updatedEq || {}), usuario: updatedUser || {} } });
    } catch (err) {
        console.error('editarIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al editar integrante', error: err.message });
    }
};

// DELETE /api/equipo/:id_profesional (borrado lógico sobre usuarios.activo=false)
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
