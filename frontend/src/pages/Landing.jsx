import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import SobreEstimular from '../components/SobreEstimular';
import Servicios from '../components/Servicios';
import Testimonios from '../components/Testimonios';
import Ubicacion from '../components/Ubicacion';
import Galeria from '../components/Galeria';
import ContactoArea from '../components/ContactoArea';
import Footer from '../components/Footer';  
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
        <ContactoArea />
        <Footer />
        <BotonWhatsapp/>
    </div>
  );
}
