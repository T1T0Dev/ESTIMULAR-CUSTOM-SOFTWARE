const { supabaseAdmin } = require('../config/db');
const { upsertWithIdentityOverride } = require('../utils/upsertWithIdentityOverride');
const { resolveStorageAsset } = require('../utils/storage');
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

function isSafePassword(pwd) {
    const forbidden = [/('|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i];
    return (
        typeof pwd === 'string'
        && pwd.length >= 8
        && !forbidden.some((regex) => regex.test(pwd))
    );
}

function normalizeRoleLabel(value = '') {
    return String(value || '')
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .trim();
}

async function resolveRoleIdsFromInputs(inputs = []) {
    const numericIds = new Set();
    const roleNames = new Set();

    (inputs || []).forEach((entry) => {
        if (entry === undefined || entry === null) return;
        if (typeof entry === 'number' && !Number.isNaN(entry)) {
            numericIds.add(Number(entry));
            return;
        }
        if (typeof entry === 'object') {
            const obj = entry || {};
            if (obj.id_rol !== undefined) {
                numericIds.add(Number(obj.id_rol));
                return;
            }
            if (obj.rol_id !== undefined) {
                numericIds.add(Number(obj.rol_id));
                return;
            }
            if (obj.nombre) {
                roleNames.add(String(obj.nombre));
                return;
            }
            if (obj.rolNombre) {
                roleNames.add(String(obj.rolNombre));
                return;
            }
        }
        if (typeof entry === 'string') {
            const trimmed = entry.trim();
            if (!trimmed) return;
            if (/^\d+$/.test(trimmed)) {
                numericIds.add(Number(trimmed));
                return;
            }
            roleNames.add(trimmed);
        }
    });

    const resolvedIds = Array.from(numericIds).filter((id) => !Number.isNaN(id));
    if (!roleNames.size) {
        return resolvedIds;
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('roles')
            .select('id_rol, nombre_rol');
        if (error) {
            console.error('resolveRoleIdsFromInputs roles error:', error);
            return resolvedIds;
        }
        const catalog = Array.isArray(data) ? data : [];
        const normalizedCatalog = catalog.map((role) => ({
            id: Number(role.id_rol),
            nombre: role.nombre_rol,
            key: normalizeRoleLabel(role.nombre_rol),
        }));

        roleNames.forEach((rawName) => {
            const normalizedName = normalizeRoleLabel(rawName);
            if (!normalizedName) return;

            let matched = normalizedCatalog.find((item) => item.key === normalizedName);
            if (!matched) {
                matched = normalizedCatalog.find(
                    (item) => item.key.includes(normalizedName) || normalizedName.includes(item.key)
                );
            }
            if (matched && !Number.isNaN(matched.id)) {
                resolvedIds.push(matched.id);
            } else {
                console.warn('resolveRoleIdsFromInputs: rol no encontrado para', rawName);
            }
        });
    } catch (err) {
        console.error('resolveRoleIdsFromInputs exception:', err);
    }

    return Array.from(new Set(resolvedIds.filter((id) => !Number.isNaN(id))));
}

async function resolveRoleIdMaybe(body) {
    if (!body) return null;
    const idCandidate = body.id_rol ?? body.rol_id;
    if (idCandidate !== undefined && idCandidate !== null && !Number.isNaN(Number(idCandidate))) {
        return Number(idCandidate);
    }
    if (body.rolNombre) {
        const ids = await resolveRoleIdsFromInputs([body.rolNombre]);
        if (ids.length > 0) {
            return ids[0];
        }
        return null;
    }
    return null;
}

async function assignRoleToUser(usuarioId, rolId) {
    if (!usuarioId || !rolId) return;
    try {
        // Usar conflicto compuesto; si falla por constraint ausente, intentar insert y omitir duplicados
        let { error } = await supabaseAdmin
            .from('usuario_roles')
            .upsert(
                [{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }],
                { onConflict: 'usuario_id,rol_id' }
            );
        if (error) {
            const ins = await supabaseAdmin
                .from('usuario_roles')
                .insert([{ usuario_id: Number(usuarioId), rol_id: Number(rolId) }]);
            if (ins.error && ins.error.code !== '23505') {
                console.error('assignRoleToUser error:', ins.error);
            }
        }
    } catch (err) {
        console.error('assignRoleToUser exception:', err);
    }
}

async function fetchRolesForUsers(userIds = []) {
    const uniqueIds = Array.from(new Set((userIds || []).map((id) => Number(id)).filter((id) => !Number.isNaN(id))));
    if (uniqueIds.length === 0) return {};
    try {
        const { data, error } = await supabaseAdmin
            .from('usuario_roles')
            .select(`
                usuario_id,
                rol_id,
                rol:roles ( id_rol, nombre_rol )
            `)
            .in('usuario_id', uniqueIds);
        if (error) {
            console.error('fetchRolesForUsers error:', error);
            return {};
        }
        const map = {};
        for (const row of data || []) {
            if (!row) continue;
            const usuarioId = Number(row.usuario_id);
            if (Number.isNaN(usuarioId)) continue;
            if (!map[usuarioId]) {
                map[usuarioId] = [];
            }
            map[usuarioId].push({
                id: row.rol_id ?? row.rol?.id_rol ?? null,
                nombre: row.rol?.nombre_rol ?? null,
            });
        }
        return map;
    } catch (err) {
        console.error('fetchRolesForUsers exception:', err);
        return {};
    }
}

async function insertUsuario({ dni, contrasena, id_rol, activo = true }) {
    const hash = await bcrypt.hash(String(contrasena), 12);
    const basePayload = { dni: Number(dni), password_hash: hash, activo: !!activo };

    let insertData = null;
    let insertErr = null;

    ({ data: insertData, error: insertErr } = await supabaseAdmin
        .from('usuarios')
        .insert([basePayload])
        .select('id_usuario, dni, activo')
        .maybeSingle());

    if (insertErr) throw insertErr;

    if (id_rol !== undefined && id_rol !== null && !Number.isNaN(Number(id_rol))) {
        await assignRoleToUser(insertData.id_usuario, id_rol);
    }
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

async function mapProfesionalRowWithStorage(row) {
    if (!row) return row;
    const base = mapProfesionalRow(row);
    const foto = await resolveStorageAsset(base?.foto_perfil);
    return {
        ...base,
        foto_perfil: foto.signedUrl || base?.foto_perfil || null,
        foto_perfil_url: foto.signedUrl || null,
        foto_perfil_path: foto.path,
    };
}

async function mapSecretarioRowWithStorage(row) {
    if (!row) return row;
    const foto = await resolveStorageAsset(row.foto_perfil);
    return {
        ...row,
        foto_perfil: foto.signedUrl || row.foto_perfil || null,
        foto_perfil_url: foto.signedUrl || null,
        foto_perfil_path: foto.path,
    };
}

// GET /api/equipo
const listEquipo = async (req, res) => {
    const {
        search = '',
        page = 1,
        pageSize = 10,
        activo = 'true',
        profesion = '',
        tipo = 'todos',
        departamentoId: departamentoIdParam,
        departamento: departamentoParam,
    } = req.query || {};

    const departamentoRaw = departamentoIdParam ?? departamentoParam ?? '';
    const departamentoId = Number.parseInt(departamentoRaw, 10);
    const filterByDepartamento = departamentoRaw !== '' && !Number.isNaN(departamentoId);

    const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
    const size = Math.max(Number.parseInt(pageSize, 10) || 10, 1);
    const tipoFiltro = String(tipo || 'todos').toLowerCase();
    const includeProfesionales = tipoFiltro === 'profesional' || tipoFiltro === 'todos' || filterByDepartamento;
    const includeSecretarios = tipoFiltro === 'secretario' || tipoFiltro === 'todos';

    const searchRaw = typeof search === 'string' ? search.trim() : '';
    const profesionRaw = typeof profesion === 'string' ? profesion.trim() : '';
    const searchLower = searchRaw.toLowerCase();
    const searchDigits = searchRaw.replace(/\D/g, '');
    const profesionLower = profesionRaw.toLowerCase();
    const activoOnly = String(activo) !== 'false';

    try {
        const miembros = [];
        const userIds = new Set();

        let profesionalesData = [];
        if (includeProfesionales) {
            const { data, error } = await supabaseAdmin
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
                    departamento:profesiones!equipo_id_departamento_fkey ( id_departamento, nombre ),
                    usuario:usuarios ( id_usuario, dni, activo, password_hash )
                `)
                .order('apellido', { ascending: true });
            if (error) throw error;
            profesionalesData = await Promise.all((data || []).map((row) => mapProfesionalRowWithStorage(row)));
        }

        let secretariosData = [];
        if (includeSecretarios) {
            let secretariosResult = await supabaseAdmin
                .from('secretarios')
                .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                .order('apellido', { ascending: true });

            if (secretariosResult.error && secretariosResult.error.code === '42703') {
                secretariosResult = await supabaseAdmin
                    .from('secretarios')
                    .select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                    .order('apellido', { ascending: true });
            }

            if (secretariosResult.error) throw secretariosResult.error;
            const secretariosRaw = secretariosResult.data || [];
            secretariosData = await Promise.all(secretariosRaw.map((row) => mapSecretarioRowWithStorage(row)));
        }

        const secretarioUserIds = secretariosData
            .map((row) => Number(row.usuario_id ?? row.id))
            .filter((id) => !Number.isNaN(id));

        let usuariosSecretarios = [];
        if (secretarioUserIds.length > 0) {
            const { data, error } = await supabaseAdmin
                .from('usuarios')
                .select('id_usuario, dni, activo, password_hash')
                .in('id_usuario', secretarioUserIds);
            if (error) throw error;
            usuariosSecretarios = data || [];
        }
        const usuariosMap = new Map();
        usuariosSecretarios.forEach((user) => {
            if (!user) return;
            usuariosMap.set(Number(user.id_usuario), user);
        });

        profesionalesData.forEach((row) => {
            const user = row.usuario || {};
            const userId = Number(user.id_usuario ?? row.id_profesional);
            if (!userId || Number.isNaN(userId)) {
                return;
            }
            userIds.add(userId);
            miembros.push({
                tipo: 'profesional',
                id_usuario: userId,
                id_profesional: row.id_profesional,
                nombre: row.nombre || null,
                apellido: row.apellido || null,
                telefono: row.telefono === null || row.telefono === undefined ? null : String(row.telefono),
                email: row.email || null,
                fecha_nacimiento: row.fecha_nacimiento || null,
                foto_perfil: row.foto_perfil || null,
                foto_perfil_url: row.foto_perfil_url || row.foto_perfil || null,
                foto_perfil_path: row.foto_perfil_path || null,
                profesion: row.profesion || null,
                profesion_id: row.profesion_id ?? null,
                dni: user?.dni ?? null,
                password_hash: user?.password_hash ?? null,
                usuario_activo: user?.activo ?? null,
            });
        });

        secretariosData.forEach((row) => {
            const userId = Number(row.usuario_id ?? row.id);
            if (!userId || Number.isNaN(userId)) {
                return;
            }
            const user = usuariosMap.get(userId) || {};
            userIds.add(userId);
            miembros.push({
                tipo: 'secretario',
                id_usuario: userId,
                id_secretario: row.id,
                nombre: row.nombre || null,
                apellido: row.apellido || null,
                telefono: row.telefono === null || row.telefono === undefined ? null : String(row.telefono),
                email: row.email || null,
                fecha_nacimiento: row.fecha_nacimiento || null,
                foto_perfil: row.foto_perfil || null,
                foto_perfil_url: row.foto_perfil_url || row.foto_perfil || null,
                foto_perfil_path: row.foto_perfil_path || null,
                profesion: null,
                profesion_id: null,
                dni: user?.dni ?? null,
                password_hash: user?.password_hash ?? null,
                usuario_activo: user?.activo ?? null,
            });
        });

        const rolesMap = await fetchRolesForUsers(Array.from(userIds));
        miembros.forEach((member) => {
            const memberRoles = rolesMap[member.id_usuario] || [];
            member.roles = memberRoles;
            member.rol_principal = memberRoles[0]?.nombre
                || (member.tipo === 'profesional'
                    ? (member.profesion || 'Profesional')
                    : 'Secretario/a');
        });

        const filtered = miembros.filter((member) => {
            if (activoOnly && member.usuario_activo === false) return false;

            if (filterByDepartamento) {
                if (member.tipo !== 'profesional') return false;
                const memberDepartamentoId = Number.parseInt(
                    member.profesion_id ?? member.id_departamento ?? member.departamento_id ?? null,
                    10
                );
                if (Number.isNaN(memberDepartamentoId) || memberDepartamentoId !== departamentoId) {
                    return false;
                }
            }

            if (profesionLower) {
                const rolText = (member.rol_principal || '').toLowerCase();
                const profText = (member.profesion || '').toLowerCase();
                if (!rolText.includes(profesionLower) && !profText.includes(profesionLower)) {
                    return false;
                }
            }

            if (searchLower) {
                const values = [
                    member.nombre,
                    member.apellido,
                    member.email,
                    member.telefono,
                    member.dni ? String(member.dni) : '',
                    member.rol_principal,
                    member.profesion,
                ]
                    .filter(Boolean)
                    .map((v) => String(v).toLowerCase());

                let matches = values.some((value) => value.includes(searchLower));
                if (!matches && searchDigits) {
                    const dniValue = member.dni ? String(member.dni) : '';
                    matches = dniValue.includes(searchDigits);
                }

                if (!matches) return false;
            }

            return true;
        });

        filtered.sort((a, b) => {
            const apellidoA = (a.apellido || '').toLowerCase();
            const apellidoB = (b.apellido || '').toLowerCase();
            if (apellidoA !== apellidoB) return apellidoA.localeCompare(apellidoB, 'es');
            const nombreA = (a.nombre || '').toLowerCase();
            const nombreB = (b.nombre || '').toLowerCase();
            return nombreA.localeCompare(nombreB, 'es');
        });

        const total = filtered.length;
        const start = (pageNum - 1) * size;
        const paginated = filtered.slice(start, start + size);

        return res.json({ success: true, data: paginated, total });
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

    const normalizedTipo = String(tipo || 'profesional').toLowerCase();
    const rolesSeleccionados = Array.isArray(body.rolesSeleccionados)
        ? body.rolesSeleccionados
        : [];
    const esAdminFlag = body.es_admin ?? body.esAdmin ?? body.admin ?? body.rolAdmin ?? false;

    const baseRoleName = normalizedTipo === 'secretario' ? 'SECRETARIO' : 'PROFESIONAL';
    const requestedRoles = new Set();
    requestedRoles.add(baseRoleName);
    if (normalizedTipo === 'secretario') {
        requestedRoles.add('Secretario');
        requestedRoles.add('Secretaria');
    } else {
        requestedRoles.add('Profesional');
    }
    if (body.rolNombre) requestedRoles.add(body.rolNombre);
    rolesSeleccionados.forEach((value) => requestedRoles.add(value));

    const adminFlag = (() => {
        if (typeof esAdminFlag === 'boolean') return esAdminFlag;
        if (typeof esAdminFlag === 'number') return esAdminFlag === 1;
        if (typeof esAdminFlag === 'string') {
            const normalized = esAdminFlag.trim().toLowerCase();
            return ['true', '1', 'si', 'sí', 'admin', 'administrador'].includes(normalized);
        }
        return false;
    })();
    if (adminFlag) requestedRoles.add('ADMIN');

    let resolvedRoleIds = await resolveRoleIdsFromInputs(Array.from(requestedRoles));
    const baseRoleId = await resolveRoleIdMaybe({ rolNombre: baseRoleName });
    if (baseRoleId && !resolvedRoleIds.includes(baseRoleId)) {
        resolvedRoleIds = [baseRoleId, ...resolvedRoleIds];
    }
    resolvedRoleIds = Array.from(new Set(resolvedRoleIds.filter((id) => !Number.isNaN(id))));
    if (resolvedRoleIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No se pudieron determinar los roles solicitados para el integrante.' });
    }
    const primaryRoleId = resolvedRoleIds[0];

    if (!nombre || !apellido || !dni || !contrasena || !fecha_nacimiento) {
        return res.status(400).json({ success: false, message: 'Faltan datos obligatorios (nombre, apellido, dni, contrasena, fecha_nacimiento)' });
    }
    if (!/^\d{7,15}$/.test(String(dni))) {
        return res.status(400).json({ success: false, message: 'DNI inválido (7-15 dígitos)' });
    }
    if (!isValidDateYYYYMMDD(String(fecha_nacimiento))) {
        return res.status(400).json({ success: false, message: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
    }

    if (normalizedTipo === 'profesional') {
        const resolvedDep = profesionId ?? departamento_id;
        if (resolvedDep === undefined || resolvedDep === null || Number.isNaN(Number(resolvedDep))) {
            return res.status(400).json({ success: false, message: 'profesionId es obligatorio para profesionales' });
        }
    }

    let insertedUsuario = null;
    try {
        insertedUsuario = await insertUsuario({ dni, contrasena, id_rol: primaryRoleId, activo: true });

        const additionalRoles = resolvedRoleIds.filter((roleId) => roleId !== primaryRoleId);
        if (additionalRoles.length > 0) {
            await Promise.all(
                additionalRoles.map((roleId) => assignRoleToUser(insertedUsuario.id_usuario, roleId))
            );
        }

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
                    departamento:profesiones!equipo_id_departamento_fkey ( id_departamento, nombre )
        `)
                .maybeSingle();
            if (profesionalErr) throw profesionalErr;

            await supabaseAdmin
                .from('profesional_departamentos')
                .upsert(
                    [{ profesional_id: insertedUsuario.id_usuario, departamento_id: resolvedDep }],
                    { onConflict: 'profesional_id,departamento_id' }
                );

            const mappedProfesional = await mapProfesionalRowWithStorage(profesional);
            return res.status(201).json({ success: true, data: mappedProfesional });
        }

        // Secretarios
        const secretarioPayloadBase = {
            nombre,
            apellido,
            telefono: telefono || null,
            email: email || null,
            fecha_nacimiento: String(fecha_nacimiento),
            foto_perfil: foto_perfil || null,
        };

        let secretario = null;
        let secretarioErr = null;
        let hasUsuarioIdColumn = true;

        ({ data: secretario, error: secretarioErr } = await supabaseAdmin
            .from('secretarios')
            .upsert([
                {
                    ...secretarioPayloadBase,
                    usuario_id: insertedUsuario.id_usuario,
                },
            ], { onConflict: 'usuario_id', ignoreDuplicates: false })
            .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
            .maybeSingle());

        if (secretarioErr && secretarioErr.code === '42703') {
            hasUsuarioIdColumn = false;
            ({ data: secretario, error: secretarioErr } = await supabaseAdmin
                .from('secretarios')
                .upsert([
                    {
                        ...secretarioPayloadBase,
                        id: insertedUsuario.id_usuario,
                    },
                ], { onConflict: 'id', ignoreDuplicates: false })
                .select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                .maybeSingle());
        }

        if (secretarioErr && ['428C9'].includes(secretarioErr.code)) {
            try {
                const overridePayload = {
                    id: insertedUsuario.id_usuario,
                    nombre,
                    apellido,
                    telefono: telefono || null,
                    email: email || null,
                    fecha_nacimiento: String(fecha_nacimiento),
                    foto_perfil: foto_perfil || null,
                };
                if (hasUsuarioIdColumn) {
                    overridePayload.usuario_id = insertedUsuario.id_usuario;
                }

                secretario = await upsertWithIdentityOverride(
                    'secretarios',
                    overridePayload,
                    { onConflict: 'id' }
                );
                secretarioErr = null;
            } catch (overrideErr) {
                secretarioErr = overrideErr;
            }
        }

        if (secretarioErr) throw secretarioErr;

        const mappedSecretario = await mapSecretarioRowWithStorage(secretario);
        return res.status(201).json({ success: true, data: mappedSecretario });
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
                    departamento:profesiones!equipo_id_departamento_fkey ( id_departamento, nombre )
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
                    .select('id_usuario, dni, activo')
                    .maybeSingle());

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
                    departamento:profesiones!equipo_id_departamento_fkey ( id_departamento, nombre ),
        usuario:usuarios ( id_usuario, dni, activo )
        `)
                .eq('id_profesional', Number(id_profesional))
                .maybeSingle();
            if (currErr) throw currErr;
            const mappedCurrent = await mapProfesionalRowWithStorage(current);
            return res.json({ success: true, data: mappedCurrent });
        }

        const mappedUpdate = updatedProfesional
            ? await mapProfesionalRowWithStorage(updatedProfesional)
            : null;
        return res.json({
            success: true,
            data: {
                ...(mappedUpdate || {}),
                usuario: updatedUser || {},
            },
        });
    } catch (err) {
        console.error('editarIntegrante error:', err);
        return res.status(500).json({ success: false, message: 'Error al editar integrante', error: err.message });
    }
};

const editarSecretario = async (req, res) => {
    const { id_secretario } = req.params;
    const idValue = Number(id_secretario);
    if (!id_secretario || Number.isNaN(idValue)) {
        return res.status(400).json({ success: false, message: 'Falta id_secretario válido' });
    }

    const body = req.body || {};
    const usuarioUpd = body.usuario || {};

    try {
        const allowedSecretario = ['nombre', 'apellido', 'telefono', 'email', 'fecha_nacimiento', 'foto_perfil'];
        const secretarioPayload = {};
        for (const k of allowedSecretario) {
            if (body[k] !== undefined) secretarioPayload[k] = body[k];
        }

        let updatedSecretario = null;
        if (Object.keys(secretarioPayload).length > 0) {
            if (secretarioPayload.fecha_nacimiento) {
                const d = new Date(secretarioPayload.fecha_nacimiento);
                if (!Number.isNaN(d.getTime())) {
                    secretarioPayload.fecha_nacimiento = d.toISOString().slice(0, 10);
                }
            }

            let updateErr = null;
            ({ data: updatedSecretario, error: updateErr } = await supabaseAdmin
                .from('secretarios')
                .update(secretarioPayload)
                .eq('usuario_id', idValue)
                .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                .maybeSingle());

            if (updateErr && updateErr.code === '42703') {
                ({ data: updatedSecretario, error: updateErr } = await supabaseAdmin
                    .from('secretarios')
                    .update(secretarioPayload)
                    .eq('id', idValue)
                    .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                    .maybeSingle());
            }

            if (updateErr) throw updateErr;

            if (!updatedSecretario) {
                let fetchErr = null;
                ({ data: updatedSecretario, error: fetchErr } = await supabaseAdmin
                    .from('secretarios')
                    .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                    .eq('usuario_id', idValue)
                    .maybeSingle());

                if (fetchErr && fetchErr.code === '42703') {
                    ({ data: updatedSecretario, error: fetchErr } = await supabaseAdmin
                        .from('secretarios')
                        .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                        .eq('id', idValue)
                        .maybeSingle());
                }

                if (fetchErr) throw fetchErr;
            }
        } else {
            let fetchErr = null;
            ({ data: updatedSecretario, error: fetchErr } = await supabaseAdmin
                .from('secretarios')
                .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                .eq('usuario_id', idValue)
                .maybeSingle());

            if (fetchErr && fetchErr.code === '42703') {
                ({ data: updatedSecretario, error: fetchErr } = await supabaseAdmin
                    .from('secretarios')
                    .select('id, usuario_id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
                    .eq('id', idValue)
                    .maybeSingle());
            }

            if (fetchErr) throw fetchErr;
        }

        let updatedUser = null;
        if (usuarioUpd && Object.keys(usuarioUpd).length > 0) {
            const userPayload = {};
            if (usuarioUpd.dni !== undefined) userPayload.dni = Number(usuarioUpd.dni);
            if (usuarioUpd.activo !== undefined) userPayload.activo = !!usuarioUpd.activo;
            if (usuarioUpd.contrasena) {
                userPayload.password_hash = await bcrypt.hash(String(usuarioUpd.contrasena), 12);
            }

            if (Object.keys(userPayload).length > 0) {
                let userUpdateErr = null;
                ({ data: updatedUser, error: userUpdateErr } = await supabaseAdmin
                    .from('usuarios')
                    .update(userPayload)
                    .eq('id_usuario', idValue)
                    .select('id_usuario, dni, activo')
                    .maybeSingle());

                if (userUpdateErr) throw userUpdateErr;
            }
        }

        const mappedSecretario = await mapSecretarioRowWithStorage(updatedSecretario);
        return res.json({ success: true, data: { ...mappedSecretario, usuario: updatedUser || {} } });
    } catch (err) {
        console.error('editarSecretario error:', err);
        return res.status(500).json({ success: false, message: 'Error al editar secretario', error: err.message });
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

const restablecerContrasena = async (req, res) => {
    const { id_usuario } = req.params;
    const { nuevaContrasena, contrasena, password } = req.body || {};

    const userId = Number(id_usuario);
    if (!id_usuario || Number.isNaN(userId)) {
        return res.status(400).json({ success: false, message: 'id_usuario inválido' });
    }

    const nueva = nuevaContrasena ?? contrasena ?? password;
    if (!isSafePassword(nueva)) {
        return res.status(400).json({ success: false, message: 'Contraseña inválida. Debe tener al menos 8 caracteres y no contener patrones prohibidos.' });
    }

    try {
        const { data: existingUser, error: fetchErr } = await supabaseAdmin
            .from('usuarios')
            .select('id_usuario')
            .eq('id_usuario', userId)
            .maybeSingle();
        if (fetchErr) throw fetchErr;
        if (!existingUser) {
            return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
        }

        const hash = await bcrypt.hash(String(nueva), 12);
        const { error: updateErr } = await supabaseAdmin
            .from('usuarios')
            .update({ password_hash: hash })
            .eq('id_usuario', userId);
        if (updateErr) throw updateErr;

        return res.json({ success: true, message: 'Contraseña restablecida' });
    } catch (err) {
        console.error('restablecerContrasena error:', err);
        return res.status(500).json({ success: false, message: 'Error al restablecer la contraseña', error: err.message });
    }
};

module.exports = { listEquipo, crearIntegrante, editarIntegrante, editarSecretario, borrarIntegrante, restablecerContrasena };
