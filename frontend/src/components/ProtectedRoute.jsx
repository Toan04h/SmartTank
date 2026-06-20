import { Navigate, Outlet } from 'react-router-dom'

function isTokenExpired(token) {
    try {
        const base64Url = token.split('.')[1]
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
        const payload = JSON.parse(atob(base64))
        return payload.exp * 1000 < Date.now()
    } catch {
        return true
    }
}

function ProtectedRoute() {
    const token = localStorage.getItem('token')

    if (!token || isTokenExpired(token)) {
        return <Navigate to="/login" />
    }

    return <Outlet />
}

export default ProtectedRoute
