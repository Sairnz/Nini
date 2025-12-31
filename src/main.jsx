import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Letter from "./components/Letter";

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Letter />
  </StrictMode>,
)
