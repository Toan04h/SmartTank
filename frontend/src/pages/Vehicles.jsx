import { useEffect, useState } from "react"
import { Plus, CarFront, Ellipsis, Star } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"

// TODO: Change from user input to selection for year, make, model
//       BLOCKED: no API endpoint returns distinct years/makes/models from the catalog
//       to populate select options (search_vehicle_from_db only takes known values)

//       Add car type detection to change the lucide icon based on if car is a Sedan, Truck, SUV.
//       BLOCKED: vehicle_class exists on VehicleCatalog but get_user_vehicles never joins to
//       it, so /vehicles/garage doesn't return it - needs backend change

//       Make icons smaller to fit display better for mobile view (Done)
//       Add set default car (Done)

//       Add Edit modal (nickname, mpg override)
//       BLOCKED: no PATCH /vehicles/{vehicle_id} endpoint exists - only
//       PATCH /vehicles/{vehicle_id}/default is available

function Vehicles() {
    const [vehicles, setVehicles] = useState([])
    const [isAddingVehicle, setIsAddingVehicle] = useState(false)
    const [isEditting, setIsEditting] = useState(false)
    const [make, setMake] = useState("")
    const [model, setModel] = useState("")
    const [year, setYear] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [isOpen, setIsOpen] = useState(null)
    const [isSearching, setIsSearching] = useState(false)

    // Fetch users garage
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

    // Fetch user's car search
    const carSearching = () => {
        setIsSearching(true)
        fetch(`${API_BASE_URL}/vehicles/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year, make, model })
        })
        .then(res => {
            if (res.ok) return res.json()
            return []
        })
        .then(data => {
            if (data.length === 0) toast.error("Could not find any results.")
            setSearchResults(data)
            setIsSearching(false)
        })
    }

    // Add user's car
    function handleCarSelect(car) {
        fetch(`${API_BASE_URL}/vehicles`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ catalog_id: car.id, is_default: false })
        })
        .then(res => res.json())
        .then(newVehicle => {
            setVehicles(prev => [...prev, newVehicle])
            toast.success("Car added!")
            setIsAddingVehicle(false)
        })
    }

    // Delete user's car
    function handleDelete(carId) {
        fetch(`${API_BASE_URL}/vehicles/${carId}`, {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
        })
        .then(res => {
            if (res.ok) {
                setIsOpen(null)
                toast.success("Successfully removed the car.")
                setVehicles(prev => prev.filter(car => car.id !== carId))
            } else {
                return null
            }
        })
    }

    // Handles setting user's default car
    function handleDefaultCar(vehicle_id) {
        fetch(`${API_BASE_URL}/vehicles/${vehicle_id}/default`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
        })
        .then(res => {
            if (res.ok) {
                setIsOpen(null)
                toast.success("Successfully updated the default car.")
                setVehicles(prev => prev.map(car => {
                    if (car.id === vehicle_id)
                        return {...car, is_default: true}
                    else
                        return {...car, is_default: false}
                    }
                ))
            } else {
                toast.error("Could not make car the default car.")
                return null
            }
        })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-x-hidden">
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-start justify-between shrink-0">
                <div>
                    <p className="text-[28px] font-extrabold text-primary tracking-tight">Garage</p>
                    <p className="text-sm text-muted-foreground mt-1">{vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</p>
                </div>
                <button type="button" onClick={() => setIsAddingVehicle(true)}
                    className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer shadow-sm">
                    <Plus size={16} /> Add
                </button>
            </div>

            {/* Vehicles Display */}
            {vehicles.length === 0 ? (
                <p className="text-center py-6 text-muted-foreground">No vehicles yet... Add some!</p>
            ) : (
                <div className="flex flex-col gap-3 px-4 pb-6 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                    {[...vehicles].sort((a, b) => b.is_default - a.is_default).map(car => {
                        const mpg = car.mpg_override ?? car.combined_mpg ?? 0
                        return (
                        <div key={car.id} className={`relative bg-card rounded-2xl shadow-sm p-4 ${car.is_default ? "border-[1.5px] border-primary" : ""}`}>
                            <div className="flex flex-row items-start justify-between">
                                <div className="flex flex-row items-center gap-3">
                                    <div className={`rounded-xl p-3 ${car.is_default ? "bg-primary/10" : "bg-secondary"}`}>
                                        <CarFront size={24} className={car.is_default ? "text-primary" : "text-muted-foreground"} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-1.5">
                                            <p className="text-[17px] font-bold text-foreground">{car.year} {car.make} {car.model}</p>
                                            {car.is_default && <Star size={15} className="text-primary" fill="currentColor" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">{car.year} · {mpg} mpg</p>
                                    </div>
                                </div>

                                {/* Dropdown menu */}
                                <div className="relative">
                                    <button type="button" onClick={() => setIsOpen(isOpen === car.id ? null : car.id)} className="cursor-pointer p-1 rounded-lg hover:bg-secondary">
                                        <Ellipsis size={22} className="text-muted-foreground" />
                                    </button>
                                    {(isOpen === car.id) && (
                                        <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-xl shadow-lg flex flex-col min-w-[140px] z-10 overflow-hidden">
                                            <button type="button" onClick={() => handleDefaultCar(car.id)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-left text-foreground">Set Default</button>
                                            {/* TODO: Add Edit button functionality (i.e. nickname, mpg, co2) - kept as placeholder until PATCH endpoint exists */}
                                            <button type="button" className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-left text-foreground">Edit</button>
                                            <button type="button" onClick={() => handleDelete(car.id)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-left text-destructive">Delete</button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {car.is_default && (
                                <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-md bg-primary/10">
                                    <span className="text-[11px] font-bold text-primary uppercase tracking-wide">Default</span>
                                </div>
                            )}
                        </div>
                        )
                    })}
                </div>
            )}

            {/* Vehicle Adding Modal - bottom sheet */}
            {isAddingVehicle &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <div className="w-full max-w-xl max-h-[85vh] bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-4 overflow-hidden">
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto" />
                    <div>
                        <h1 className="text-xl font-extrabold text-foreground">Add a car</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Search by year, make &amp; model</p>
                    </div>

                    <div className="flex gap-3">
                        <div className="w-24">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Year</p>
                            <input placeholder="2023" value={year} type="text" onChange={(e) => setYear(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Make</p>
                            <input placeholder="Toyota" value={make} type="text" onChange={(e) => setMake(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Model</p>
                        <input placeholder="Camry" value={model} type="text" onChange={(e) => setModel(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    <div className="flex flex-row gap-3">
                        <button type="button" onClick={() => { setIsAddingVehicle(false); setYear(""); setMake(""); setModel(""); setSearchResults([]) }}
                            className="flex-1 h-12 rounded-xl bg-secondary text-muted-foreground font-bold cursor-pointer">Cancel</button>
                        <button type="button" disabled={isSearching} onClick={carSearching}
                            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSearching ? "Searching..." : "Search"}
                        </button>
                    </div>

                    {searchResults.length > 0 && (
                        <>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{searchResults.length} results</p>
                            <div className="flex-1 flex flex-col overflow-y-auto min-h-0 [-webkit-overflow-scrolling:touch]">
                                {searchResults.map((car, i) => (
                                    <div key={car.id} onClick={() => handleCarSelect(car)}
                                        className={`flex items-center justify-between py-3.5 cursor-pointer ${i < searchResults.length - 1 ? "border-b border-muted-foreground/20" : ""}`}>
                                        <div>
                                            <p className="text-[15px] font-bold text-foreground">{car.year} {car.make} {car.model}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{car.description}</p>
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Plus size={16} className="text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>}

            {/* TODO: wait for backend to implement a PATCH for the edit feature */}
            {/* Vehicle Editting Modal */}
            {isEditting &&
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">

            </div>}
        </div>
    )
}

export default Vehicles
