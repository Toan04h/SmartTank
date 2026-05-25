import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Route, Car, User } from 'lucide-react'

function BottomNav() {
    const location = useLocation()

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card">
            {/* tabs go here */}
        </nav>
    )
}

export default BottomNav
