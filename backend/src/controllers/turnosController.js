const { supabaseAdmin } = require('../config/db');
const { sendCancellationEmail } = require('../services/emailService');
const turnoModel = require('../models/turnoModel');
const moment = require('moment');  // Agrega este require
const path = require('path');  // Agrega esto si no está

// Importar funciones auxiliares desde turnoController.js
const { userIsAdmin, userIsRecepcion, fetchPersonaIdForUser } = require('./turnoController');

/**
 * Listar turnos con filtros.
 * Query params soportados:
 * - estado: string (e.g., 'pendiente')
 * - nino_id: number (listará turnos asignados a ese niño)
 * - disponible: 'true' | 'false' (si true => nino_id IS NULL y estado='pendiente')
 * - desde, hasta: ISO date range filter against 'inicio'
 * - limit: número máximo de filas (default 50)
 */
const listTurnos = async (req, res) => {
    try {
        const { date, estado, nino_id, disponible, desde, hasta, limit = 50 } = req.query || {};

        if (date) {
            let enrichedTurnos = await turnoModel.getTurnosByDate(date);

            if (estado) {
                enrichedTurnos = enrichedTurnos.filter((turno) => String(turno.estado) === String(estado));
            }

            if (nino_id) {
                enrichedTurnos = enrichedTurnos.filter((turno) => {
                    const pacienteId = turno?.paciente_id ?? turno?.nino_id ?? null;
                    return pacienteId !== null && String(pacienteId) === String(nino_id);
                });
            }

            if (String(disponible) === 'true') {
                enrichedTurnos = enrichedTurnos.filter((turno) => turno?.paciente_id === null || turno?.paciente_id === undefined);
            }

            if (desde) {
                const fromDate = new Date(desde);
                if (!Number.isNaN(fromDate.getTime())) {
                    enrichedTurnos = enrichedTurnos.filter((turno) => {
                        const inicio = turno?.inicio ? new Date(turno.inicio) : null;
                        return inicio && inicio >= fromDate;
                    });
                }
            }

            if (hasta) {
                const toDate = new Date(hasta);
                if (!Number.isNaN(toDate.getTime())) {
                    enrichedTurnos = enrichedTurnos.filter((turno) => {
                        const inicio = turno?.inicio ? new Date(turno.inicio) : null;
                        return inicio && inicio <= toDate;
                    });
                }
            }

            const limitNumber = Number(limit);
            if (Number.isFinite(limitNumber) && limitNumber > 0) {
                enrichedTurnos = enrichedTurnos.slice(0, limitNumber);
            }

            return res.json({
                success: true,
                data: enrichedTurnos,
                total: enrichedTurnos.length,
            });
        }

        let q = supabaseAdmin
            .from('turnos')
            .select('id, departamento_id, inicio, fin, duracion_min, consultorio_id, estado, nino_id', { count: 'exact' })
            .order('inicio', { ascending: true })
            .limit(Number(limit) || 50);

        if (estado) q = q.eq('estado', estado);
        if (nino_id) q = q.eq('nino_id', Number(nino_id));

        if (String(disponible) === 'true') {
            q = q.is('nino_id', null);
            // si no se pasó estado explícito, por defecto pendientes
            if (!estado) q = q.eq('estado', 'pendiente');
        }

        if (desde) q = q.gte('inicio', new Date(desde).toISOString());
        if (hasta) q = q.lte('inicio', new Date(hasta).toISOString());

        const { data, error, count } = await q;
        if (error) throw error;
        return res.json({ success: true, data: data || [], total: count || 0 });
    } catch (err) {
        console.error('listTurnos error', err);
        return res.status(500).json({ success: false, message: 'Error al listar turnos', error: err.message });
    }
};

/**
 * Actualizar un turno (asignar/quitar niño, cambiar estado, etc.)
 * Params: id (turno id)
 * Body permitido: { nino_id: number|null, estado?: string }
 */
const updateTurno = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ success: false, message: 'Falta id del turno' });
        const { nino_id, estado } = req.body || {};
        const payload = {};
        if (nino_id !== undefined) payload.nino_id = nino_id === null ? null : Number(nino_id);
        if (estado !== undefined) payload.estado = estado;
        if (Object.keys(payload).length === 0) {
            return res.status(400).json({ success: false, message: 'No hay campos para actualizar' });
        }

        const { data, error } = await supabaseAdmin
            .from('turnos')
            .update(payload)
            .eq('id', Number(id))
            .select('id, departamento_id, inicio, fin, duracion_min, consultorio_id, estado, nino_id')
            .maybeSingle();
        if (error) throw error;
        return res.json({ success: true, data });
    } catch (err) {
        console.error('updateTurno error', err);
        return res.status(500).json({ success: false, message: 'Error al actualizar turno', error: err.message });
    }
};

/**
 * (Opcional) Asignar turnos automáticos a un candidato según requerimientos.
 * Mantenemos esta función pero no es necesaria para el flujo básico de asignación manual.
 */
const assignTurnosForCandidato = async (req, res) => {
    try {
        const { candidato_id, fecha_inicio, duracion_min = 30 } = req.body || {};
        if (!candidato_id) return res.status(400).json({ success: false, message: 'Falta candidato_id' });

        // Placeholder sencillo: crear un único turno pendiente vinculado al candidato
        const inicio = fecha_inicio ? new Date(fecha_inicio) : new Date(Date.now() + 10 * 60 * 1000);
        const fin = new Date(inicio.getTime() + (duracion_min || 30) * 60 * 1000);

        const { data, error } = await supabaseAdmin
            .from('turnos')
            .insert([{ inicio: inicio.toISOString(), fin: fin.toISOString(), duracion_min: duracion_min, estado: 'pendiente', nino_id: Number(candidato_id) }])
            .select('id, departamento_id, inicio, fin, duracion_min, consultorio_id, estado, nino_id')
            .maybeSingle();
        if (error) throw error;
        return res.status(201).json({ success: true, data });
    } catch (err) {
        console.error('assignTurnosForCandidato error', err);
        return res.status(500).json({ success: false, message: 'Error asignando turnos', error: err.message });
    }
};

const cancelarTurno = async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;
    const loggedInUserId = req.user?.id;  // Obtener del token JWT en lugar del header
    const adminHeaderOverride = String(req.headers['x-admin-override'] || '')
      .trim()
      .toLowerCase() === 'true';

    if (!id || !subject || !body) return res.status(400).json({ success: false, message: 'Faltan datos' });
    if (!loggedInUserId || Number.isNaN(Number(loggedInUserId))) {
      return res.status(401).json({ success: false, message: 'No autorizado: Falta el ID de usuario.' });
    }

    // Verificar permisos
    const adminOverride = adminHeaderOverride || await userIsAdmin(loggedInUserId);
    const recepcionOverride = await userIsRecepcion(loggedInUserId);

    // Obtener detalles del turno para verificar asignación
    const { data: turnoCompleto, error: turnoError } = await supabaseAdmin
      .from('turnos')
      .select(`
        id, nino_id, inicio, fin,
        profesionales:turno_profesionales(profesional_id)
      `)
      .eq('id', Number(id))
      .single();

    if (turnoError || !turnoCompleto) {
      return res.status(400).json({ success: false, message: 'Error obteniendo detalles del turno: ' + turnoError?.message });
    }

    // Verificar si el usuario puede cancelar este turno
    const profesionalIds = turnoCompleto.profesionales?.map(p => String(p.profesional_id)) || [];
    const isAssignedProfesional = profesionalIds.includes(String(loggedInUserId));

    if (!adminOverride && !isAssignedProfesional) {
      return res.status(403).json({ success: false, message: 'No tiene permisos para cancelar este turno.' });
    }

    // Actualizar turno a 'cancelado'
    const { data, error } = await supabaseAdmin
      .from('turnos')
      .update({ estado: 'cancelado' })
      .eq('id', Number(id))
      .select('id, nino_id')
      .single();
    if (error) throw error;

    // Obtener email y nombre del responsable a través de la tabla intermedia
    const { data: relacion, error: relError } = await supabaseAdmin
      .from('nino_responsables')
      .select('id_responsable')
      .eq('id_nino', data.nino_id)
      .eq('es_principal', true);
    if (relError) return res.status(400).json({ success: false, message: 'Error obteniendo relación nino-responsable: ' + relError.message });
    if (!relacion || relacion.length === 0) return res.status(400).json({ success: false, message: 'No se encontró responsable principal para el niño' });

    const responsableId = relacion[0].id_responsable;

    const { data: responsable, error: respError } = await supabaseAdmin
      .from('responsables')
      .select('email, nombre, apellido')  // Agrega nombre y apellido
      .eq('id_responsable', responsableId)
      .single();
    if (respError || !responsable?.email) return res.status(400).json({ success: false, message: 'Error obteniendo email del responsable: ' + respError?.message });

    // Construir el HTML del email con estilos rosados, logo y diseño detallado
    const htmlBody = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cancelación de Turno - Estimular</title>
      </head>
      <body style="margin: 20px; padding: 0; font-family: 'Arial', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background: #f093c2ec; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <!-- Header con gradiente y logo -->
          <div style="background: linear-gradient(45deg, #ff1493, #ff69b4); padding: 30px 20px; text-align: center; color: #fff;">
            <img src="cid:logo" alt="Logo Estimular" style="width: 80px; height: 80px; border-radius: 50%; background: #fff; padding: 5px; margin-bottom: 15px;" />
            <h1 style="margin: 0; font-size: 32px; font-weight: bold;">Estimular</h1>
            <p style="margin: 5px 0; font-size: 18px;">Centro de Terapia y Desarrollo</p>
          </div>
          
          <!-- Contenido principal -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #ff1493; text-align: center; font-size: 24px; margin-bottom: 20px;">Notificación de Cancelación de Turno</h2>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #ff1493;">  <!-- Agrega border rosado -->
              <h3 style="color: #333; margin-top: 0;">Detalles del Turno Cancelado</h3>
              <p style="margin: 5px 0;"><strong>Fecha del Turno:</strong> ${moment(turnoCompleto.inicio).format('DD/MM/YYYY')}</p>
              <p style="margin: 5px 0;"><strong>Hora del Turno:</strong> ${moment(turnoCompleto.inicio).format('HH:mm')}</p>
              <p style="margin: 5px 0;"><strong>Responsable:</strong> ${responsable.nombre} ${responsable.apellido}</p>
            </div>
            
            <div style="background: rgba(255, 255, 255, 0.9); padding: 20px; border-radius: 10px; margin-bottom: 20px; border: 2px solid #ff1493;">  <!-- Quita background gradiente, agrega border -->
              <h3 style="color: #ff1493; margin-top: 0;">Motivo de la Cancelación</h3>
              <p style="margin: 0; line-height: 1.6; color: #333;">${body}</p>
            </div>
            
            <p style="text-align: center; font-size: 16px; color: #666; margin-bottom: 20px;">
              Lamentamos cualquier inconveniente causado. Si necesita reprogramar el turno o tiene preguntas, no dude en contactarnos.
            </p>
            
            <div style="text-align: center;">
              <a href="mailto:contacto@estimular.com" style="background: linear-gradient(45deg, #ff1493, #ff69b4); color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 25px; font-weight: bold; display: inline-block;">Contactar a Estimular</a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: linear-gradient(45deg, #ffb6c1, #ffc0cb); padding: 20px; text-align: center; color: #fff;">
            <p style="margin: 0; font-size: 14px;">© 2025 Estimular. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: responsable.email,
      subject: subject,
      html: htmlBody,
      attachments: [
        {
          filename: 'esitmular_logo.png',
          path: path.join(__dirname, '../../../docs/esitmular_logo.png'),  // Verifica que la ruta sea correcta
          cid: 'logo'
        }
      ]
    };

    try {
      await sendCancellationEmail(mailOptions);  // Pasa mailOptions completo
      console.log('Email de cancelación enviado exitosamente');
    } catch (emailError) {
      console.error('Error enviando email de cancelación:', emailError.message);
      // No fallar la operación si el email no se puede enviar
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error en cancelarTurno:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

module.exports = { listTurnos, updateTurno, cancelarTurno, assignTurnosForCandidato };
