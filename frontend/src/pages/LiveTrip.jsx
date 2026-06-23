import { useEffect, useState, useRef } from "react"
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api"
import { Car, MapPin } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"

const RADIUS_CAP_MILES = 50
const STRAY_BUFFER_MILES = 2.5
const ARRIVAL_THRESHOLD_MILES = 0.1

const mapContainerStyle = {
    width: "100%",
    height: "100%"
}

function LiveTrip() {
    const [vehicles, setVehicles] = useState([])
    const [vehicleId, setVehicleId] = useState("")

    const [startAddress, setStartAddress] = useState("")
    const [startCoords, setStartCoords] = useState(null) // { lat, lng }
    const [destinationAddress, setDestinationAddress] = useState("")
    const [destinationCoords, setDestinationCoords] = useState(null) // { lat, lng }
    const [searchResults, setSearchResults] = useState([])
    const [searchTarget, setSearchTarget] = useState(null) // "start" | "destination" - which input triggered the current search

    const [currentPosition, setCurrentPosition] = useState(null) // { lat, lng }
    const [path, setPath] = useState([]) // array of { lat, lng } collected while tracking
    const [distance, setDistance] = useState(0)
    const [closestDistanceToDestination, setClosestDistanceToDestination] = useState(null)
    const [distanceToDestination, setDistanceToDestination] = useState(null) // live distance to destination, for display while tracking

    const [isTracking, setIsTracking] = useState(false)
    const [isStartingTrip, setIsStartingTrip] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const watchIdRef = useRef(null)
    const lastPointRef = useRef(null) // { lat, lng } of the most recent GPS point, used to measure each new segment's distance
    const closestDistanceRef = useRef(null) // closest distance-to-destination reached so far, used for stray detection
    const debounceRef = useRef(null)

    const { isLoaded } = useJsApiLoader({
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
    })

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
            // Set the user's default car as default option
            const defaultVehicle = data.find(v => v.is_default)
            setVehicleId(defaultVehicle?.id ?? "")
        })
    }, [])

    // Get user's current location on mount to prefill the start point
    useEffect(() => {
        // TODO: BLOCKED until backend /maps/geocode (reverse) exists to prefill setStartAddress
        //       with a readable address - could just show raw coordinates for now instead
        navigator.geolocation.getCurrentPosition((position) => {
            // position.coords.latitude and position.coords.longitude live here
            const latPos = position.coords.latitude
            const longPos = position.coords.longitude
            
            setCurrentPosition( { lat: latPos, lng: longPos} )
            setStartCoords( { lat: latPos, lng: longPos} )
        }, (error) => {
            // runs if permission is denied or something fails
            toast.error("Could not get your location.")
        })
    }, [])

    // Search the start/destination address as the user types
    function handleAddressSearch(query) {
        // Debouncing so API doesn't get fired every time user updates
        clearTimeout(debounceRef.current)

        if (!query) {
            setSearchResults([])
            return
        }

        debounceRef.current = setTimeout( () => {
            fetch(`${API_BASE_URL}/maps/autocomplete?input=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`}
            })
            .then(res => {
                if (res.ok) return res.json()
                return null
            })
            .then(data => {
                if (data) {
                    setSearchResults(data)
                } else {
                    toast.error("Could not find address.")
                    return
                }
            })
        }, 300)
    }

    // Select a search result to lock in the start or destination coordinates
    function handleSelectAddress(placeId, isDestination) {
        fetch(`${API_BASE_URL}/maps/geocode?place_id=${encodeURIComponent(placeId)}`, {
            method: "GET",
            headers: {"Authorization": `Bearer ${localStorage.getItem("token")}`}
        })
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            if (data) {
                if (isDestination) {
                    setDestinationCoords({ lat: data.lat, lng: data.lng })
                    setDestinationAddress(data.formatted_address)
                } else {
                    setStartCoords({ lat: data.lat, lng: data.lng })
                    setStartAddress(data.formatted_address)
                }
                setSearchResults([])
                setSearchTarget(null)
            } else {
                toast.error("Could not get address.")
                return
            }
        })
    }

    // Haversine distance between two lat/lng points, in miles
    function haversineMiles(lat1, lng1, lat2, lng2) {
        // Distance vars
        const phi1 = lat1 * (Math.PI/180)
        const phi2 = lat2 * (Math.PI/180)
        
        const lmb1 = lng1 * (Math.PI/180)
        const lmb2 = lng2 * (Math.PI/180)

        // Earth's radius (miles)
        const earthR = 3958.8  

        const diffPhi = (phi2 - phi1)
        const diffLmb =  (lmb2 - lmb1)

        const a = (Math.sin(diffPhi / 2) ** 2) + Math.cos(phi1) * Math.cos(phi2) * (Math.sin(diffLmb / 2) ** 2)

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))

        const distance = earthR * c
        
        return distance
    }

    // Starts GPS tracking for the trip
    function handleStartTrip() {
        // TODO: future Plan Mode - skip this fresh-position override and let the user's
        //       manually selected start location stand, for trips being planned ahead of time
        //       rather than tracked live
        setIsStartingTrip(true)

        navigator.geolocation.getCurrentPosition((position) => {
            const freshStart = { lat: position.coords.latitude, lng: position.coords.longitude }
            setStartCoords(freshStart)
            setCurrentPosition(freshStart)

            // Validation handling
            if (!vehicleId || !destinationCoords) {
                toast.error("Please fill in all of the fields.")
                setIsStartingTrip(false)
                return
            }

            if (haversineMiles(freshStart.lat, freshStart.lng, destinationCoords.lat, destinationCoords.lng) > RADIUS_CAP_MILES) {
                toast.error("Your destination is too far.")
                setIsStartingTrip(false)
                return
            }

            // Begins watching GPS position, everything here runs on every position update
            watchIdRef.current = navigator.geolocation.watchPosition((trackingPosition) => {
                const newPoint = { lat: trackingPosition.coords.latitude, lng: trackingPosition.coords.longitude }

                setCurrentPosition(newPoint)

                // Updates the distance traveled
                if (lastPointRef.current) {
                    const segment = haversineMiles(lastPointRef.current.lat, lastPointRef.current.lng, newPoint.lat, newPoint.lng)
                    setDistance(prev => prev + segment)
                }

                // Stores the new point for the live route drawn on the map
                lastPointRef.current = newPoint
                setPath(prev => [...prev, newPoint])

                // Calculates the approx distance left until the destination
                const liveDistanceToDestination = haversineMiles(newPoint.lat, newPoint.lng, destinationCoords.lat, destinationCoords.lng)
                setDistanceToDestination(liveDistanceToDestination)

                // Checks if the user has arrived to their destination
                if (liveDistanceToDestination <= ARRIVAL_THRESHOLD_MILES) {
                    handleStopTrip("arrived")
                    return
                }

                // Track the closest the user has gotten to the destination so far.
                // Comparing against this (rather than the original starting distance) means
                // a real detour that's heading back toward the destination doesn't immediately
                // count as straying - only drifting further from your best progress does.
                if (closestDistanceRef.current === null || liveDistanceToDestination < closestDistanceRef.current) {
                    closestDistanceRef.current = liveDistanceToDestination
                    setClosestDistanceToDestination(liveDistanceToDestination)
                } else if (liveDistanceToDestination > closestDistanceRef.current + STRAY_BUFFER_MILES) {
                    handleStopTrip("strayed")
                }
            }, (error) => {
                toast.error("Lost GPS signal.")
            })

            setIsTracking(true)
            setIsStartingTrip(false)
            toast.success("Trip started!")
        }, (error) => {
            toast.error("Could not get your current location.")
            setIsStartingTrip(false)
        })
    }

    // Stops tracking (manually, or automatically via arrival/straying) and submits the trip
    function handleStopTrip(reason) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        setIsSubmitting(true)

        fetch(`${API_BASE_URL}/trips`, {
            method: "POST",
            headers: {
                "Content-Type" : "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({ vehicle_id: vehicleId, start_location: startAddress, distance: distance })
        })
        .then(res => {
            if (res.ok) return res.json()
            if (res.status === 401) {
                toast.error("Your session expired. Please log in again to save this trip.")
            } else {
                toast.error("Could not save your trip.")
            }
            return null
        })
        .then(data => {
            if (data) {
                setPath([])
                setDistance(0)
                setDistanceToDestination(null)
                closestDistanceRef.current = null
                setClosestDistanceToDestination(null)
                if (reason === "manual") {
                    toast.success("You have stopped the trip.")
                } else if (reason === "arrived") {
                    toast.success("You have arrived at your destination.")
                } else if (reason === "strayed") {
                    toast.warning("You have strayed too far and the trip was ended early.")
                }
            }

            setIsTracking(false)
            setIsSubmitting(false)
        })
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
            {/* Header */}
            <div className="flex flex-row justify-between items-center bg-primary px-6 pt-8 pb-6 shrink-0">
                <p className="text-3xl font-bold text-primary-foreground">Live Trip</p>
            </div>

            {/* Vehicle selector */}
            <div className="flex flex-col gap-3 px-4 py-4 shrink-0">
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
            </div>

            {/* Map */}
            <div className="relative flex-1 px-4 pb-4">
                {isLoaded ? (
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={currentPosition || { lat: 0, lng: 0 }}
                        zoom={14}
                    >
                        {currentPosition && <Marker position={currentPosition} icon="https://maps.google.com/mapfiles/ms/icons/blue-dot.png" />}
                        {destinationCoords && <Marker position={destinationCoords} icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png" />}
                        {path.length > 1 && <Polyline path={path} />}
                    </GoogleMap>
                ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">Loading map...</div>
                )}

                {isTracking ? (
                    /* Live stats while tracking, shown in place of the address inputs */
                    <div className="absolute top-4 left-4 right-4 flex gap-2">
                        <div className="flex-1 rounded-lg bg-background shadow-lg px-3 py-2 text-center">
                            <p className="text-xs text-muted-foreground">Distance Traveled</p>
                            <p className="text-lg font-bold text-foreground">{distance.toFixed(1)} mi</p>
                        </div>
                        <div className="flex-1 rounded-lg bg-background shadow-lg px-3 py-2 text-center">
                            <p className="text-xs text-muted-foreground">To Destination</p>
                            <p className="text-lg font-bold text-foreground">{distanceToDestination !== null ? `~${distanceToDestination.toFixed(1)} mi` : "—"}</p>
                        </div>
                    </div>
                ) : (
                    /* Floating Start location + Destination inputs */
                    <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                        {/* TODO: future Plan Mode - re-enable search on this field (onChange/onBlur + dropdown
                            below, matching the Destination input) so users can plan a trip from a location
                            other than where they currently are. For live tracking, start must always be
                            the user's real position, so this stays read-only for now. */}
                        <div className="flex items-stretch border border-border rounded-lg overflow-hidden bg-background shadow-lg">
                            <div className="px-2.5 bg-secondary border-r border-border flex items-center">
                                <MapPin size={15} className="text-muted-foreground" />
                            </div>
                            <input placeholder="Start location" value={startAddress} type="text" readOnly
                                className="flex-1 px-3 py-2 text-base bg-background text-foreground placeholder:text-muted-foreground focus:outline-none cursor-default" />
                        </div>

                        <div className="flex items-stretch border border-border rounded-lg overflow-hidden bg-background shadow-lg focus-within:ring-2 focus-within:ring-primary">
                            <div className="px-2.5 bg-secondary border-r border-border flex items-center">
                                <MapPin size={15} className="text-muted-foreground" />
                            </div>
                            <input placeholder="Destination" value={destinationAddress} type="text"
                                onChange={(e) => { setDestinationAddress(e.target.value); setSearchTarget("destination"); handleAddressSearch(e.target.value) }}
                                onBlur={() => { setSearchTarget(null); setSearchResults([]) }}
                                className="flex-1 px-3 py-2 text-base bg-background text-foreground placeholder:text-muted-foreground focus:outline-none" />
                        </div>
                        {searchTarget === "destination" && searchResults.length > 0 && (
                            <div className="flex flex-col gap-1 bg-background rounded-lg shadow-lg overflow-hidden">
                                {searchResults.map(result => (
                                    <div key={result.place_id} onMouseDown={() => handleSelectAddress(result.place_id, true)}
                                        className="px-3 py-2 text-sm text-foreground hover:bg-secondary cursor-pointer">
                                        {result.description}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Floating Start/Stop Trip button */}
                <div className="absolute bottom-8 left-8 right-8">
                    {isTracking ? (
                        <button type="button" onClick={() => handleStopTrip("manual")} disabled={isSubmitting}
                            className="w-full py-4 rounded-lg bg-red-500 text-white font-semibold text-lg cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                            {isSubmitting ? "Saving..." : "Stop Trip"}
                        </button>
                    ) : (
                        <button type="button" onClick={handleStartTrip} disabled={!isLoaded || !vehicleId || !destinationCoords || isStartingTrip}
                            className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold text-lg cursor-pointer hover:opacity-90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                            {isStartingTrip ? "Starting..." : "Start Trip"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LiveTrip
