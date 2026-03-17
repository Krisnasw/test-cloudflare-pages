import { createRoot } from 'react-dom/client'
import { RouterProvider } from '@tanstack/react-router'
import { router } from './routes'
import './App.css'

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
