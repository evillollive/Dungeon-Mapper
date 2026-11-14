import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './fonts.css'
import './index.css'
import WorkspaceRouter from './WorkspaceRouter'

// Map labels are drawn on canvas, which cannot swap fonts after drawing. Load
// both weights first; the files are bundled and precached, so this is quick.
// Render anyway after a short wait so a font problem never blocks the app.
const fontsReady = typeof document.fonts?.load === 'function'
  ? Promise.race([
      Promise.all(["400 16px 'Nunito Sans'", "600 16px 'Nunito Sans'"].map(font => document.fonts.load(font, '0Aa'))),
      new Promise(resolve => setTimeout(resolve, 1500)),
    ]).catch(() => undefined)
  : Promise.resolve();

void fontsReady.then(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WorkspaceRouter />
  </StrictMode>,
))
