const turnoModel = require('../models/turnoModel');





async function handleGetTurnos(req, res) {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ success: false, message: 'El parámetro \'date\' es requerido.' });
  }

  try {
    const turnos = await turnoModel.getTurnosByDate(date);
    res.json({ success: true, data: turnos });
  } catch (error) {
    console.error('Error al obtener los turnos:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}




async function handleUpdateTurno(req, res) {
  const { id } = req.params;
  const dataToUpdate = req.body;

  if (!id || Object.keys(dataToUpdate).length === 0) {
    return res.status(400).json({ success: false, message: 'Se requiere el ID del turno y datos para actualizar.' });
  }

  try {
    const result = await turnoModel.updateTurno(id, dataToUpdate);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Turno no encontrado.' });
    }
    res.json({ success: true, message: 'Turno actualizado correctamente.' });
  } catch (error) {
    console.error('Error al actualizar el turno:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
  }
}

module.exports = {
  handleGetTurnos,
  handleUpdateTurno,
};
