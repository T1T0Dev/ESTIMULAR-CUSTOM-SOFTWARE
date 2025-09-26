


import {useState,useEffect} from 'react';
import '../styles/CandidatosEntrevista.css';
import axios from 'axios';

export default function CandidatosEntrevista() {

    const [candidatos, setCandidatos] = useState([]);


    useEffect(() => {
        const fetchCandidatos = async () => {
            try {
                const response = await axios.get('http://localhost:4000/api/candidatos');
                setCandidatos(response.data);
            } catch (error) {
                console.error('Error al obtener los candidatos:', error);
            }
        }
        fetchCandidatos();
    },[]);


  return (
    <div>
        <h2>Candidatos para Entrevista</h2>
        <ul>
            {candidatos.map(candidato => (
                <li key={candidato.id}>{candidato.nombre}</li>
            ))}
        </ul>
    </div>
  )
}

    </div>
  )
}
