import { useEffect, useState } from "react"
import { Plus, CarFront, Dot, Ellipsis } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"

function Vehicles() {
    const [vehicles, setVehicles] = useState([])
    const [isAdding, setIsAdding] = useState(false)
    const [make, setMake] = useState("")
    const [model, setModel] = useState("")
    const [year, setYear] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [isOpen, setIsOpen] = useState(null)

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

    const carSearching = () => {
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
            setSearchResults(data)
        })
    }

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
            setIsAdding(false)
        })
    }

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

    return (
        <div>
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-primary px-6 pt-8 pb-6">
                <p className="text-3xl font-bold text-primary-foreground">My Garage</p>
                <button onClick={() => setIsAdding(true)} className="flex items-center gap-1 px-4 py-2 rounded-full bg-white/20 hover:bg-white/40 cursor-pointer text-primary-foreground text-base font-medium">
                    <Plus size={20} /> Add
                </button>
            </div>

            {/* Vehicles Display */}
            {vehicles.length === 0 ? (
                <p className="text-center py-6 text-gray-500">No vehicles yet... Add some!</p>
            ) : (
                <div className="flex flex-col gap-3 py-4">
                    {vehicles.map(car => (
                        <div key={car.id} className="relative bg-card border border-border rounded-xl p-4 mx-4">
                            {/* Top row: icon + title */}
                            <div className="flex flex-row items-center gap-4">
                                <div className="bg-secondary rounded-xl p-4">
                                    <CarFront size={40} className="text-primary" />
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
                                        {/* TODO: Add Edit button functionality (i.e. nickname, mpg, co2)*/}
                                        <button className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-center text-foreground">Edit</button>
                                        <button onClick={() => handleDelete(car.id)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-center text-red-500">Delete</button>
                                    </div>
                                )}
                            </div>

                            {/* Stats row */}
                            <div className="flex flex-row gap-4 mt-3">
                                <p className="text-sm text-muted-foreground">MPG, Miles, CO2</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Adding Modal */}
            {isAdding && <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                <div className="flex flex-col bg-card rounded-xl w-full max-w-xl p-6 gap-4 max-h-[90vh]">
                    <h1 className="text-2xl font-bold text-foreground">Car Finder</h1>
                    <input placeholder="Year" value={year} type="text" onChange={(e) => setYear(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input placeholder="Make" value={make} type="text" onChange={(e) => setMake(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input placeholder="Model" value={model} type="text" onChange={(e) => setModel(e.target.value)}
                        className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                    <div className="flex flex-row gap-3">
                        <button type="button" className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer hover:opacity-90" onClick={carSearching}>Search</button>
                        <button type="button" className="flex-1 py-3 rounded-lg border border-border text-foreground cursor-pointer hover:bg-secondary" onClick={() => setIsAdding(false)}>Close</button>
                    </div>
                    {searchResults.length > 0 && <div className="flex flex-col gap-2 overflow-y-auto">
                        {searchResults.map(car => (
                            <div onClick={() => handleCarSelect(car)} key={car.id} className="bg-secondary hover:bg-secondary/70 rounded-lg p-3 cursor-pointer">
                                <p className="text-base font-semibold text-foreground">{car.year} {car.make} {car.model}</p>
                                <p className="text-sm text-muted-foreground">{car.description}</p>
                            </div>
                        ))}
                    </div>}
                </div>
            </div>}
        </div>
    )
}

export default Vehicles
