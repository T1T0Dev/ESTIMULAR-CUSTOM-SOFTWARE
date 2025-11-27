const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/db');
const {
	resolveStorageAsset,
	uploadProfileImageIfNeeded,
	deleteStorageAsset,
	isHttpUrl,
} = require('../utils/storage');

const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD_LOGIN || 'estimular_2025';
const MIN_PASSWORD_LENGTH = 8;
const RECEPCION_ROLE_NAMES = ['Recepción', 'Recepcion', 'Recepcionista', 'Secretario', 'Secretaria'];
const PROFESSIONAL_ROLE_NAMES = ['Profesional', 'PROFESIONAL'];
const PASSWORD_FORBIDDEN_PATTERNS = [/("|'|--|;|\/\*|\*\/|xp_|exec|union|select|insert|delete|update|drop|alter|create|shutdown)/i];
const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret_change_me';

function normalize(value) {
	if (value === undefined || value === null) return '';
	return String(value)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

function isAdminRoleName(value) {
	return normalize(value).includes('admin');
}

function normalizeTipo(value) {
	const normalized = normalize(value);
	if (!normalized || normalized === 'todos') return 'todos';
	if (normalized.startsWith('recepcion') || normalized.startsWith('secretar')) {
		return 'recepcion';
	}
	return 'profesional';
}

function isValidDni(dni) {
	if (dni === undefined || dni === null) return false;
	const text = String(dni).trim();
	return /^\d{7,15}$/.test(text);
}

function isValidDate(value) {
	if (!value) return false;
	const date = new Date(value);
	return !Number.isNaN(date.getTime());
}

function isSafePassword(pwd) {
	if (typeof pwd !== 'string') return false;
	if (pwd.trim().length < MIN_PASSWORD_LENGTH) return false;
	return !PASSWORD_FORBIDDEN_PATTERNS.some((regex) => regex.test(pwd));
}

function normalizeEmail(email) {
	if (email === undefined || email === null) return null;
	const trimmed = String(email).trim();
	return trimmed ? trimmed.toLowerCase() : null;
}

function normalizePhone(phone) {
	if (phone === undefined || phone === null) return null;
	const trimmed = String(phone).trim();
	return trimmed || null;
}

function extractToken(req) {
	const auth = req.headers?.authorization || '';
	return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

async function userIsAdmin(userId) {
	if (!userId) return false;
	try {
		const { data, error } = await supabaseAdmin
			.from('usuario_roles')
			.select('rol:roles ( id_rol, nombre_rol )')
			.eq('usuario_id', Number(userId));

		if (error) {
			console.error('userIsAdmin roles error:', error);
			return false;
		}

		return (data || []).some((row) => isAdminRoleName(row?.rol?.nombre_rol));
	} catch (err) {
		console.error('userIsAdmin exception:', err);
		return false;
	}
}

async function ensureDniAvailable(dni, excludeUserId) {
	const parsed = Number(dni);
	if (Number.isNaN(parsed)) return false;
	const query = supabaseAdmin
		.from('usuarios')
		.select('id_usuario')
		.eq('dni', parsed)
		.limit(1);

	if (excludeUserId) {
		query.neq('id_usuario', Number(excludeUserId));
	}

	const { data, error } = await query.maybeSingle();
	if (error && error.code !== 'PGRST116') {
		throw error;
	}
	return !data;
}

async function ensureEmailAvailable(email, excludePersonaId) {
	if (!email) return true;
	const query = supabaseAdmin
		.from('personas')
		.select('id')
		.eq('email', email)
		.limit(1);

	if (excludePersonaId) {
		query.neq('id', Number(excludePersonaId));
	}

	const { data, error } = await query.maybeSingle();
	if (error && error.code !== 'PGRST116') {
		throw error;
	}
	return !data;
}

async function fetchRolesCatalog() {
	const { data, error } = await supabaseAdmin
		.from('roles')
		.select('id_rol, nombre_rol');
	if (error) {
		throw error;
	}
	return (data || []).map((role) => ({
		id: Number(role.id_rol),
		nombre: role.nombre_rol,
		key: normalize(role.nombre_rol),
	}));
}

async function resolveRoleIdsFromInputs(inputs = []) {
	const numeric = new Set();
	const names = new Set();

	inputs.forEach((entry) => {
		if (entry === undefined || entry === null) return;
		if (typeof entry === 'number') {
			if (!Number.isNaN(entry)) numeric.add(Number(entry));
			return;
		}
		if (typeof entry === 'string') {
			const trimmed = entry.trim();
			if (!trimmed) return;
			if (/^\d+$/.test(trimmed)) {
				numeric.add(Number(trimmed));
			} else {
				names.add(trimmed);
			}
			return;
		}
		if (typeof entry === 'object') {
			if (entry.id !== undefined) numeric.add(Number(entry.id));
			if (entry.id_rol !== undefined) numeric.add(Number(entry.id_rol));
			if (entry.rol_id !== undefined) numeric.add(Number(entry.rol_id));
			if (entry.nombre !== undefined) names.add(entry.nombre);
			if (entry.nombre_rol !== undefined) names.add(entry.nombre_rol);
			if (entry.rolNombre !== undefined) names.add(entry.rolNombre);
		}
	});

	const resolved = new Set(Array.from(numeric).filter((n) => Number.isInteger(n)));

	if (names.size === 0) {
		return Array.from(resolved);
	}

	let catalog = [];
	try {
		catalog = await fetchRolesCatalog();
	} catch (err) {
		console.warn('resolveRoleIdsFromInputs catalog error:', err);
		return Array.from(resolved);
	}

	names.forEach((raw) => {
		const key = normalize(raw);
		const match =
			catalog.find((item) => item.key === key) ||
			catalog.find((item) => item.key.includes(key) || key.includes(item.key));
		if (match) {
			resolved.add(match.id);
		} else {
			console.warn('resolveRoleIdsFromInputs: rol no encontrado', raw);
		}
	});

	return Array.from(resolved);
}

async function assignRoles(usuarioId, roleIds = []) {
	if (!usuarioId || !Array.isArray(roleIds) || roleIds.length === 0) return;
	await Promise.all(
		roleIds.map(async (roleId) => {
			if (!roleId) return;
			try {
				const { error } = await supabaseAdmin
					.from('usuario_roles')
					.upsert(
						[{ usuario_id: Number(usuarioId), rol_id: Number(roleId) }],
						{ onConflict: 'usuario_id,rol_id' },
					);
				if (error && error.code !== '23505') {
					console.error('assignRoles upsert error:', error);
				}
			} catch (err) {
				console.error('assignRoles exception:', err);
			}
		}),
	);
}

async function setPersonaProfession(personaId, departamentoId) {
	if (!personaId) return;
	try {
		const { error } = await supabaseAdmin
			.from('profesional_departamentos')
			.delete()
			.eq('profesional_id', Number(personaId));
		if (error && error.code !== 'PGRST116') {
			console.warn('setPersonaProfession delete warn:', error);
		}
	} catch (err) {
		console.warn('setPersonaProfession delete exception:', err);
	}

	if (departamentoId === undefined || departamentoId === null || departamentoId === '') {
		return;
	}

	const parsed = Number(departamentoId);
	if (Number.isNaN(parsed)) return;

	try {
		const { error } = await supabaseAdmin
			.from('profesional_departamentos')
			.upsert(
				[{ profesional_id: Number(personaId), departamento_id: parsed }],
				{ onConflict: 'profesional_id,departamento_id' },
			);
		if (error && error.code !== '23505') {
			console.warn('setPersonaProfession upsert warn:', error);
		}
	} catch (err) {
		console.error('setPersonaProfession upsert exception:', err);
	}
}

async function processProfilePhoto(usuarioId, incoming, previousPath) {
	if (incoming === undefined) {
		return previousPath || null;
	}

	if (!incoming) {
		if (previousPath) {
			await deleteStorageAsset(previousPath);
		}
		return null;
	}

	if (typeof incoming === 'string' && incoming.startsWith('data:image')) {
		const upload = await uploadProfileImageIfNeeded(usuarioId, incoming, { previousPath });
		return upload?.path || previousPath || null;
	}

	if (typeof incoming === 'string') {
		const trimmed = incoming.trim();
		if (!trimmed) {
			if (previousPath) {
				await deleteStorageAsset(previousPath);
			}
			return null;
		}
		if (isHttpUrl(trimmed)) {
			if (previousPath && previousPath !== trimmed) {
				await deleteStorageAsset(previousPath);
			}
			return trimmed;
		}
		if (previousPath && previousPath !== trimmed) {
			await deleteStorageAsset(previousPath);
		}
		return trimmed;
	}

	return previousPath || null;
}

async function fetchRolesMap(userIds = []) {
	if (!Array.isArray(userIds) || userIds.length === 0) {
		return new Map();
	}

	const { data, error } = await supabaseAdmin
		.from('usuario_roles')
		.select('usuario_id, rol:roles(id_rol, nombre_rol)')
		.in('usuario_id', userIds);

	if (error) {
		console.error('fetchRolesMap error:', error);
		return new Map();
	}

	const map = new Map();
	(data || []).forEach((row) => {
		const usuarioId = Number(row.usuario_id);
		if (Number.isNaN(usuarioId)) return;
		const current = map.get(usuarioId) || [];
		current.push({
			id: row.rol?.id_rol ?? null,
			nombre: row.rol?.nombre_rol ?? null,
		});
		map.set(usuarioId, current);
	});
	return map;
}

async function fetchProfessionMap(personaIds = []) {
	if (!Array.isArray(personaIds) || personaIds.length === 0) {
		return new Map();
	}

	const { data, error } = await supabaseAdmin
		.from('profesional_departamentos')
		.select('profesional_id, departamento:profesiones(id_departamento, nombre)')
		.in('profesional_id', personaIds);

	if (error) {
		console.error('fetchProfessionMap error:', error);
		return new Map();
	}

	const map = new Map();
	(data || []).forEach((row) => {
		const personaId = Number(row.profesional_id);
		if (Number.isNaN(personaId)) return;
		map.set(personaId, row.departamento || null);
	});
	return map;
}

async function mapMembers(rows = []) {
	if (!Array.isArray(rows) || rows.length === 0) return [];

	const personaIds = rows
		.map((row) => row.persona?.id ?? row.persona_id)
		.filter((value) => value !== undefined && value !== null);
	const userIds = rows
		.map((row) => row.id_usuario)
		.filter((value) => value !== undefined && value !== null);

	const [roleMap, professionMap] = await Promise.all([
		fetchRolesMap(userIds),
		fetchProfessionMap(personaIds),
	]);

	return Promise.all(
		rows.map(async (row) => {
			const persona = row.persona || {};
			const personaId = persona.id || row.persona_id || null;
			const roles = roleMap.get(Number(row.id_usuario)) || [];
			const profession = professionMap.get(Number(personaId)) || null;
			const foto = await resolveStorageAsset(persona.foto_perfil);

			const hasRecepcionRole = roles.some((role) => {
				const roleKey = normalize(role.nombre);
				return roleKey.startsWith('recepcion') || roleKey.startsWith('secretar');
			});
			const tipo = hasRecepcionRole ? 'recepcion' : 'profesional';

			return {
				tipo,
				id_usuario: row.id_usuario,
				persona_id: personaId,
				id_profesional: personaId,
				nombre: persona.nombre ?? null,
				apellido: persona.apellido ?? null,
				telefono: persona.telefono ?? null,
				email: persona.email ?? null,
				fecha_nacimiento: persona.fecha_nacimiento ?? null,
				foto_perfil: persona.foto_perfil ?? null,
				foto_perfil_url: foto.signedUrl || null,
				foto_perfil_path: persona.foto_perfil || null,
				profesion: profession?.nombre || (tipo === 'recepcion' ? 'Recepción' : null),
				profesion_id: profession?.id_departamento ?? null,
				dni: row.dni ?? null,
				usuario_activo: row.activo,
				roles,
			};
		}),
	);
}

function applyFilters(members, filters) {
	const {
		activoOnly,
		tipoFiltro,
		filterByDepartamento,
		departamentoId,
		profesionLower,
		searchLower,
		searchDigits,
	} = filters;

	return members.filter((member) => {
		if (activoOnly && member.usuario_activo === false) return false;
		if (tipoFiltro === 'profesional' && member.tipo !== 'profesional') return false;
		if (tipoFiltro === 'recepcion' && member.tipo !== 'recepcion') return false;

		if (filterByDepartamento) {
			if (member.tipo !== 'profesional') return false;
			const memberDept = Number(member.profesion_id ?? NaN);
			if (Number.isNaN(memberDept) || memberDept !== departamentoId) return false;
		}

		if (profesionLower) {
			const professionMatches =
				(member.profesion || '').toLowerCase().includes(profesionLower) ||
				(member.roles || []).some((role) => (role.nombre || '').toLowerCase().includes(profesionLower));
			if (!professionMatches) return false;
		}

		if (searchLower) {
			const values = [
				member.nombre,
				member.apellido,
				member.email,
				member.telefono,
				member.profesion,
			]
				.filter(Boolean)
				.map((value) => String(value).toLowerCase());
			let matches = values.some((value) => value.includes(searchLower));
			if (!matches && searchDigits) {
				matches = String(member.dni ?? '').includes(searchDigits);
			}
			if (!matches) return false;
		}

		return true;
	});
}

async function listEquipo(req, res) {
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
	const pageNum = Math.max(Number.parseInt(page, 10) || 1, 1);
	const size = Math.max(Number.parseInt(pageSize, 10) || 10, 1);

	const tipoFiltro = normalizeTipo(tipo || 'todos');
	const profesionLower = String(profesion || '').toLowerCase().trim();
	const searchLower = String(search || '').toLowerCase().trim();
	const searchDigits = searchLower.replace(/\D/g, '');
	const filterByDepartamento = !Number.isNaN(departamentoId);

	const filters = {
		activoOnly: String(activo) !== 'false',
		tipoFiltro,
		filterByDepartamento,
		departamentoId,
		profesionLower,
		searchLower,
		searchDigits,
	};

	try {
		const { data, error } = await supabaseAdmin
			.from('usuarios')
			.select(
				`id_usuario,dni,activo,persona_id,persona:personas(id,nombre,apellido,telefono,email,fecha_nacimiento,foto_perfil)`,
			)
			.order('id_usuario', { ascending: true });

		if (error) throw error;

		const baseRows = (data || []).filter((row) => row.persona_id && row.persona);
		if (baseRows.length === 0) {
			return res.json({ success: true, data: [], total: 0 });
		}

		const members = await mapMembers(baseRows);
		const filtered = applyFilters(members, filters).sort((a, b) => {
			const lastName = (value) => (value ? String(value).toLowerCase() : '');
			const compareLast = lastName(a.apellido).localeCompare(lastName(b.apellido), 'es');
			if (compareLast !== 0) return compareLast;
			return lastName(a.nombre).localeCompare(lastName(b.nombre), 'es');
		});

		const total = filtered.length;
		const start = (pageNum - 1) * size;
		const paginated = filtered.slice(start, start + size);

		return res.json({ success: true, data: paginated, total });
	} catch (err) {
		console.error('listEquipo error:', err);
		return res.status(500).json({
			success: false,
			message: 'Error al obtener equipo',
			error: err.message,
		});
	}
}

async function buildRoleIdsFor(tipo, extraRoleInputs, adminFlag) {
	const roleInputs = [];
	if (Array.isArray(extraRoleInputs)) {
		roleInputs.push(...extraRoleInputs);
	}

	if (tipo === 'recepcion') {
		roleInputs.push(...RECEPCION_ROLE_NAMES);
	} else {
		roleInputs.push(...PROFESSIONAL_ROLE_NAMES);
	}

	if (adminFlag === true || String(adminFlag).trim().toLowerCase() === 'true') {
		roleInputs.push('ADMIN');
	}

	const resolved = await resolveRoleIdsFromInputs(roleInputs);
	return resolved;
}

async function crearIntegrante(req, res) {
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
		rolesSeleccionados,
		rolNombre,
		es_admin,
		esAdmin,
		admin,
	} = body;

	const token = extractToken(req);
	let requesterId = null;
	if (token) {
		try {
			const payload = jwt.verify(token, JWT_SECRET);
			requesterId = payload?.id ?? null;
		} catch (err) {
			console.warn('crearIntegrante token inválido:', err.message);
		}
	}

	if (!requesterId) {
		const headerIdRaw = req.headers['x-user-id'];
		const parsedHeaderId = Number.parseInt(headerIdRaw, 10);
		if (!Number.isNaN(parsedHeaderId)) {
			requesterId = parsedHeaderId;
		}
	}

	if (!requesterId) {
		return res.status(401).json({
			success: false,
			message: 'Credenciales no válidas para crear integrantes',
		});
	}

	const requesterIsAdmin = await userIsAdmin(requesterId);
	if (!requesterIsAdmin) {
		return res.status(403).json({
			success: false,
			message: 'No tiene permisos para crear integrantes',
		});
	}

	if (!nombre || !apellido || !dni || !contrasena || !fecha_nacimiento) {
		return res.status(400).json({
			success: false,
			message: 'Faltan datos obligatorios (nombre, apellido, dni, contrasena, fecha_nacimiento)',
		});
	}

	if (!isValidDni(dni)) {
		return res.status(400).json({ success: false, message: 'DNI inválido. Debe tener entre 7 y 15 números.' });
	}

	if (!isSafePassword(contrasena)) {
		return res.status(400).json({ success: false, message: 'Contraseña inválida o insegura.' });
	}

	if (!isValidDate(fecha_nacimiento)) {
		return res.status(400).json({ success: false, message: 'fecha_nacimiento debe tener formato YYYY-MM-DD' });
	}

	const normalizedTipo = normalizeTipo(tipo) === 'todos' ? 'profesional' : normalizeTipo(tipo);
	const adminFlag = es_admin ?? esAdmin ?? admin ?? false;

	if (
		normalizedTipo === 'profesional' &&
		profesionId === undefined &&
		departamento_id === undefined
	) {
		return res.status(400).json({
			success: false,
			message: 'profesionId es obligatorio para profesionales',
		});
	}

	let persona = null;
	let usuario = null;

	try {
		const dniAvailable = await ensureDniAvailable(dni);
		if (!dniAvailable) {
			return res.status(409).json({ success: false, message: 'El DNI ingresado ya está en uso' });
		}

		const emailNormalized = normalizeEmail(email);
		if (emailNormalized) {
			const emailAvailable = await ensureEmailAvailable(emailNormalized);
			if (!emailAvailable) {
				return res.status(409).json({ success: false, message: 'El email ingresado ya está en uso' });
			}
		}

		const personaPayload = {
			nombre: String(nombre).trim(),
			apellido: String(apellido).trim(),
			telefono: normalizePhone(telefono),
			email: normalizeEmail(email),
			fecha_nacimiento: new Date(fecha_nacimiento).toISOString().slice(0, 10),
			foto_perfil: null,
		};

		const personaInsert = await supabaseAdmin
			.from('personas')
			.insert([personaPayload])
			.select('id, nombre, apellido, telefono, email, fecha_nacimiento, foto_perfil')
			.maybeSingle();

		if (personaInsert.error) {
			if (personaInsert.error.code === '23505') {
				return res.status(409).json({ success: false, message: 'El email ingresado ya está en uso' });
			}
			throw personaInsert.error;
		}

		persona = personaInsert.data;

		const hash = await bcrypt.hash(String(contrasena), 12);
		const usuarioInsert = await supabaseAdmin
			.from('usuarios')
			.insert([
				{
					dni: Number(dni),
					password_hash: hash,
					activo: true,
					primer_registro_completado: false,
					persona_id: persona.id,
				},
			])
			.select('id_usuario, dni, activo, persona_id')
			.maybeSingle();

		if (usuarioInsert.error) {
			if (usuarioInsert.error.code === '23505') {
				return res.status(409).json({ success: false, message: 'El DNI ingresado ya está en uso' });
			}
			throw usuarioInsert.error;
		}

		usuario = usuarioInsert.data;

		if (foto_perfil) {
			try {
				const fotoPath = await processProfilePhoto(usuario.id_usuario, foto_perfil, null);
				if (fotoPath !== null) {
					await supabaseAdmin.from('personas').update({ foto_perfil: fotoPath }).eq('id', persona.id);
					persona.foto_perfil = fotoPath;
				}
			} catch (fotoErr) {
				console.warn('crearIntegrante foto error:', fotoErr);
			}
		}

		const roleInputs = [...(Array.isArray(rolesSeleccionados) ? rolesSeleccionados : [])];
		if (rolNombre) roleInputs.push(rolNombre);

		const roleIds = await buildRoleIdsFor(normalizedTipo, roleInputs, adminFlag);
		if (!roleIds.length) {
			await supabaseAdmin.from('usuarios').delete().eq('id_usuario', usuario.id_usuario);
			await supabaseAdmin.from('personas').delete().eq('id', persona.id);
			return res.status(400).json({ success: false, message: 'No se pudieron asignar roles al integrante.' });
		}

		// limpiar roles previos en caso de residuos y asignar los nuevos
		await supabaseAdmin.from('usuario_roles').delete().eq('usuario_id', usuario.id_usuario);
		await assignRoles(usuario.id_usuario, roleIds);

		if (normalizedTipo === 'profesional') {
			const departamento = Number(profesionId ?? departamento_id);
			await setPersonaProfession(persona.id, Number.isNaN(departamento) ? null : departamento);
		} else {
			await setPersonaProfession(persona.id, null);
		}

		const [member] = await mapMembers([
			{
				id_usuario: usuario.id_usuario,
				dni: usuario.dni,
				activo: usuario.activo,
				persona_id: persona.id,
				persona,
			},
		]);

		return res.status(201).json({ success: true, data: member || null });
	} catch (err) {
		console.error('crearIntegrante error:', err);
		if (usuario?.id_usuario) {
			await supabaseAdmin.from('usuarios').delete().eq('id_usuario', usuario.id_usuario);
		}
		if (persona?.id) {
			await supabaseAdmin.from('personas').delete().eq('id', persona.id);
		}
		return res.status(500).json({
			success: false,
			message: 'Error al crear integrante',
			error: err.message,
		});
	}
}

async function updateMemberCore(userId, body, { forceRecepcion = false } = {}) {
	const idValue = Number(userId);
	if (Number.isNaN(idValue)) {
		return { status: 400, message: 'Identificador inválido' };
	}

	const { data: usuarioRow, error: usuarioErr } = await supabaseAdmin
		.from('usuarios')
		.select(
			`id_usuario,dni,activo,persona_id,persona:personas(id,nombre,apellido,telefono,email,fecha_nacimiento,foto_perfil)`,
		)
		.eq('id_usuario', idValue)
		.maybeSingle();

	if (usuarioErr) {
		return { status: 500, message: usuarioErr.message || 'Error al obtener usuario' };
	}
	if (!usuarioRow) {
		return { status: 404, message: 'Integrante no encontrado' };
	}

	const personaId = usuarioRow.persona?.id || usuarioRow.persona_id;
	if (!personaId) {
		return { status: 500, message: 'Integrante sin persona asociada' };
	}

	const personaPayload = {};
	const {
		nombre,
		apellido,
		telefono,
		email,
		fecha_nacimiento,
		foto_perfil,
		removeFoto,
		profesionId,
		profesion_id,
		tipo,
		tipoUsuario,
		usuario: usuarioPayload = {},
		nuevaContrasena,
		dni,
		activo,
		rolesSeleccionados,
		rolNombre,
		es_admin,
		esAdmin,
		admin,
	} = body || {};

	if (nombre !== undefined) personaPayload.nombre = String(nombre).trim();
	if (apellido !== undefined) personaPayload.apellido = String(apellido).trim();
	if (telefono !== undefined) personaPayload.telefono = normalizePhone(telefono);
	if (email !== undefined) personaPayload.email = normalizeEmail(email);

	if (fecha_nacimiento !== undefined) {
		if (!fecha_nacimiento) {
			personaPayload.fecha_nacimiento = null;
		} else if (!isValidDate(fecha_nacimiento)) {
			return { status: 400, message: 'fecha_nacimiento debe tener formato YYYY-MM-DD' };
		} else {
			personaPayload.fecha_nacimiento = new Date(fecha_nacimiento).toISOString().slice(0, 10);
		}
	}

	const previousPhotoPath = usuarioRow.persona?.foto_perfil || null;
	if (removeFoto === true) {
		personaPayload.foto_perfil = await processProfilePhoto(idValue, null, previousPhotoPath);
	} else if (foto_perfil !== undefined) {
		personaPayload.foto_perfil = await processProfilePhoto(idValue, foto_perfil, previousPhotoPath);
	}

	if (
		personaPayload.email !== undefined &&
		personaPayload.email !== usuarioRow.persona?.email
	) {
		const emailAvailable = await ensureEmailAvailable(personaPayload.email, personaId);
		if (!emailAvailable) {
			return { status: 409, message: 'El email ingresado ya está en uso' };
		}
	}

	if (Object.keys(personaPayload).length > 0) {
		const { error: personaUpdateErr } = await supabaseAdmin
			.from('personas')
			.update(personaPayload)
			.eq('id', Number(personaId));
		if (personaUpdateErr) {
			return {
				status: 500,
				message: personaUpdateErr.message || 'No se pudo actualizar la persona',
			};
		}
	}

	let resolvedTipo = forceRecepcion ? 'recepcion' : null;
	if (!resolvedTipo) {
		resolvedTipo = normalizeTipo(tipo ?? tipoUsuario) || 'profesional';
		if (resolvedTipo === 'todos') {
			resolvedTipo = 'profesional';
		}
	}

	let profesionValue = profesionId;
	if (profesionValue === undefined && profesion_id !== undefined) {
		profesionValue = profesion_id;
	}

	if (resolvedTipo === 'recepcion' || forceRecepcion) {
		profesionValue = null;
	}

	if (profesionValue !== undefined) {
		if (profesionValue === null || profesionValue === '' || Number.isNaN(Number(profesionValue))) {
			await setPersonaProfession(personaId, null);
		} else {
			const parsed = Number(profesionValue);
			if (Number.isNaN(parsed)) {
				return { status: 400, message: 'profesionId inválido' };
			}
			await setPersonaProfession(personaId, parsed);
		}
	}

	const userUpdatePayload = {};
	const dniValue = usuarioPayload.dni ?? dni;
	if (dniValue !== undefined) {
		if (!isValidDni(dniValue)) {
			return { status: 400, message: 'DNI inválido. Debe tener entre 7 y 15 números.' };
		}
		const dniAvailable = await ensureDniAvailable(dniValue, idValue);
		if (!dniAvailable) {
			return { status: 409, message: 'El DNI ingresado ya está en uso' };
		}
		userUpdatePayload.dni = Number(dniValue);
	}

	const activoValue = usuarioPayload.activo ?? activo;
	if (activoValue !== undefined) {
		userUpdatePayload.activo = Boolean(activoValue);
	}

	const passwordValue = usuarioPayload.contrasena ?? nuevaContrasena;
	if (passwordValue) {
		if (!isSafePassword(passwordValue)) {
			return { status: 400, message: 'Contraseña inválida o insegura' };
		}
		if (String(passwordValue) === DEFAULT_PASSWORD) {
			return { status: 400, message: 'Elegí una contraseña distinta a la genérica' };
		}
		userUpdatePayload.password_hash = await bcrypt.hash(String(passwordValue), 12);
	}

	if (Object.keys(userUpdatePayload).length > 0) {
		const { error: usuarioUpdateErr } = await supabaseAdmin
			.from('usuarios')
			.update(userUpdatePayload)
			.eq('id_usuario', idValue);
		if (usuarioUpdateErr) {
			return {
				status: 500,
				message: usuarioUpdateErr.message || 'No se pudieron actualizar las credenciales',
			};
		}
	}

	const roleInputs = [...(Array.isArray(rolesSeleccionados) ? rolesSeleccionados : [])];
	if (rolNombre) roleInputs.push(rolNombre);
	const adminFlag = es_admin ?? esAdmin ?? admin ?? false;

	const roleIds = await buildRoleIdsFor(forceRecepcion ? 'recepcion' : resolvedTipo, roleInputs, adminFlag);
	if (roleIds.length) {
		await supabaseAdmin.from('usuario_roles').delete().eq('usuario_id', idValue);
		await assignRoles(idValue, roleIds);
	}

	const { data: freshRow, error: freshErr } = await supabaseAdmin
		.from('usuarios')
		.select(
			`id_usuario,dni,activo,persona_id,persona:personas(id,nombre,apellido,telefono,email,fecha_nacimiento,foto_perfil)`,
		)
		.eq('id_usuario', idValue)
		.maybeSingle();

	if (freshErr) {
		return { status: 500, message: freshErr.message || 'No se pudo recuperar el integrante actualizado' };
	}

	const members = await mapMembers([freshRow]);
	return { status: 200, data: members[0] || null };
}

async function editarIntegrante(req, res) {
	const { id_profesional } = req.params;
	const result = await updateMemberCore(id_profesional, req.body || {}, {});
	if (result.status !== 200) {
		return res.status(result.status).json({ success: false, message: result.message });
	}
	return res.json({ success: true, data: result.data });
}

async function editarRecepcion(req, res) {
	const { id_recepcion } = req.params;
	const result = await updateMemberCore(id_recepcion, req.body || {}, { forceRecepcion: true });
	if (result.status !== 200) {
		return res.status(result.status).json({ success: false, message: result.message });
	}
	return res.json({ success: true, data: result.data });
}

async function borrarIntegrante(req, res) {
	const { id_profesional } = req.params;
	const parsedId = Number(id_profesional);
	if (Number.isNaN(parsedId)) {
		return res.status(400).json({ success: false, message: 'Falta id_profesional' });
	}

	try {
		const { data, error } = await supabaseAdmin
			.from('usuarios')
			.update({ activo: false })
			.eq('id_usuario', parsedId)
			.select('id_usuario, activo')
			.maybeSingle();
		if (error) throw error;
		if (!data) {
			return res.status(404).json({ success: false, message: 'Integrante no encontrado' });
		}
		return res.json({ success: true, data });
	} catch (err) {
		console.error('borrarIntegrante error:', err);
		return res.status(500).json({
			success: false,
			message: 'Error al eliminar integrante',
			error: err.message,
		});
	}
}

async function restablecerContrasena(req, res) {
	const { id_usuario } = req.params;
	const { nuevaContrasena, contrasena, password } = req.body || {};
	const userId = Number(id_usuario);

	if (Number.isNaN(userId)) {
		return res.status(400).json({ success: false, message: 'id_usuario inválido' });
	}

	const nueva = nuevaContrasena ?? contrasena ?? password ?? DEFAULT_PASSWORD;
	if (!isSafePassword(nueva)) {
		return res.status(400).json({
			success: false,
			message: 'Contraseña inválida. Debe tener al menos 8 caracteres y no contener patrones prohibidos.',
		});
	}
	if (String(nueva) === DEFAULT_PASSWORD) {
		return res.status(400).json({ success: false, message: 'Elegí una contraseña distinta a la genérica' });
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
		return res.status(500).json({
			success: false,
			message: 'Error al restablecer la contraseña',
			error: err.message,
		});
	}
}

module.exports = {
	listEquipo,
	crearIntegrante,
	editarIntegrante,
	editarRecepcion,
	borrarIntegrante,
	restablecerContrasena,
};
