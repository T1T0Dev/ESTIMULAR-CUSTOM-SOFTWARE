
import '../styles/EntrevistaLayout.css'
import Sidebar from '../components/Sidebar'

export default function EntrevistaLayout({children}) {
  return (
    <div className="pagina-entrevista">
    <aside>
        <Sidebar/>
    </aside>
    <main>
        {children}
    </main>

      
    </div>
  )
}
