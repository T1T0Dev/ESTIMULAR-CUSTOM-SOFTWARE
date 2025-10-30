const ninoModel = require('../models/ninoModel');

async function handleSearchNinos(req, res) {
  const { search = '', limit } = req.query;
  try {
    const resultados = await ninoModel.searchNinos(search, limit);
    res.json({ success: true, data: resultados });
  } catch (error) {
    console.error('Error al buscar niños:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudieron obtener los niños.' });
  }
}

async function handleGetNino(req, res) {
  const { id } = req.params;
  if (!id) {
    return res
      .status(400)
      .json({ success: false, message: 'El parámetro id es requerido.' });
  }

  try {
    const nino = await ninoModel.getNinoById(id);
    if (!nino) {
      return res
        .status(404)
        .json({ success: false, message: 'Niño no encontrado.' });
    }
    res.json({ success: true, data: nino });
  } catch (error) {
    console.error('Error al obtener niño:', error);
    res
      .status(500)
      .json({ success: false, message: 'No se pudo obtener el niño.' });
  }
}

module.exports = {
  handleSearchNinos,
  handleGetNino,
};
