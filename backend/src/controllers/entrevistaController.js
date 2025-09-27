const { supabase } = require('../config/db');

const enviarFormularioEntrevista = async (req, res) => {
    const {
        nombre_nino,
        apellido_nino,
        fecha_nacimiento,
        dni_nino,
        obra_social,
        nombre_responsable,
        apellido_responsable,
        telefono,
        email,
        parentesco,
        motivo_consulta
    } = req.body;

    try {
        // insertar candidato
        const { data: candidato, error: errorCandidato } = await supabase
            .from('candidatos')
            .insert([{
                nombre_nino,
                apellido_nino,
                fecha_nacimiento,
                dni_nino,
                obra_social,
                motivo_consulta
            }])
            .select()
            .single();

        if (errorCandidato) throw errorCandidato;

        // insertar responsable
        const { data: responsable, error: errorResponsable } = await supabase
            .from('responsables')
            .insert([{
                nombre_responsable,
                apellido_responsable,
                telefono,
                email,
            }])
            .select()
            .single();

        if (errorResponsable) throw errorResponsable;

        // insertar relación
        const { data: rel, error: errorRel } = await supabase
            .from('candidato_responsables')
            .insert([{
                candidato_id: candidato.id,
                responsable_id: responsable.id,
                parentesco
            }])
            .select()
            .single();

        if (errorRel) throw errorRel;

        res.status(201).json({
            success: true,
            data: { candidato, responsable, rel }
        });

    } catch (error) {
        console.error('Error al crear candidato:', error);
        res.status(500).json({
            success: false,
            message: 'Error al crear candidato'
        });
    }
};

module.exports = { enviarFormularioEntrevista };