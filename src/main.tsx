import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { cloudinaryUrl } from './utils/cloudinary'

// Set CSS background-image variables to Cloudinary URLs at boot so static CSS stays portable.
const root = document.documentElement
root.style.setProperty(
  '--bg-crater-lake',
  `url("${cloudinaryUrl('wed/home/hero_crater_lake', { w: 1600, c: 'limit' })}")`,
)
root.style.setProperty(
  '--bg-vine',
  `url("${cloudinaryUrl('wed/site/vine', { w: 200, c: 'limit' })}")`,
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
