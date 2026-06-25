import { useEffect, useState } from "react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"
import { Plus, MoveRight, MapPin, Car } from "lucide-react"

// TODO: Delete trip option

function Trips() {
    const [trips, setTrips] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [vehicleId, setVehicleId] = useState("")
    const [startLocation, setStartLocation] = useState("")
    const [endLocation, setEndLocation] = useState("")
    const [distance, setDistance] = useState("")
    const [isAdding, setIsAdding] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Fetch user's garage
    useEffect(() => {
        fetch(`${API_BASE_URL}/vehicles/garage`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return []
        })
        .then(data => {
            setVehicles(data)
        })
    }, [])

    // Fetch user's trips
    useEffect(() => {
        fetch(`${API_BASE_URL}/trips`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return []
        })
        .then(data => {
            setTrips(data)
        })
    }, [])

    // Post user's trip
    function handleSubmit(e) {
        e.preventDefault()

        if (!vehicleId) { toast.error("Please select a vehicle."); return }
        if (!distance) { toast.error("Please enter a distance."); return }

        setIsSubmitting(true)

        fetch(`${API_BASE_URL}/trips`, {
            method: "POST",
            headers: {
                "Content-Type" : "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ vehicle_id: vehicleId, start_location: startLocation, end_location: endLocation, distance: parseFloat(distance) })
        })
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            if (data) {
                toast.success("Trip logged!")
                setStartLocation("")
                setEndLocation("")
                setDistance("")
                setVehicleId("")
                setTrips(prev => [...prev, data])
                setIsAdding(false)
            }
            setIsSubmitting(false)
        })
    }

    const now = new Date()
    const tripsThisMonth = trips.filter(trip => {
        const d = new Date(trip.trip_date || trip.created_at)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-x-hidden">
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-start justify-between shrink-0">
                <div>
                    <p className="text-[28px] font-extrabold text-primary tracking-tight">Trips</p>
                    <p className="text-sm text-muted-foreground mt-1">{tripsThisMonth} trips this month</p>
                </div>
                <button type="button" onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer shadow-sm">
                    <Plus size={16} /> Add
                </button>
            </div>

            {/* Trips Display */}
            {trips.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No trips yet... Add some!</p>
            ) : (
            <div className="flex flex-col gap-3 px-4 pb-6 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                {[...trips].reverse().map(trip => {
                    const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
                    return (
                    <div key={trip.id} className="relative bg-card rounded-2xl shadow-sm p-4">
                        {/* Cost badge */}
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-bold text-white ${trip.trip_cost < 20 ? "bg-green-500" : trip.trip_cost < 40 ? "bg-yellow-500" : "bg-red-500"}`}>
                            ${trip.trip_cost.toFixed(2)}
                        </div>

                        <div className="pr-20 min-w-0">
                            <div className="flex items-center gap-1.5 text-base font-bold text-foreground truncate">
                                <span className="truncate">{trip.start_location || "Unknown"}</span>
                                <MoveRight size={14} className="text-primary shrink-0" />
                                <span className="truncate">{trip.end_location || "Unknown"}</span>
                            </div>
                            <div className="flex items-center gap-1.5 mt-2 text-muted-foreground">
                                <Car size={13} className="shrink-0" />
                                <span className="text-xs font-semibold truncate">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown vehicle"}</span>
                            </div>
                            <p className="text-xs text-muted-foreground/80 mt-2">
                                {trip.distance.toFixed(1)} mi · {trip.co2_kg.toFixed(1)} kg CO2 · {new Date(trip.trip_date || trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                        </div>
                    </div>
                    )
                })}
            </div>
            )}

            {/* Trip Adding Modal - bottom sheet */}
            {isAdding &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <form onSubmit={handleSubmit} className="w-full max-w-xl bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-4">
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto" />
                    <div>
                        <h1 className="text-xl font-extrabold text-foreground">Log a trip</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Enter your trip details</p>
                    </div>

                    {/* Vehicle Dropdown */}
                    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary">
                        <div className="px-3 flex items-center">
                            <Car size={18} className="text-muted-foreground" />
                        </div>
                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                            className="flex-1 px-3 py-3 bg-transparent text-foreground focus:outline-none">
                            <option value="">Select a vehicle</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Location */}
                    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary">
                        <div className="px-3 flex items-center">
                            <MapPin size={18} className="text-muted-foreground" />
                        </div>
                        <input placeholder="Start Location" value={startLocation} type="text" onChange={(e) => setStartLocation(e.target.value)}
                            className="flex-1 px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    {/* End Location */}
                    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary">
                        <div className="px-3 flex items-center">
                            <MapPin size={18} className="text-muted-foreground" />
                        </div>
                        <input placeholder="End Location" value={endLocation} type="text" onChange={(e) => setEndLocation(e.target.value)}
                            className="flex-1 px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    {/* Distance */}
                    <div className="flex items-stretch rounded-xl overflow-hidden bg-secondary">
                        <input placeholder="0.0" value={distance} type="number" step="0.1" onChange={(e) => setDistance(e.target.value)}
                            className="flex-1 px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        <div className="px-3 flex items-center">
                            <span className="text-sm font-medium text-muted-foreground">mi</span>
                        </div>
                    </div>

                    {/* Submit & Close Button */}
                    <div className="flex flex-row gap-3 mt-1">
                        <button type="button" onClick={() => setIsAdding(false)} className="flex-1 h-12 rounded-xl bg-secondary text-muted-foreground font-bold cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? "Logging..." : "Log Trip"}
                        </button>
                    </div>
                </form>
            </div>}
        </div>
    )
}

export default Trips
