import { useState, useEffect } from "react"
import { Fuel } from "lucide-react"

function Dashboard() {
    const email = localStorage.getItem("email")
    const username = email?.split("@")[0]
    const [fuelPrice, setFuelPrice] = useState(0.0)
    const [trips, setTrips] = useState([])
    const [isFuelPriceLoading, setIsFuelPriceLoading] = useState(true)
    const [isTripsLoading, setIsTripsLoading] = useState(true)

    // Fetching the fuel price
    useEffect(() => {
        fetch(`http://localhost:8000/fuel/price`)
        .then(res => res.json())
        .then(data => {
            setFuelPrice(data.price_per_gallon)
            setIsFuelPriceLoading(false)
        })
    }, [])

    // Fetching user trips
    useEffect(() => {
        fetch(`http://localhost:8000/trips`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return []
        })
        .then(data => {
            setTrips(data)
            setIsTripsLoading(false)
        })
    }, [])

    // User Trip Data
    const totalSpent = trips.reduce((sum, t) => sum + t.trip_cost, 0)
    const totalMiles = trips.reduce((sum, t) => sum + (t.distance || 0), 0)
    const totalCO2 = trips.reduce((sum, t) => sum + t.co2_kg, 0)

    return (
        <div className="flex flex-col min-h-screen bg-background">
            {/* Intro Header */}
            <div className="bg-primary px-6 pt-8 pb-6">
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
                                <p className="text-3xl font-bold text-foreground">${totalSpent.toFixed(2)}</p>
                                <p className="text-sm text-muted-foreground mt-1">Spent</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{trips.length}</p>
                                <p className="text-sm text-muted-foreground mt-1">Trips</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{totalCO2.toFixed(1)}</p>
                                <p className="text-sm text-muted-foreground mt-1">CO2 (kg)</p>
                            </div>
                            <div className="bg-secondary rounded-lg p-3">
                                <p className="text-3xl font-bold text-foreground">{totalMiles.toFixed(1)}</p>
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
                    ) : trips.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No trips logged yet.</p>
                    ) : (
                        <div className="flex flex-col gap-3">
                            {trips.slice(-3).reverse().map(trip => (
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
