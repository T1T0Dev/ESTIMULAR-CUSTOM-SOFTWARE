

import '../styles/ContactoArea.css';

import InformacionContacto from './InformacionContacto'
import PreguntasFrecuentes from "./PreguntasFrecuentes";
import FormularioConsulta from "./FormularioConsulta";



export default function ContactoArea() {
  return (
    <div className="area-content">
      <div className="area-left">
        <InformacionContacto />
        <PreguntasFrecuentes />
      </div>
      <div className="area-right">
        <FormularioConsulta />
      </div>
    </div>
  );
}
