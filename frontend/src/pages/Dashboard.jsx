import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Fuel, LogOut } from "lucide-react"
import { API_BASE_URL } from "../api/config"

function Dashboard() {
    const navigate = useNavigate()
    const email = localStorage.getItem("email")
    const username = email?.split("@")[0]
    const [fuelPrice, setFuelPrice] = useState(0.0)
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

    // Fetch fuel prices
    useEffect(() => {
        fetch(`${API_BASE_URL}/fuel/price`)
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            if (data) setFuelPrice(data.price_per_gallon)
            setIsFuelPriceLoading(false)
        })
    }, [])

    // Clears the user's session and sends them back to login
    function handleLogout() {
        localStorage.removeItem("token")
        localStorage.removeItem("email")
        navigate("/login")
    }

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Intro Header */}
            <div className="relative bg-primary px-6 pt-8 pb-6">
                <button type="button" onClick={handleLogout} className="absolute top-1/2 -translate-y-1/2 right-6 flex items-center gap-1 px-4 py-2 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer text-primary-foreground text-sm font-medium">
                    <LogOut size={16} /> Logout
                </button>
                <p className="text-3xl font-bold text-primary-foreground">Welcome, {username}!</p>
                <p className="text-base text-primary-foreground/70 mt-1">Here's your summary</p>
            </div>

            {/* Cards */}
            <div className="flex flex-col gap-4 px-4 py-4">

                {/* Fuel Price Card */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Fuel size={18} className="text-primary" />
                        <p className="text-sm font-medium text-muted-foreground">National Fuel Price</p>
                    </div>
                    {isFuelPriceLoading ? <div className="animate-pulse bg-secondary h-8 rounded" /> : <p className="text-3xl font-bold text-foreground">${fuelPrice.toFixed(2)}</p> }
                    <p className="text-sm text-muted-foreground mt-1">per gallon · national average</p>
                </div>

                {/* Monthly Tracking */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                    <p className="text-sm font-semibold text-primary mb-3">This Month</p>
                    {isTripsLoading ? (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">${dashboardStats.total_cost}</p>
                                <p className="text-sm text-muted-foreground mt-1">Spent</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{dashboardStats.total_trips}</p>
                                <p className="text-sm text-muted-foreground mt-1">Trips</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{dashboardStats.total_co2}</p>
                                <p className="text-sm text-muted-foreground mt-1">CO2 (kg)</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{dashboardStats.total_distance}</p>
                                <p className="text-sm text-muted-foreground mt-1">Miles</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Recent Trips */}
                <div className="bg-card rounded-xl shadow-sm border border-border p-4">
                    <p className="text-sm font-semibold text-primary mb-3">Recent Trips</p>
                    {isTripsLoading ? (
                        <div className="flex flex-col gap-3">
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                            <div className="animate-pulse bg-secondary rounded-lg h-16" />
                        </div>
                    ) : dashboardStats.recent_trips.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No trips logged yet.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {dashboardStats.recent_trips.reverse().map(trip => (
                                <div key={trip.id} className="bg-secondary rounded-lg p-3">
                                    <div className="flex justify-between items-start">
                                        <p className="text-base font-medium text-foreground">
                                            {trip.start_location || "Unknown"} → {trip.end_location || "Unknown"}
                                        </p>
                                        <p className={`text-base font-bold ${trip.trip_cost < 20 ? "text-green-500" : trip.trip_cost < 40 ? "text-yellow-500" : "text-red-500"}`}>
                                            ${trip.trip_cost.toFixed(2)}
                                        </p>
                                    </div>
                                    <div className="flex justify-between mt-1">
                                        <p className="text-sm text-muted-foreground">
                                            {trip.distance ? `${trip.distance.toFixed(1)} mi` : "—"}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {trip.co2_kg.toFixed(1)} kg CO2
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {new Date(trip.trip_date || trip.created_at).toLocaleDateString()}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    )
}

export default Dashboard
