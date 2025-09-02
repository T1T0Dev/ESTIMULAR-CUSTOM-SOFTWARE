import Hero from '../components/Hero';
import SobreEstimular from '../components/SobreEstimular';
import Servicios from '../components/Servicios';
import Ubicacion from '../components/Ubicacion';
import Testimonios from '../components/Testimonios';
import Galeria from '../components/Galeria';
import Footer from '../components/Footer';  
import Navbar from '../components/Navbar';
import BotonWhatsapp from '../components/BotonWhatsapp';

export default function Landing() {
  return (
    <div>
        <Navbar/>
        <Hero />
        <SobreEstimular />
        <Servicios />
        <Testimonios />
        <Ubicacion />
        <Galeria />
        <Footer />
        <BotonWhatsapp/>
    </div>
  );
}
