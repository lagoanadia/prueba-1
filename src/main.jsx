import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { applyLang } from './i18n/index.js'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

// Idioma: en inglés se traduce la interfaz al vuelo (ver src/i18n)
applyLang()
