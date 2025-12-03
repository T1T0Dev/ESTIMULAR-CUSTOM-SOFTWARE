const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'pps.fdrach.pp.ua') {
    return 'https://ppsb.fdrach.pp.ua';
  }
  // Para desarrollo local - usar la misma IP que el frontend
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3001';
  }
  // Para acceso desde red local (IP), usar la misma IP para el backend
  return `http://${hostname}:3001`;
};

const API_BASE_URL = getApiBaseUrl();

export default API_BASE_URL;
