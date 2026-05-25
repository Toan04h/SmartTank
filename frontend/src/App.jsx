import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import Login from './pages/Login'
import Register from './pages/Register'

function App() {
    return (
        <BrowserRouter>
            {/* Notification Badge */}
            <Toaster position="top-center" richColors duration={4000} />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/*" element={<div>App</div>} />
            </Routes>
        </BrowserRouter>
    )
}

export default App
