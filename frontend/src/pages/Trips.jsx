import { useEffect, useState } from "react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"
import { Plus, Road, Dot, MoveRight, MapPin, Car } from "lucide-react"

// TODO: Make icons smaller
//       Delete trip option

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

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-primary px-6 pt-8 pb-6 shrink-0">
                <p className="text-3xl font-bold text-primary-foreground">My Trips</p>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer text-primary-foreground text-base font-medium">
                    <Plus size={20} /> Add
                </button>
            </div>

            {/* Trips Display */}
            {trips.length === 0 ? (
                <p className="text-center py-6 text-gray-500">No trips yet... Add some!</p>
            ) : (
            <div className="flex flex-col gap-3 py-4 pb-6 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                {[...trips].reverse().map(trip => {
                    const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
                    return (
                    <div key={trip.id} className="relative bg-card border border-border rounded-xl p-4 mx-4">
                        {/* Cost badge */}
                        <div className={`absolute top-4 right-4 px-3 py-1.5 rounded-lg text-sm font-bold text-white ${trip.trip_cost < 20 ? "bg-green-500" : trip.trip_cost < 40 ? "bg-yellow-500" : "bg-red-500"}`}>
                            ${trip.trip_cost.toFixed(2)}
                        </div>

                        {/* Top row: icon + route + vehicle */}
                        <div className="flex flex-row items-center gap-4">
                            <div className="bg-secondary rounded-xl p-4">
                                <Road size={40} className="text-primary" />
                            </div>
                            <div className="pr-20 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1 text-lg font-bold text-foreground truncate">{trip.start_location || "Unknown"} <MoveRight size={18} className="shrink-0" /> {trip.end_location || "Unknown"}</div>
                                <div className="text-sm text-muted-foreground truncate">{vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Unknown vehicle"}</div>
                            </div>
                        </div>

                        {/* Stats row */}
                        <div className="flex flex-row gap-2 mt-3">
                            <div className="flex items-center text-sm text-muted-foreground">{trip.distance.toFixed(1)} mi <Dot size={16} /> {trip.co2_kg.toFixed(1)} kg CO2 <Dot size={16} /> {new Date(trip.trip_date || trip.created_at).toLocaleDateString()}</div>
                        </div>
                    </div>
                    )
                })}
            </div>
            )}

            {/* Trip Adding Modal */}
            {isAdding &&
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4 py-4 bg-background rounded-lg border border-border w-full max-w-xl">
                    <h1 className="text-2xl font-bold text-foreground">Log a Trip</h1>

                    {/* Vehicle Dropdown */}
                    <div className="flex items-stretch border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                        <div className="px-3 bg-secondary border-r border-border flex items-center">
                            <Car size={18} className="text-muted-foreground" />
                        </div>
                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                            className="flex-1 px-3 py-3 bg-background text-foreground focus:outline-none">
                            <option value="">Select a vehicle</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                            ))}
                        </select>
                    </div>

                    {/* Start Location */}
                    <div className="flex items-stretch border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                        <div className="px-3 bg-secondary border-r border-border flex items-center">
                            <MapPin size={18} className="text-muted-foreground" />
                        </div>
                        <input placeholder="Start Location" value={startLocation} type="text" onChange={(e) => setStartLocation(e.target.value)}
                            className="flex-1 px-3 py-3 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    {/* End Location */}
                    <div className="flex items-stretch border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                        <div className="px-3 bg-secondary border-r border-border flex items-center">
                            <MapPin size={18} className="text-muted-foreground" />
                        </div>
                        <input placeholder="End Location" value={endLocation} type="text" onChange={(e) => setEndLocation(e.target.value)}
                            className="flex-1 px-3 py-3 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    {/* Distance */}
                    <div className="flex items-stretch border border-border rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary">
                        <input placeholder="0.0" value={distance} type="number" step="0.1" onChange={(e) => setDistance(e.target.value)}
                            className="flex-1 px-3 py-3 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        <div className="px-3 bg-secondary border-l border-border flex items-center">
                            <span className="text-sm font-medium text-muted-foreground">mi</span>
                        </div>
                    </div>

                    {/* Submit & Close Button */}
                    <div className="flex flex-row gap-3">
                        <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSubmitting ? "Logging..." : "Log Trip"}
                        </button>
                        <button type="button" onClick={() => setIsAdding(false)} className="flex-1 py-3 rounded-lg border border-border text-foreground cursor-pointer hover:bg-secondary">Cancel</button>
                    </div>
                </form>
            </div>}
        </div>
    )
}

export default Trips
