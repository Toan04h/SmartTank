import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Route, Car, User, Navigation } from 'lucide-react'
import { useTracking } from '../context/TrackingContext'

// TODO: Fix the Navigation button being off-centered because of how it's designed
//       (maybe plus button instead)

function BottomNav() {

    const location = useLocation()
    const { isTracking } = useTracking()

    if (isTracking) return null

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card flex items-center py-4">
            <Link to="/" className={`flex-1 flex justify-center ${location.pathname === "/" ? "text-primary" : "text-muted-foreground"}`}>
                <LayoutDashboard size={28} />
            </Link>
            <Link to="/trips" className={`flex-1 flex justify-center ${location.pathname === "/trips" ? "text-primary" : "text-muted-foreground"}`}>
                <Route size={28}/>
            </Link>
            {/* TODO: placeholder until live trip page exists */}
            <Link to="/live-trip" className="flex-1 flex justify-center">
                <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary -mt-6 shadow-lg">
                    <Navigation size={22} className="text-primary-foreground" />
                </div>
            </Link>
            <Link to="/vehicles" className={`flex-1 flex justify-center ${location.pathname === "/vehicles" ? "text-primary" : "text-muted-foreground"}`}>
                <Car size={32}/>
            </Link>
            <Link to="/profile" className={`flex-1 flex justify-center ${location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"}`}>
                <User size={28}/>
            </Link>
        </nav>
    )
}

export default BottomNav
