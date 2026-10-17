import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { BoltIcon } from './icons'

function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])
  return online
}

const LINKS: Array<{ to: string; label: string; end?: boolean }> = [
  { to: '/', label: 'Home', end: true },
  { to: '/create', label: 'Create' },
  { to: '/join', label: 'Join' },
]

export default function Navbar(): ReactElement {
  const online = useOnlineStatus()

  return (
    <header className="qr-nav-wrap">
      <div className="qr-container">
        <nav className="qr-nav" aria-label="Main">
          <Link to="/" className="qr-nav__brand" aria-label="QuizRush home">
            <span className="qr-nav__bolt">
              <BoltIcon size={17} />
            </span>
            <span className="qr-wordmark">
              <span className="qr-wordmark__quiz">Quiz</span>
              <span className="qr-wordmark__rush">Rush</span>
            </span>
          </Link>

          <ul className="qr-nav__links">
            {LINKS.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `qr-nav__link${isActive ? ' is-active' : ''}`
                  }
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <span
            className={`qr-conn${online ? '' : ' is-offline'}`}
            title={online ? 'Online' : 'Offline — rooms stay on this device'}
          >
            <span className="qr-conn__dot" aria-hidden="true" />
            <span className="qr-conn__text">{online ? 'Online' : 'Offline'}</span>
            <span className="sr-only">{online ? 'Connection status: online' : 'Connection status: offline'}</span>
          </span>
        </nav>
      </div>
    </header>
  )
}
