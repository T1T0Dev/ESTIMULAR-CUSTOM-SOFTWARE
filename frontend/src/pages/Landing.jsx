import Hero from '../components/Hero';
import AboutEstimular from '../components/SobreEstimular';
import Servicios from '../components/Servicios';
import Ubication from '../components/Ubicacion';
import Testimonials from '../components/Testimonios';
import Gallery from '../components/Galeria';
import Footer from '../components/Footer';  
import Navbar from '../components/Navbar';
import WhatsappButton from '../components/BotonWhatsapp';

export default function Landing() {
  return (
    <div>
        <Navbar/>
        <Hero />
        <AboutEstimular />
        <Servicios />
        <Testimonials />
        <Ubication />
        <Gallery />
        <Footer />
        <WhatsappButton />
    </div>
  );
}
