
import '../styles/PreguntasFrecuentes.css';
import { Link } from "react-router-dom";



export default function PreguntasFrecuentes() {
  return (
    <div>
      <section aria-labelledby="footer-preguntas">
        <h2 id="footer-preguntas-titulo">PREGUNTAS FRECUENTES</h2>

        <div className="footer-preguntas-lista">
          <details className="footer-detalles">
            <summary className="footer-pregunta">
              ¿Qué tipos de servicios ofrecen?
            </summary>
            <p className="footer-respuesta">
              Ofrecemos evaluación diagnóstica, terapia individual por área y
              talleres grupales.
            </p>
          </details>

          <details className="footer-detalles">
            <summary className="footer-pregunta">
              ¿Cómo solicito la primera entrevista?
            </summary>
            <p className="footer-respuesta">
              Podes solicitar a traves de un formulario con datos basicos del
              pacientes y responsable
              <br/>
              <span className="footer-enlace-entrevista">
                <Link to="/formulario-entrevista">EN ESTE ENLACE</Link>
              </span>
              <br/>
              El equipo se pondrá en contacto para coordinar la primera
              entrevista.
            </p>
          </details>

          <details className="footer-detalles">
            <summary className="footer-pregunta">
              ¿Qué servicios ofrecen?
            </summary>
            <p className="footer-respuesta">
              Ofrecemos evaluación diagnóstica, terapia individual, y programas
              personalizados según las necesidades del niño/a.
            </p>
          </details>

          <details className="footer-detalles">
            <summary className="footer-pregunta">
              ¿Aceptan obras sociales?
            </summary>
            <p className="footer-respuesta">
              Sí, trabajamos con varias obras sociales. Consultanos para más
              detalles.
            </p>
          </details>

          <details className="footer-detalles">
            <summary className="footer-pregunta">
              ¿Dónde están ubicados?
            </summary>
            <p className="footer-respuesta">
              Estamos ubicados en Las Piedras 312, en el centro de la ciudad,
              con fácil acceso en transporte público.
            </p>
          </details>
        </div>
      </section>
    </div>
  );
}
