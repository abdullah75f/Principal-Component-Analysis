import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx' // Make sure it imports App from './App.tsx'
import './index.css' // Or your main CSS file

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App /> {/* Make sure it renders the <App /> component */}
  </React.StrictMode>,
)