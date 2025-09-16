const pool = require('../config/db');






async function getTurnosByDate(date) {
  const sql = `
    SELECT 
        t.id, 
        t.inicio, 
        t.fin, 
        t.estado,
        t.notas,
        p.id AS paciente_id, 
        p.nombre AS paciente_nombre, 
        p.apellido AS paciente_apellido,
        p.fecha_nacimiento AS paciente_fecha_nacimiento,
        p.dni AS paciente_dni,
        GROUP_CONCAT(DISTINCT u.id) AS profesional_ids,
        GROUP_CONCAT(DISTINCT u.nombre_mostrar) AS profesional_nombres,
        c.id AS consultorio_id, 
        c.nombre AS consultorio_nombre,
        s.id as servicio_id,
        s.nombre as servicio_nombre
    FROM turnos t
    JOIN pacientes p ON t.paciente_id = p.id
    JOIN consultorios c ON t.consultorio_id = c.id
    JOIN servicios s ON t.servicio_id = s.id
    LEFT JOIN turno_profesionales tp ON t.id = tp.turno_id
    LEFT JOIN usuarios u ON tp.profesional_id = u.id
    WHERE DATE(t.inicio) = ?
    GROUP BY t.id
    ORDER BY t.inicio;
  `;
  const [rows] = await pool.query(sql, [date]);
  return rows;
}







async function updateTurno(turnoId, data) {
  const { inicio, fin, consultorio_id, estado, notas } = data;
  

  const fields = [];
  const values = [];

  if (inicio) {
    fields.push('inicio = ?');
    values.push(inicio);
  }
  if (fin) {
    fields.push('fin = ?');
    values.push(fin);
  }
  if (consultorio_id) {
    fields.push('consultorio_id = ?');
    values.push(consultorio_id);
  }
  if (estado) {
    fields.push('estado = ?');
    values.push(estado);
  }
  if (notas !== undefined) {
    fields.push('notas = ?');
    values.push(notas);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  const sql = `UPDATE turnos SET ${fields.join(', ')} WHERE id = ?`;
  values.push(turnoId);

  const [result] = await pool.query(sql, values);
  return result;
}

module.exports = {
  getTurnosByDate,
  updateTurno,
};
