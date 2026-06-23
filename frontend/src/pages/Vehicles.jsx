import { useEffect, useState } from "react"
import { Plus, CarFront, Dot, Ellipsis, Star } from "lucide-react"
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
            <div className="flex flex-row justify-between items-center bg-primary px-6 pt-8 pb-6 shrink-0">
                <p className="text-3xl font-bold text-primary-foreground">My Garage</p>
                <button onClick={() => setIsAddingVehicle(true)} className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer text-primary-foreground text-base font-medium">
                    <Plus size={20} /> Add
                </button>
            </div>

            {/* Vehicles Display */}
            {vehicles.length === 0 ? (
                <p className="text-center py-6 text-gray-500">No vehicles yet... Add some!</p>
            ) : (
                <div className="flex flex-col gap-3 py-4 pb-6 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                    {[...vehicles].sort((a, b) => b.is_default - a.is_default).map(car => (
                        <div key={car.id} className="relative bg-card border border-border rounded-xl p-4 mx-4">
                            {/* Top row: icon + title */}
                            <div className="flex flex-row items-center gap-4">
                                <div className="bg-secondary rounded-xl p-4">
                                    <CarFront size={30} className="text-primary" />
                                </div>
                                <div className="pr-8">
                                    <p className="text-lg font-bold text-foreground">{car.year} {car.make} {car.model}</p>
                                    <p className="text-sm text-muted-foreground">{car.nickname}</p>
                                </div>
                            </div>

                            {/* Dropdown menu */}
                            <div className="absolute top-4 right-4">
                                <button onClick={() => setIsOpen(isOpen === car.id ? null : car.id)} className="cursor-pointer p-1 rounded-lg hover:bg-secondary">
                                    <Ellipsis size={24} />
                                </button>
                                {(isOpen === car.id) && (
                                    <div className="absolute right-0 top-full mt-0 bg-card border border-border rounded-xl shadow-lg flex flex-col min-w-[130px] z-10 overflow-hidden">
                                        <button onClick={() => handleDefaultCar(car.id)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-center text-foreground">Set Default</button>
                                        {/* TODO: Add Edit button functionality (i.e. nickname, mpg, co2)*/}
                                        <button className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-center text-foreground">Edit</button>
                                        <button onClick={() => handleDelete(car.id)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-center text-red-500">Delete</button>
                                    </div>
                                )}
                            </div>

                            {/* Star Icon */}
                            {car.is_default && 
                            <div className="absolute bottom-4 right-4">
                                <Star size={30} className="text-yellow-500" fill="currentColor" />
                            </div>}

                            {/* Stats row */}
                            <div className="flex flex-row gap-4 mt-3">
                                {/* Placeholder stats */}
                                <p className="text-sm text-muted-foreground">MPG, Miles, CO2</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Vehicle Adding Modal */}
            {isAddingVehicle && 
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="flex flex-col bg-card rounded-xl w-full max-w-xl p-6 gap-4 max-h-[90vh] overflow-hidden">
                    <h1 className="text-2xl font-bold text-foreground">Car Finder</h1>
                    <input placeholder="Year" value={year} type="text" onChange={(e) => setYear(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input placeholder="Make" value={make} type="text" onChange={(e) => setMake(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input placeholder="Model" value={model} type="text" onChange={(e) => setModel(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <div className="flex flex-row gap-3">
                        <button type="button" disabled={isSearching} className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" onClick={carSearching}>{isSearching ? "Searching..." : "Search"}</button>
                        <button type="button" className="flex-1 py-3 rounded-lg border border-border text-foreground cursor-pointer hover:bg-secondary" onClick={() => { setIsAddingVehicle(false); setYear(""); setMake(""); setModel(""); setSearchResults([]) }}>Close</button>
                    </div>
                    {searchResults.length > 0 && <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0 [-webkit-overflow-scrolling:touch]">
                        {searchResults.map(car => (
                            <div onClick={() => handleCarSelect(car)} key={car.id} className="bg-secondary hover:bg-secondary/70 rounded-lg p-3 cursor-pointer">
                                <p className="text-base font-semibold text-foreground">{car.year} {car.make} {car.model}</p>
                                <p className="text-sm text-muted-foreground">{car.description}</p>
                            </div>
                        ))}
                    </div>}
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
