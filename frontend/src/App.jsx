import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import ProtectedRoute from './components/ProtectedRoute'
import AppLayout from './layouts/AppLayout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Trips from './pages/Trips'
import Vehicles from './pages/Vehicles'
import Profile from './pages/Profile'
import LiveTrip from './pages/LiveTrip'

function App() {
    return (
        <BrowserRouter>
            <Toaster position="top-center" richColors duration={4000} />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route element={<ProtectedRoute />}>
                    <Route element={<AppLayout />}>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/trips" element={<Trips />} />
                        <Route path="/vehicles" element={<Vehicles />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/live-trip" element={<LiveTrip />} />
                    </Route>
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default App
