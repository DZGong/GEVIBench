import { createRoot } from 'react-dom/client'
import '../index.css'
import { ValidatorApp } from './ValidatorApp'

// No StrictMode here: its double-invoked effects would tear down and re-create every
// pdf.js render task on mount, which is pure churn for a local single-user tool.
createRoot(document.getElementById('root')!).render(<ValidatorApp />)
