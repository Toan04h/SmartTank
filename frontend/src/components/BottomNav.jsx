import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Route, Car, User } from 'lucide-react'

function BottomNav() {
    const location = useLocation()

    return (
        <nav className="fixed bottom-0 left-0 right-0 border-t border-border bg-card flex justify-around items-center py-3">
            <Link to="/vehicles" className={location.pathname === "/vehicles" ? "text-primary" : "text-muted-foreground"}>
                <div className="flex flex-col items-center gap-1">
                    <Car size={32}/>
                    <p className="text-sm">Car</p>
                </div>
                
            </Link>
            <Link to="/trips" className={location.pathname === "/trips" ? "text-primary" : "text-muted-foreground"}>
                <div className="flex flex-col items-center gap-1">
                    <Route size={28}/>
                    <p className="text-sm">Trips</p>
                </div>
            </Link>
            <Link to="/" className={location.pathname === "/" ? "text-primary" : "text-muted-foreground"}>
                <div className="flex flex-col items-center gap-1">
                    <LayoutDashboard size={28} />
                    <p className="text-sm">Dash</p>
                </div>
            </Link>
            <Link to="/profile" className={location.pathname === "/profile" ? "text-primary" : "text-muted-foreground"}>
                <div className="flex flex-col items-center gap-1">
                    <User size={28}/>
                    <p className="text-sm">User</p>
                </div>
            </Link>
        </nav>
    )
}

export default BottomNav
