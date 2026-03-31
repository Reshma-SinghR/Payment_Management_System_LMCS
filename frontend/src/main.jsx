import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { AcademicYearProvider } from './context/AcademicYearContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AcademicYearProvider>
      <App />
    </AcademicYearProvider>
  </React.StrictMode>,
)
