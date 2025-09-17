import Sidebar from '../components/Sidebar';
import FormularioEntrevista from '../components/FormularioEntrevista';

export default function Entrevista() {
  return (
    <div style={{display:'flex', minHeight:'100vh',width:'100%'}}>
      <Sidebar />
      <FormularioEntrevista />
    </div>
  )
}



