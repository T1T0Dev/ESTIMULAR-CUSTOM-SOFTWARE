import Hero from '../components/Hero';
import AboutEstimular from '../components/AboutEstimular';
import Services from '../components/Services';
import Ubication from '../components/Ubication';
import Testimonials from '../components/Testimonials';
import Gallery from '../components/Gallery';
import Footer from '../components/Footer';  
import Navbar from '../components/Navbar';
import WhatsappButton from '../components/WhatsappButton';

export default function Landing() {
  return (
    <div>
        <Navbar/>
        <Hero />
        <AboutEstimular />
        <Services />
        <Testimonials />
        <Ubication />
        <Gallery />
        <Footer />
        <WhatsappButton />
    </div>
  );
}
