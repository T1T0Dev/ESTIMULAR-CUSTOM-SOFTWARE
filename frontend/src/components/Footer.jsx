
import "../styles/Footer.css";

export default function Footer() {

  const añoActual = new Date().getFullYear();

  return (
    <footer id="contact" className="footer">
      <div className="footer-bottom">
        <p>© {añoActual} Estimular. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
