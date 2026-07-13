import { useEffect, useState } from "react"
import { Plus, CarFront, Ellipsis, Star, GitCompareArrows, X } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip, CartesianGrid } from "recharts"

const COMPARE_COLORS = ["#3B82F6", "#22C55E", "#F97316"]

// TODO: Change from user input to selection for year, make, model
//       BLOCKED: no API endpoint returns distinct years/makes/models from the catalog
//       to populate select options (search_vehicle_from_db only takes known values)

//       Add car type detection to change the lucide icon based on if car is a Sedan, Truck, SUV.
//       BLOCKED: vehicle_class exists on VehicleCatalog but get_user_vehicles never joins to
//       it, so /vehicles/garage doesn't return it - needs backend change

//       Make icons smaller to fit display better for mobile view (Done)
//       Add set default car (Done)
//       Add Edit modal (nickname, mpg override) (Done)

function Vehicles() {
    const [vehicles, setVehicles] = useState([])
    const [isAddingVehicle, setIsAddingVehicle] = useState(false)
    const [editingVehicle, setEditingVehicle] = useState(null) // the car object currently being edited, or null
    const [editNickname, setEditNickname] = useState("")
    const [editMpgOverride, setEditMpgOverride] = useState("")
    const [isSavingEdit, setIsSavingEdit] = useState(false)
    const [make, setMake] = useState("")
    const [model, setModel] = useState("")
    const [year, setYear] = useState("")
    const [searchResults, setSearchResults] = useState([])
    const [isOpen, setIsOpen] = useState(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isComparing, setIsComparing] = useState(false)
    const [compareYear, setCompareYear] = useState("")
    const [compareMake, setCompareMake] = useState("")
    const [compareModel, setCompareModel] = useState("")
    const [compareSearchResults, setCompareSearchResults] = useState([])
    const [isCompareSearching, setIsCompareSearching] = useState(false)
    const [compareSelections, setCompareSelections] = useState([])
    const [compareResults, setCompareResults] = useState([])
    const [isCompareLoading, setIsCompareLoading] = useState(false)
    const [isCompareResultsOpen, setIsCompareResultsOpen] = useState(false)

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
            setIsLoading(false)
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
                toast.error("Could not remove the car. It may have trips logged against it.")
            }
        })
        .catch(() => toast.error("Could not remove the car. It may have trips logged against it."))
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

    // Searches the vehicle catalog for vehicles to compare
    function handleCompareSearch() {
        setIsCompareSearching(true)
        fetch(`${API_BASE_URL}/vehicles/search`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ year: compareYear, make: compareMake, model: compareModel })
        })
        .then(res => res.ok ? res.json() : [])
        .then(data => {
            if (data.length === 0) toast.error("Could not find any results.")
            setCompareSearchResults(data)
            setIsCompareSearching(false)
        })
    }

    // Adds a vehicle to the comparison selection (max 2)
    function handleCompareSelect(car) {
        if (compareSelections.length >= 2) { toast.error("Max 2 vehicles to compare."); return }
        if (compareSelections.find(c => c.id === car.id)) { toast.error("Already selected."); return }
        setCompareSelections(prev => [...prev, car])
    }

    // Submits selected vehicles to the comparison API and shows results
    async function handleCompare() {
        setIsCompareLoading(true)
        const res = await fetch(`${API_BASE_URL}/vehicles/compare`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ vehicle_list: compareSelections.map(c => c.id) })
        })
        if (!res.ok) {
            toast.error("Could not run comparison. Make sure you have a default vehicle set.")
            setIsCompareLoading(false)
            return
        }
        const data = await res.json()
        setCompareResults(data)
        setIsCompareLoading(false)
        setIsComparing(false)
        setIsCompareResultsOpen(true)
    }

    // Resets all comparison state and closes both sheets
    function handleCompareClose() {
        setIsCompareResultsOpen(false)
        setIsComparing(false)
        setCompareSelections([])
        setCompareSearchResults([])
        setCompareYear("")
        setCompareMake("")
        setCompareModel("")
        setCompareResults([])
    }

    // Opens the edit bottom sheet, prefilled with the car's current nickname/mpg
    function handleEditOpen(car) {
        setEditingVehicle(car)
        setEditNickname(car.nickname || "")
        setEditMpgOverride(car.mpg_override != null ? String(car.mpg_override) : "")
        setIsOpen(null)
    }

    // Saves the edited nickname/mpg override for a user's car
    function handleEditSubmit(e) {
        e.preventDefault()

        setIsSavingEdit(true)

        fetch(`${API_BASE_URL}/vehicles/${editingVehicle.id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
                nickname: editNickname,
                mpg_override: editMpgOverride ? parseFloat(editMpgOverride) : null
            })
        })
        .then(res => {
            if (res.ok) return res.json()
            toast.error("Could not save changes.")
            return null
        })
        .then(data => {
            if (data) {
                setVehicles(prev => prev.map(car => car.id === data.id ? data : car))
                toast.success("Car updated!")
                setEditingVehicle(null)
            }
            setIsSavingEdit(false)
        })
    }

    return (
        <div className="flex flex-col h-full overflow-x-hidden">
            {/* Header */}
            <div className="px-6 pt-8 pb-4 flex items-start justify-between shrink-0">
                <div>
                    <p className="text-[28px] font-extrabold text-primary tracking-tight">Garage</p>
                    <p className="text-sm text-muted-foreground mt-1">{vehicles.length} vehicle{vehicles.length === 1 ? "" : "s"}</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => setIsComparing(true)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-secondary text-foreground text-sm font-bold cursor-pointer shadow-sm">
                        <GitCompareArrows size={16} /> Compare
                    </button>
                    <button type="button" onClick={() => setIsAddingVehicle(true)}
                        className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-bold cursor-pointer shadow-sm">
                        <Plus size={16} /> Add
                    </button>
                </div>
            </div>

            {/* Vehicles Display */}
            {isLoading ? (
                <div className="flex flex-col gap-3 px-4 pb-6">
                    <div className="animate-pulse bg-card rounded-2xl h-[88px]" />
                    <div className="animate-pulse bg-card rounded-2xl h-[88px]" />
                </div>
            ) : vehicles.length === 0 ? (
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
                                            <p className="text-[17px] font-bold text-foreground">{car.nickname || `${car.year} ${car.make} ${car.model}`}</p>
                                            {car.is_default && <Star size={15} className="text-primary" fill="currentColor" />}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                            {car.nickname ? `${car.year} ${car.make} ${car.model} · ` : `${car.year} · `}{mpg} mpg
                                        </p>
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
                                            <button type="button" onClick={() => handleEditOpen(car)} className="px-4 py-2.5 text-sm hover:bg-secondary cursor-pointer text-left text-foreground">Edit</button>
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

            {/* Vehicle Comparison Modal - bottom sheet */}
            {isComparing &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <div className="w-full max-w-xl max-h-[85vh] bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-4 overflow-hidden">
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto" />
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-xl font-extrabold text-foreground">Compare vehicles</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Pick up to 2 vehicles to compare against your default car</p>
                        </div>
                        <button type="button" onClick={handleCompareClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
                    </div>

                    {isCompareLoading && (
                        <div className="flex flex-col items-center justify-center py-10 gap-3">
                            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-muted-foreground">Calculating comparison...</p>
                        </div>
                    )}

                    {/* Selected cars */}
                    {!isCompareLoading && compareSelections.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                            {compareSelections.map(car => (
                                <div key={car.id} className="flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full">
                                    {car.year} {car.make} {car.model}
                                    <button type="button" onClick={() => setCompareSelections(prev => prev.filter(c => c.id !== car.id))} className="cursor-pointer">
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Fields for car selection */}
                    {!isCompareLoading && <>
                    <div className="flex gap-3">
                        <div className="w-24">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Year</p>
                            <input placeholder="2023" value={compareYear} type="text" onChange={(e) => setCompareYear(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                        <div className="flex-1">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Make</p>
                            <input placeholder="Toyota" value={compareMake} type="text" onChange={(e) => setCompareMake(e.target.value)}
                                className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Model</p>
                        <input placeholder="Camry" value={compareModel} type="text" onChange={(e) => setCompareModel(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    <div className="flex gap-3">
                        <button type="button" disabled={isCompareSearching} onClick={handleCompareSearch}
                            className="flex-1 h-12 rounded-xl bg-secondary text-foreground font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            {isCompareSearching ? "Searching..." : "Search"}
                        </button>
                        <button type="button" disabled={compareSelections.length === 0} onClick={handleCompare}
                            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            Compare
                        </button>
                    </div>

                    {compareSearchResults.length > 0 && (
                        <>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">{compareSearchResults.length} results</p>
                            <div className="flex-1 flex flex-col overflow-y-auto min-h-0 [-webkit-overflow-scrolling:touch]">
                                {compareSearchResults.map((car, i) => (
                                    <div key={car.id} onClick={() => handleCompareSelect(car)}
                                        className={`flex items-center justify-between py-3.5 cursor-pointer ${i < compareSearchResults.length - 1 ? "border-b border-muted-foreground/20" : ""}`}>
                                        <div>
                                            <p className="text-[15px] font-bold text-foreground">{car.year} {car.make} {car.model}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{car.combined_mpg} MPG · {car.fuel_type} · {car.drive}</p>
                                        </div>
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <Plus size={16} className="text-primary" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                    </>}
                </div>
            </div>}

            {/* Vehicle Comparison Results Modal - bottom sheet */}
            {isCompareResultsOpen &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <div className="w-full max-w-xl max-h-[85vh] bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-5 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto shrink-0" />
                    <div className="flex items-center justify-between shrink-0">
                        <h1 className="text-xl font-extrabold text-foreground">Results</h1>
                        <button type="button" onClick={handleCompareClose} className="text-muted-foreground hover:text-foreground cursor-pointer"><X size={18} /></button>
                    </div>

                    {/* Vehicle headline cards */}
                    {(() => {
                        const winnerIndex = compareResults.reduce((best, r, i) =>
                            r.total_cost < compareResults[best].total_cost ? i : best, 0)
                        return (
                        <div className="flex flex-col gap-2 shrink-0">
                            {compareResults.map((r, i) => (
                                <div key={i} className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COMPARE_COLORS[i] }} />
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-sm font-bold text-foreground">{r.is_baseline ? "Your car" : `${r.year} ${r.make} ${r.model}`}</p>
                                                {i === winnerIndex && <span className="text-[10px] font-bold bg-green-500/15 text-green-500 px-1.5 py-0.5 rounded-md">Best</span>}
                                            </div>
                                            <p className="text-xs text-muted-foreground">{r.year} {r.make} {r.model}</p>
                                        </div>
                                    </div>
                                    {!r.is_baseline && r.estimated_savings != null && (
                                        <span className={`text-sm font-extrabold ${r.estimated_savings >= 0 ? "text-green-500" : "text-red-500"}`}>
                                            {r.estimated_savings >= 0 ? `Save $${r.estimated_savings.toFixed(2)}` : `-$${Math.abs(r.estimated_savings).toFixed(2)}`}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        )
                    })()}

                    {/* Cost chart */}
                    <div className="shrink-0">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Total Cost ($)</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={compareResults.map((r, i) => ({ name: r.is_baseline ? "Your car" : r.model, value: r.total_cost, index: i }))} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={45} tickFormatter={v => `$${v}`} />
                                <Tooltip formatter={v => [`$${v?.toFixed(2)}`, "Cost"]} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {compareResults.map((_, i) => <Cell key={i} fill={COMPARE_COLORS[i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Gallons chart */}
                    <div className="shrink-0">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">Gallons Used</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={compareResults.map((r, i) => ({ name: r.is_baseline ? "Your car" : r.model, value: r.total_gallons, index: i }))} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                                <Tooltip formatter={v => [`${v?.toFixed(2)} gal`, "Gallons"]} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {compareResults.map((_, i) => <Cell key={i} fill={COMPARE_COLORS[i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* CO2 chart */}
                    <div className="shrink-0">
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-3">CO2 Emissions (kg)</p>
                        <ResponsiveContainer width="100%" height={140}>
                            <BarChart data={compareResults.map((r, i) => ({ name: r.is_baseline ? "Your car" : r.model, value: r.total_co2_kg, index: i }))} barSize={40}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" strokeOpacity={0.1} />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={35} />
                                <Tooltip formatter={v => [`${v?.toFixed(2)} kg`, "CO2"]} />
                                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                    {compareResults.map((_, i) => <Cell key={i} fill={COMPARE_COLORS[i]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>}

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
                                            <p className="text-xs text-muted-foreground mt-0.5"> {car.displacement}L {car.cylinders} Cylinders | {car.combined_mpg} MPG | {car.fuel_type} | {car.drive} | {car.description}  </p>
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

            {/* Vehicle Editing Modal - bottom sheet */}
            {editingVehicle &&
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
                <form onSubmit={handleEditSubmit} className="w-full max-w-xl bg-card rounded-t-[28px] p-6 pb-8 flex flex-col gap-4">
                    <div className="w-11 h-1.5 rounded-full bg-border mx-auto" />
                    <div>
                        <h1 className="text-xl font-extrabold text-foreground">Edit car</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">{editingVehicle.year} {editingVehicle.make} {editingVehicle.model}</p>
                    </div>

                    <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Nickname</p>
                        <input placeholder="My daily driver" value={editNickname} type="text" onChange={(e) => setEditNickname(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>
                    <div>
                        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide mb-1.5">Combined MPG</p>
                        <input placeholder="28" value={editMpgOverride} type="number" step="0.1" onChange={(e) => setEditMpgOverride(e.target.value)}
                            className="w-full px-3 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                    </div>

                    <div className="flex flex-row gap-3">
                        <button type="button" onClick={() => setEditingVehicle(null)}
                            className="flex-1 h-12 rounded-xl bg-secondary text-muted-foreground font-bold cursor-pointer">Cancel</button>
                        <button type="submit" disabled={isSavingEdit}
                            className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            {isSavingEdit ? "Saving..." : "Save"}
                        </button>
                    </div>
                </form>
            </div>}
        </div>
    )
}

export default Vehicles
