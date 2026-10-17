import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/nav.css'
import './styles/controls.css'
import './styles/cards.css'
import './styles/pages.css'
import './styles/decor.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('QuizRush root element was not found.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
