import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { LogOut, MoveRight } from "lucide-react"
import { API_BASE_URL } from "../api/config"

function Dashboard() {
    const navigate = useNavigate()
    const email = localStorage.getItem("email")
    const username = email?.split("@")[0]
    const [displayName, setDisplayName] = useState(username)
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
    const [fuelPrices, setFuelPrices] = useState({ gasoline: null, diesel: null, electricity: null })
    const [isFuelPriceLoading, setIsFuelPriceLoading] = useState(true)
    const [isTripsLoading, setIsTripsLoading] = useState(true)
    const [dashboardStats, setDashboardStats] = useState({
        total_trips: 0,
        total_distance: 0.0,
        total_fuel: 0.0,
        total_cost: 0.0,
        total_co2: 0.0,
        recent_trips: [],
        default_vehicle: 0
    })

    // Fetching user dashboard stats
    useEffect(() => {
        fetch(`${API_BASE_URL}/users/dashboard`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            if (data) setDashboardStats(data)
            setIsTripsLoading(false)
        })
    }, [])

    // Fetch user's first name for the greeting
    useEffect(() => {
        fetch(`${API_BASE_URL}/users/profile`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => { if (res.ok) return res.json(); return null })
        .then(data => {
            const firstName = data?.full_name?.split(" ")[0]
            if (firstName) setDisplayName(firstName)
        })
    }, [])

    // Fetch fuel prices
    useEffect(() => {
        fetch(`${API_BASE_URL}/fuel/price`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            if (data) setFuelPrices({ gasoline: data.gasoline.price, diesel: data.diesel.price, electricity: data.electricity.price })
            setIsFuelPriceLoading(false)
        })
    }, [])

    // Clears the user's session and sends them back to login
    function handleLogout() {
        localStorage.removeItem("token")
        localStorage.removeItem("email")
        navigate("/login")
    }

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })

    return (
        <div className="flex flex-col h-full overflow-y-auto [-webkit-overflow-scrolling:touch] bg-background">
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">{today}</p>
                    <p className="text-[28px] font-extrabold text-primary tracking-tight mt-1">Hello, {displayName}</p>
                </div>
                <div className="relative">
                    <button type="button" onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="w-[42px] h-[42px] rounded-full bg-card shadow-sm flex items-center justify-center font-bold text-foreground cursor-pointer">
                        {username?.[0]?.toUpperCase()}
                    </button>
                    {isProfileMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 bg-card border border-border rounded-xl shadow-lg flex flex-col min-w-[140px] z-10 overflow-hidden">
                            <button type="button" onClick={handleLogout}
                                className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-left text-destructive flex items-center gap-2">
                                <LogOut size={14} /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-3 px-4 pb-4">

                {/* Fuel price card */}
                <div className="bg-card rounded-2xl shadow-sm p-4">
                    <p className="text-xs font-medium text-muted-foreground mb-2">National fuel prices</p>
                    {isFuelPriceLoading ? (
                        <div className="flex gap-4">
                            <div className="animate-pulse bg-secondary h-7 w-20 rounded" />
                            <div className="animate-pulse bg-secondary h-7 w-20 rounded" />
                            <div className="animate-pulse bg-secondary h-7 w-20 rounded" />
                        </div>
                    ) : (
                        <div className="flex gap-4">
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gas</p>
                                <p className="text-xl font-extrabold text-foreground">
                                    ${fuelPrices.gasoline?.toFixed(2)}<span className="text-xs text-muted-foreground font-medium">/gal</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Diesel</p>
                                <p className="text-xl font-extrabold text-foreground">
                                    ${fuelPrices.diesel?.toFixed(2)}<span className="text-xs text-muted-foreground font-medium">/gal</span>
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Electric</p>
                                <p className="text-xl font-extrabold text-foreground">
                                    ${fuelPrices.electricity?.toFixed(3)}<span className="text-xs text-muted-foreground font-medium">/kWh</span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stat grid */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-card rounded-2xl shadow-sm p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trips</p>
                        <p className="text-[34px] font-extrabold text-foreground tracking-tight mt-2">
                            {isTripsLoading ? "—" : dashboardStats.total_trips}
                        </p>
                    </div>
                    <div className="bg-card rounded-2xl shadow-sm p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Spent</p>
                        <p className="text-[34px] font-extrabold text-foreground tracking-tight mt-2">
                            {isTripsLoading ? "—" : `$${dashboardStats.total_cost}`}
                        </p>
                    </div>
                    <div className="bg-card rounded-2xl shadow-sm p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">CO2</p>
                        <p className="text-[34px] font-extrabold text-foreground tracking-tight mt-2">
                            {isTripsLoading ? "—" : dashboardStats.total_co2}
                            <span className="text-sm text-muted-foreground font-semibold"> kg</span>
                        </p>
                    </div>
                    <div className="bg-card rounded-2xl shadow-sm p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Miles</p>
                        <p className="text-[34px] font-extrabold text-foreground tracking-tight mt-2">
                            {isTripsLoading ? "—" : dashboardStats.total_distance}
                            <span className="text-sm text-muted-foreground font-semibold"> mi</span>
                        </p>
                    </div>
                </div>

                {/* Recent trips */}
                <div className="flex items-center justify-between mt-2 mb-1 px-1">
                    <p className="text-[17px] font-bold text-foreground">Recent trips</p>
                    <Link to="/trips" className="text-sm font-semibold text-primary">See all</Link>
                </div>
                <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
                    {isTripsLoading ? (
                        <div className="flex flex-col gap-3 p-4">
                            <div className="animate-pulse bg-secondary rounded-lg h-14" />
                            <div className="animate-pulse bg-secondary rounded-lg h-14" />
                            <div className="animate-pulse bg-secondary rounded-lg h-14" />
                        </div>
                    ) : dashboardStats.recent_trips.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-4">No trips logged yet.</p>
                    ) : (
                        [...dashboardStats.recent_trips].reverse().map((trip, i) => (
                            <div key={trip.id}>
                                <div className="flex items-center justify-between px-4 py-3.5">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-[15px] font-bold text-foreground">
                                            <span>{trip.start_location || "Unknown"}</span>
                                            <MoveRight size={13} className="text-primary" />
                                            <span>{trip.end_location || "Unknown"}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {trip.distance ? `${trip.distance.toFixed(1)} mi` : "—"} · {new Date(trip.trip_date || trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </p>
                                    </div>
                                    <span className="text-[17px] font-extrabold text-foreground">${trip.trip_cost.toFixed(2)}</span>
                                </div>
                                {i < dashboardStats.recent_trips.length - 1 && <div className="h-px bg-border mx-4" />}
                            </div>
                        ))
                    )}
                </div>

            </div>
        </div>
    )
}

export default Dashboard
