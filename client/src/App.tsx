import { useEffect, type ReactElement } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import Navbar from '../components/Navbar'
import CreateRoom from './pages/CreateRoom'
import Home from './pages/Home'
import JoinRoom from './pages/JoinRoom'
import Lobby from './pages/Lobby'

function ScrollToTop(): null {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return null
}

export default function App(): ReactElement {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <div className="qr-app">
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/join" element={<JoinRoom />} />
          <Route path="/create" element={<CreateRoom />} />
          <Route path="/lobby/:code" element={<Lobby />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
