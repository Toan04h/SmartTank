import { useEffect, useState } from "react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"
import { Plus, MoveRight, MapPin, Car, X } from "lucide-react"

function Trips() {
    const [trips, setTrips] = useState([])
    const [vehicles, setVehicles] = useState([])
    const [vehicleId, setVehicleId] = useState("")
    const [startLocation, setStartLocation] = useState("")
    const [endLocation, setEndLocation] = useState("")
    const [distance, setDistance] = useState("")
    const [selectedTrip, setSelectedTrip] = useState(null)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [isAdding, setIsAdding] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

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
            setIsLoading(false)
        })
    }, [])

    // Handles user viewing extra information about the trip
    async function handleTripDetails(tripId) {
        setIsDetailOpen(true)
        setIsDetailLoading(true)
        const [tripRes, imageRes] = await Promise.all([
            fetch(`${API_BASE_URL}/trips/${tripId}`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } }),
            fetch(`${API_BASE_URL}/trips/${tripId}/image`, { headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` } })
        ])
        const [tripData, imageData] = await Promise.all([tripRes.json(), imageRes.json()])
        setSelectedTrip({ ...tripData, image_url: imageData.image_url })
        setIsDetailLoading(false)
    }

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
        <div className="flex flex-col h-full overflow-x-hidden">
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
            {isLoading ? (
                <div className="flex flex-col gap-3 px-4 pb-6">
                    <div className="animate-pulse bg-card rounded-2xl h-[88px]" />
                    <div className="animate-pulse bg-card rounded-2xl h-[88px]" />
                    <div className="animate-pulse bg-card rounded-2xl h-[88px]" />
                </div>
            ) : trips.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No trips yet... Add some!</p>
            ) : (
            <div className="flex flex-col gap-3 px-4 pb-6 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                {[...trips].reverse().map(trip => {
                    const vehicle = vehicles.find(v => v.id === trip.vehicle_id)
                    return (
                    <button key={trip.id} onClick={() => handleTripDetails(trip.id) } className="w-full text-left cursor-pointer">
                        <div className="relative bg-card rounded-2xl shadow-sm p-4">
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
                                    {trip.distance.toFixed(1)} mi · {new Date(trip.trip_date || trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </p>
                            </div>
                        </div>
                    </button>)
                })}
            </div>
            )}

            {/* Trip Detail Bottom Sheet */}
            {isDetailOpen &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={() => setIsDetailOpen(false)}>
                <div className="w-full max-w-xl bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-4" onClick={e => e.stopPropagation()}>
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto" />

                    {isDetailLoading ? (
                        <>
                            <div className="flex items-start justify-between">
                                <div className="animate-pulse bg-secondary h-5 w-16 rounded" />
                                <div className="animate-pulse bg-secondary h-5 w-24 rounded" />
                            </div>
                            <div className="animate-pulse bg-secondary w-full h-36 rounded-xl" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="animate-pulse bg-secondary rounded-xl h-16" />
                                <div className="animate-pulse bg-secondary rounded-xl h-16" />
                                <div className="animate-pulse bg-secondary rounded-xl h-16" />
                                <div className="animate-pulse bg-secondary rounded-xl h-16" />
                            </div>
                            <div className="animate-pulse bg-secondary rounded-xl h-16" />
                        </>
                    ) : (
                        <>
                            {/* Header */}
                            <div className="flex items-start justify-between">
                                <p className="text-base font-bold text-foreground">Route</p>
                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-xs font-semibold text-foreground">
                                            {new Date(selectedTrip.trip_date || selectedTrip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                        </p>
                                        {selectedTrip.start_time && selectedTrip.end_time && (
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                {new Date(selectedTrip.start_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} → {new Date(selectedTrip.end_time).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                                            </p>
                                        )}
                                    </div>
                                    <button type="button" onClick={() => setIsDetailOpen(false)} className="text-muted-foreground hover:text-foreground cursor-pointer">
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>

                            {/* Route image */}
                            {selectedTrip.image_url
                                ? <img src={selectedTrip.image_url} className="w-full rounded-xl" />
                                : <div className="w-full h-36 rounded-xl bg-secondary flex items-center justify-center text-xs text-muted-foreground">No route image</div>
                            }

                            {/* Stats grid */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-secondary rounded-xl p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Cost</p>
                                    <p className="text-lg font-extrabold text-foreground mt-0.5">${selectedTrip.trip_cost?.toFixed(2)}</p>
                                </div>
                                <div className="bg-secondary rounded-xl p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gallons used</p>
                                    <p className="text-lg font-extrabold text-foreground mt-0.5">{selectedTrip.gallons_used?.toFixed(2)} gal</p>
                                </div>
                                <div className="bg-secondary rounded-xl p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
                                    <p className="text-lg font-extrabold text-foreground mt-0.5">{selectedTrip.distance?.toFixed(1)} mi</p>
                                </div>
                                <div className="bg-secondary rounded-xl p-3">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">CO2</p>
                                    <p className="text-lg font-extrabold text-foreground mt-0.5">{selectedTrip.co2_kg?.toFixed(1)} kg</p>
                                </div>
                            </div>
                            <div className="bg-secondary rounded-xl p-3">
                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Fuel price</p>
                                <p className="text-lg font-extrabold text-foreground mt-0.5">${selectedTrip.fuel_price?.toFixed(2)}/gal</p>
                            </div>
                        </>
                    )}
                </div>
            </div>}

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
