import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import WorkspaceRouter from './WorkspaceRouter'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceRouter />
  </StrictMode>,
)
