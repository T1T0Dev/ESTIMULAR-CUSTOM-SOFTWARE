const supabase = require('../config/db');

const enviarFormularioEntrevista = async (req, res) => {
  
  const body = req.body || {};

  const candidatoBody = body.candidato || {
    nombre_nino: body.nombre_nino,
    apellido_nino: body.apellido_nino,
    fecha_nacimiento: body.fecha_nacimiento,
    dni_nino: body.dni_nino,
    certificado_discapacidad: body.certificado_discapacidad,
    id_obra_social: body.id_obra_social,
    obra_social_texto: body.obra_social_texto || body.obra_social, // texto libre si vino en plano
    motivo_consulta: body.motivo_consulta,
  };

  const responsableBody = body.responsable || {
    nombre_responsable: body.nombre_responsable,
    apellido_responsable: body.apellido_responsable,
    telefono: body.telefono,
    email: body.email,
    parentesco: body.parentesco,
    es_principal: body.es_principal === undefined ? true : body.es_principal,
  };

  let createdObraId = null;
  let insertedCandidato = null;
  let insertedResponsable = null;

  try {
    // 1) Si no viene id_obra_social y hay texto libre, crear obra_social como 'pendiente'
    let idObra = candidatoBody.id_obra_social ?? null;
    if (!idObra && candidatoBody.obra_social_texto && candidatoBody.obra_social_texto.trim().length > 0) {
      const nombre = candidatoBody.obra_social_texto.trim();
      const { data: obraData, error: obraErr } = await supabase
        .from('obras_sociales')
        .insert([{ nombre_obra_social: nombre, estado: 'pendiente' }])
        .select()
        .single();

      if (obraErr) throw obraErr;
      idObra = obraData.id_obra_social;
      createdObraId = idObra;
    }

    // 2) Insertar candidato (usar columnas con nombres explícitos)
    const candidatoInsert = {
      nombre_nino: candidatoBody.nombre_nino,
      apellido_nino: candidatoBody.apellido_nino,
      fecha_nacimiento: candidatoBody.fecha_nacimiento,
      dni_nino: candidatoBody.dni_nino,
      certificado_discapacidad: candidatoBody.certificado_discapacidad ?? false,
      id_obra_social: idObra || null,
      motivo_consulta: candidatoBody.motivo_consulta,
    };

    const { data: candidato, error: errorCandidato } = await supabase
      .from('candidatos')
      .insert([candidatoInsert])
      .select()
      .single();

    if (errorCandidato) {
      // si hubo creación de obra en este flujo, intentar borrarla (cleanup)
      if (createdObraId) {
        await supabase.from('obras_sociales').delete().eq('id_obra_social', createdObraId);
      }
      throw errorCandidato;
    }
    insertedCandidato = candidato; // guardamos para posible rollback

    // 3) Insertar responsable
    const responsableInsert = {
      nombre: responsableBody.nombre_responsable,
      apellido: responsableBody.apellido_responsable,
      telefono: responsableBody.telefono || null,
      email: responsableBody.email || null,
      creado_en: new Date().toISOString(),
    };

    const { data: responsable, error: errorResponsable } = await supabase
      .from('responsables')
      .insert([responsableInsert])
      .select()
      .single();

    if (errorResponsable) {
      // rollback candidato + obra si aplica
      if (insertedCandidato) {
        await supabase.from('candidatos').delete().eq('id_candidato', insertedCandidato.id_candidato);
      }
      if (createdObraId) {
        await supabase.from('obras_sociales').delete().eq('id_obra_social', createdObraId);
      }
      throw errorResponsable;
    }
    insertedResponsable = responsable;

    // 4) Insertar relación N:M en candidato_responsables usando ids explícitos
    const relacionInsert = {
      id_candidato: insertedCandidato.id_candidato,
      id_responsable: insertedResponsable.id_responsable,
      parentesco: responsableBody.parentesco || null,
      es_principal: responsableBody.es_principal ?? true,
    };

    const { data: relacionData, error: errorRelacion } = await supabase
      .from('candidato_responsables')
      .insert([relacionInsert])
      .select()
      .single();

    if (errorRelacion) {
      // rollback responsable, candidato, obra si aplica
      if (insertedResponsable) {
        await supabase.from('responsables').delete().eq('id_responsable', insertedResponsable.id_responsable);
      }
      if (insertedCandidato) {
        await supabase.from('candidatos').delete().eq('id_candidato', insertedCandidato.id_candidato);
      }
      if (createdObraId) {
        await supabase.from('obras_sociales').delete().eq('id_obra_social', createdObraId);
      }
      throw errorRelacion;
    }

    // éxito
    return res.status(201).json({
      success: true,
      data: {
        candidato: insertedCandidato,
        responsable: insertedResponsable,
        relacion: relacionData,
      }
    });

  } catch (error) {
    console.error('Error en enviarFormularioEntrevista:', error);

    // mapear errores comunes a códigos HTTP más útiles
    const msg = error?.message || error?.msg || JSON.stringify(error);
    let status = 500;

    // detectar unique constraint / duplicate
    const lower = String(msg).toLowerCase();
    if (lower.includes('duplicate') || lower.includes('unique') || lower.includes('already exists') || error?.code === '23505') {
      status = 409;
    }

    return res.status(status).json({
      success: false,
      message: 'Error al crear candidato',
      error: msg
    });
  }
};

module.exports = { enviarFormularioEntrevista };
