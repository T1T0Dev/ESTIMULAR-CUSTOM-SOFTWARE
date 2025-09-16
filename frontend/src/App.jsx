import {BrowserRouter as Router,Routes,Route} from 'react-router-dom';

import Landing from './pages/Landing';
import Entrevista from './pages/Entrevista';
import Turnos from './pages/Turnos';

function App() {

  return (
    <div>
      <Router>
        <Routes>
          {/* Rutas publicas */}
          <Route path="/" element={<Landing />} />
          <Route path="/formulario-entrevista" element={<Entrevista />} />
          <Route path="/turnos" element={<Turnos />} />
        </Routes>
      </Router>
    </div>
   
  )
}

export default App
