import { useEffect, useState } from "react"
import { Plus, CarFront, Ellipsis, Star, GitCompareArrows, X } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { fetchWithAuth } from "../api/fetchWithAuth"
import { toast } from "sonner"

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

    // Fetch users garage
    useEffect(() => {
        fetchWithAuth(`${API_BASE_URL}/vehicles/garage`)
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
        fetchWithAuth(`${API_BASE_URL}/vehicles`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
        fetchWithAuth(`${API_BASE_URL}/vehicles/${carId}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
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
        fetchWithAuth(`${API_BASE_URL}/vehicles/${vehicle_id}/default`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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
        const res = await fetchWithAuth(`${API_BASE_URL}/vehicles/compare`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
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
    }

    // Resets all comparison state and closes the sheet
    function handleCompareClose() {
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

        fetchWithAuth(`${API_BASE_URL}/vehicles/${editingVehicle.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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

            {/* Unified compare sheet — transitions between search, loading, and results */}
            {isComparing && (
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50" onClick={handleCompareClose}>
                <div className="w-full max-w-xl max-h-[90vh] bg-card rounded-t-[28px] px-[22px] pt-[14px] pb-[26px] flex flex-col gap-4 overflow-y-auto [-webkit-overflow-scrolling:touch]"
                    onClick={e => e.stopPropagation()}>
                    <div className="w-[42px] h-[5px] rounded-full bg-border mx-auto shrink-0" />

                    {/* Loading state */}
                    {isCompareLoading && (
                        <div className="h-[300px] flex flex-col items-center justify-center gap-[18px] shrink-0">
                            <div className="w-11 h-11 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                            <p className="text-[15px] font-bold text-foreground">Calculating comparison…</p>
                        </div>
                    )}

                    {/* Search state */}
                    {!isCompareLoading && compareResults.length === 0 && (<>
                        <div className="flex items-start justify-between shrink-0">
                            <div>
                                <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">Compare vehicles</h1>
                                <p className="text-[13px] font-medium text-muted-foreground mt-1 max-w-[280px]">Pick up to 2 vehicles to compare against your default car</p>
                            </div>
                            <button type="button" onClick={handleCompareClose}
                                className="w-[30px] h-[30px] rounded-[9px] bg-secondary flex items-center justify-center shrink-0 ml-2.5 cursor-pointer">
                                <X size={14} className="text-muted-foreground" />
                            </button>
                        </div>

                        {compareSelections.length > 0 && (
                            <div className="flex gap-2 flex-wrap shrink-0">
                                {compareSelections.map(car => (
                                    <div key={car.id} className="flex items-center gap-[7px] h-8 pl-3 pr-2 bg-primary/10 rounded-full">
                                        <span className="text-[13px] font-bold text-primary">{car.year} {car.make} {car.model}</span>
                                        <button type="button"
                                            onClick={() => setCompareSelections(prev => prev.filter(c => c.id !== car.id))}
                                            className="w-[18px] h-[18px] rounded-full bg-primary/15 flex items-center justify-center cursor-pointer">
                                            <X size={9} className="text-primary" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-2.5 shrink-0">
                            <div className="w-[100px]">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-[7px]">Year</p>
                                <input placeholder="2024" value={compareYear} type="text" onChange={e => setCompareYear(e.target.value)}
                                    className="w-full h-12 px-3.5 rounded-xl bg-secondary text-[14px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-[7px]">Make</p>
                                <input placeholder="Toyota" value={compareMake} type="text" onChange={e => setCompareMake(e.target.value)}
                                    className="w-full h-12 px-3.5 rounded-xl bg-secondary text-[14px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none" />
                            </div>
                        </div>
                        <div className="shrink-0">
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[.4px] mb-[7px]">Model</p>
                            <input placeholder="Camry" value={compareModel} type="text" onChange={e => setCompareModel(e.target.value)}
                                className="w-full h-12 px-3.5 rounded-xl bg-secondary text-[14px] font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                        <div className="flex gap-2.5 shrink-0">
                            <button type="button" disabled={isCompareSearching} onClick={handleCompareSearch}
                                className="flex-1 h-12 rounded-[13px] bg-secondary text-foreground text-[15px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                {isCompareSearching ? "Searching..." : "Search"}
                            </button>
                            <button type="button" disabled={compareSelections.length === 0} onClick={handleCompare}
                                className="flex-1 h-12 rounded-[13px] bg-primary text-primary-foreground text-[15px] font-bold cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed">
                                Compare
                            </button>
                        </div>

                        {compareSearchResults.length > 0 && (<>
                            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[.5px] shrink-0">{compareSearchResults.length} results</p>
                            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto [-webkit-overflow-scrolling:touch]">
                                {compareSearchResults.map((car, i) => (
                                    <div key={car.id} onClick={() => handleCompareSelect(car)}
                                        className={`flex items-center justify-between py-2 cursor-pointer ${i < compareSearchResults.length - 1 ? "border-b border-border" : ""}`}>
                                        <div>
                                            <p className="text-[15px] font-bold text-foreground">{car.year} {car.make} {car.model}</p>
                                            <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{car.displacement}L {car.cylinders} Cylinders | {car.combined_mpg} MPG | {car.fuel_type} | {car.drive} | {car.description}</p>
                                        </div>
                                        <button type="button" className="w-[30px] h-[30px] rounded-full border-[1.5px] border-primary bg-transparent flex items-center justify-center shrink-0 cursor-pointer">
                                            <Plus size={14} className="text-primary" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </>)}
                    </>)}

                    {/* Results state */}
                    {!isCompareLoading && compareResults.length > 0 && (() => {
                        const winIdx = compareResults.reduce((b, r, i) =>
                            r.total_cost != null && r.total_cost < (compareResults[b].total_cost ?? Infinity) ? i : b, 0)
                        const colors = compareResults.map((_, i) =>
                            (["#2767E5", "#1F9D57", "#E08A2B"])[i] ?? "#E08A2B"
                        )
                        return (<>
                            <div className="flex items-center justify-between shrink-0">
                                <h1 className="text-[22px] font-extrabold text-foreground tracking-tight">Results</h1>
                                <button type="button" onClick={handleCompareClose}
                                    className="w-[30px] h-[30px] rounded-[9px] bg-secondary flex items-center justify-center shrink-0 cursor-pointer">
                                    <X size={14} className="text-muted-foreground" />
                                </button>
                            </div>

                            {/* Headline cards */}
                            <div className="flex flex-col gap-2.5 shrink-0">
                                {compareResults.map((r, i) => {
                                    const isWinner = i === winIdx
                                    return (
                                        <div key={i} className={`flex items-center justify-between px-4 py-3.5 rounded-2xl border ${isWinner ? "bg-green-500/10 border-green-500/30" : "bg-card border-border"}`}>
                                            <div className="flex items-center gap-[11px]">
                                                <span className="w-[11px] h-[11px] rounded-full shrink-0" style={{ backgroundColor: colors[i] }} />
                                                <div>
                                                    <div className="flex items-center gap-[7px]">
                                                        <span className="text-[15px] font-bold text-foreground">{r.is_baseline ? "Your car" : r.model}</span>
                                                        {isWinner && <span className="text-[10px] font-extrabold uppercase tracking-[.3px] text-green-600 bg-green-500/15 px-2 py-0.5 rounded-[7px]">Best</span>}
                                                    </div>
                                                    <p className="text-[12px] font-medium text-muted-foreground mt-0.5">{r.year} {r.make} {r.model}</p>
                                                </div>
                                            </div>
                                            {r.is_baseline
                                                ? <span className="text-[13px] font-bold text-muted-foreground">Baseline</span>
                                                : r.estimated_savings != null && (
                                                    <span className={`text-[15px] font-extrabold ${r.estimated_savings >= 0 ? "text-green-600" : "text-red-500"}`}>
                                                        {r.estimated_savings >= 0 ? `+$${r.estimated_savings.toFixed(2)}` : `-$${Math.abs(r.estimated_savings).toFixed(2)}`}
                                                    </span>
                                                )
                                            }
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Bar charts */}
                            {[
                                { title: "Total cost ($)", vals: compareResults.map(r => r.total_cost), fmt: v => v != null ? `$${v.toFixed(2)}` : "—", yFmt: v => `$${v}` },
                                { title: "Gallons used", vals: compareResults.map(r => r.total_gallons), fmt: v => v != null ? `${v.toFixed(1)} gal` : "—", yFmt: v => String(v) },
                                { title: "CO₂ emissions (kg)", vals: compareResults.map(r => r.total_co2_kg), fmt: v => v != null ? `${v.toFixed(1)} kg` : "—", yFmt: v => String(v) },
                            ].map(({ title, vals, fmt, yFmt }) => {
                                const m = Math.max(...vals.filter(v => v != null && v > 0), 0.01)
                                const step = Math.pow(10, Math.floor(Math.log10(m / 3)))
                                const axMax = Math.ceil(m / step / 3) * step * 3
                                const BAR_H = 80
                                return (
                                    <div key={title} className="shrink-0">
                                        <p className="text-[14px] font-bold text-foreground mb-3">{title}</p>
                                        <div className="flex gap-2">
                                            {/* Y-axis */}
                                            <div className="flex flex-col justify-between w-10 text-right shrink-0" style={{ paddingTop: "20px", paddingBottom: "20px" }}>
                                                {[3, 2, 1, 0].map(t => (
                                                    <span key={t} className="text-[9px] font-semibold text-muted-foreground leading-none">{yFmt(Math.round(axMax * t / 3))}</span>
                                                ))}
                                            </div>
                                            {/* Chart area */}
                                            <div className="flex-1 rounded-[14px] bg-secondary/50 px-4 py-3">
                                                <div className="relative" style={{ height: `${BAR_H + 20}px` }}>
                                                    {/* Gridlines */}
                                                    <div className="absolute inset-x-0 bottom-0" style={{ height: `${BAR_H}px` }}>
                                                        {[0, 1/3, 2/3, 1].map((t, j) => (
                                                            <div key={j} className="absolute inset-x-0 h-px bg-border/60" style={{ bottom: `${t * 100}%` }} />
                                                        ))}
                                                    </div>
                                                    {/* Bars + value labels */}
                                                    <div className="absolute inset-0 flex items-end justify-around z-10">
                                                        {vals.map((v, i) => {
                                                            const h = (v != null && axMax) ? Math.max(3, Math.round((v / axMax) * BAR_H)) : 3
                                                            return (
                                                                <div key={i} className="flex flex-col items-center gap-1">
                                                                    <span className="text-[10px] font-bold text-foreground leading-none">{fmt(v)}</span>
                                                                    <div className="w-8" style={{ height: `${h}px`, backgroundColor: colors[i], borderRadius: "6px 6px 2px 2px" }} />
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                {/* X-axis labels */}
                                                <div className="flex justify-around mt-2">
                                                    {compareResults.map((r, i) => (
                                                        <span key={i} className="text-[10px] font-semibold text-muted-foreground text-center w-8 leading-none">
                                                            {r.is_baseline ? "You" : r.model.split(" ")[0]}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </>)
                    })()}
                </div>
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
