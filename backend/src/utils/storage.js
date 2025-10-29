const { supabaseAdmin } = require('../config/db');

const SUPABASE_URL = (process.env.SUPABASE_URL || '').trim();
const SUPABASE_SERVICE_ROLE_KEY = (
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    ''
).trim();
const STORAGE_BUCKET = process.env.STORAGE_BUCKET_EQUIPO || 'equipoestimular';
const SIGNED_URL_TTL_SECONDS = Number.parseInt(
    process.env.FOTO_PERFIL_SIGNED_URL_TTL ?? '',
    10
) || 60 * 60 * 24 * 7; // 7 días

const isHttpUrl = (value) => typeof value === 'string' && /^https?:\/\//i.test(value);

async function createSignedUrlForPath(path, expiresIn = SIGNED_URL_TTL_SECONDS) {
    if (!path) return null;
    try {
        const { data, error } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(path, expiresIn);
        if (error) {
            if (error.code !== 'PGRST116') {
                console.warn('createSignedUrlForPath error:', error);
            }
            return null;
        }
        return data?.signedUrl || null;
    } catch (err) {
        console.error('createSignedUrlForPath exception:', err);
        return null;
    }
}

async function resolveStorageAsset(value, expiresIn = SIGNED_URL_TTL_SECONDS) {
    if (!value) {
        return { path: null, signedUrl: null };
    }
    if (isHttpUrl(value)) {
        return { path: value, signedUrl: value };
    }
    const signedUrl = await createSignedUrlForPath(value, expiresIn);
    return { path: value, signedUrl };
}

async function deleteStorageAsset(path) {
    if (!path || isHttpUrl(path)) return;
    try {
        const { error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).remove([path]);
        if (error && error.code !== 'PGRST116') {
            console.warn('deleteStorageAsset warning:', error);
        }
    } catch (err) {
        console.warn('deleteStorageAsset exception:', err.message || err);
    }
}

function parseDataUrlImage(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') return null;
    const m = dataUrl.match(/^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i);
    if (!m) return null;
    const contentType = m[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : m[1].toLowerCase();
    const base64 = m[3];
    try {
        const buffer = Buffer.from(base64, 'base64');
        return { buffer, contentType };
    } catch (e) {
        return null;
    }
}

function buildStorageObjectUrl(bucket, path) {
    const cleanedUrl = SUPABASE_URL.replace(/\/$/, '');
    const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/');
    return `${cleanedUrl}/storage/v1/object/${bucket}/${encodedPath}`;
}

async function uploadToStorageWithServiceRole(bucket, path, buffer, contentType) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
        console.error('uploadToStorageWithServiceRole: falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para subir archivos.');
        return null;
    }

    if (typeof fetch !== 'function') {
        console.error('uploadToStorageWithServiceRole: fetch API no disponible en este entorno.');
        return null;
    }

    const endpoint = buildStorageObjectUrl(bucket, path);

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                apikey: SUPABASE_SERVICE_ROLE_KEY,
                'Content-Type': contentType || 'application/octet-stream',
                'x-upsert': 'true',
            },
            body: buffer,
        });

        const text = await response.text();
        let parsed = null;
        if (text) {
            try {
                parsed = JSON.parse(text);
            } catch (err) {
                parsed = null;
            }
        }

        if (!response.ok) {
            const err = new Error(
                parsed?.message || parsed?.error?.message || parsed?.error_description || response.statusText
            );
            err.status = response.status;
            err.code = parsed?.code;
            err.details = parsed?.details;
            console.error('uploadToStorageWithServiceRole fallo:', err.message, err.status, err.code);
            throw err;
        }

        const storedPath = parsed?.Key || parsed?.key || path;
        return { path: storedPath };
    } catch (err) {
        console.error('uploadToStorageWithServiceRole exception:', err);
        return null;
    }
}

async function uploadProfileImageIfNeeded(usuarioId, dataUrl, options = {}) {
    const parsed = parseDataUrlImage(dataUrl);
    if (!parsed) return null;
    try {
        const previousPath = options.previousPath || null;
        const ext = parsed.contentType.split('/')[1] || 'png';
        let storedPath = `usuarios/${usuarioId}/perfil_${Date.now()}.${ext}`;

        const { error: upErr } = await supabaseAdmin.storage
            .from(STORAGE_BUCKET)
            .upload(storedPath, parsed.buffer, { contentType: parsed.contentType, upsert: true });

        if (upErr) {
            console.error('uploadProfileImageIfNeeded upload error:', upErr);
            const fallback = await uploadToStorageWithServiceRole(
                STORAGE_BUCKET,
                storedPath,
                parsed.buffer,
                parsed.contentType
            );
            if (!fallback?.path) {
                return null;
            }
            storedPath = fallback.path;
        }

        if (previousPath && previousPath !== storedPath) {
            await deleteStorageAsset(previousPath);
        }

        const signedUrl = await createSignedUrlForPath(storedPath);
        return { path: storedPath, signedUrl };
    } catch (err) {
        console.error('uploadProfileImageIfNeeded exception:', err);
        return null;
    }
}

module.exports = {
    SUPABASE_URL,
    STORAGE_BUCKET,
    SIGNED_URL_TTL_SECONDS,
    isHttpUrl,
    createSignedUrlForPath,
    resolveStorageAsset,
    deleteStorageAsset,
    parseDataUrlImage,
    uploadToStorageWithServiceRole,
    uploadProfileImageIfNeeded,
};
