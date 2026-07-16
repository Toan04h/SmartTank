import { useEffect, useState, useRef } from "react"
import { GoogleMap, Marker, Polyline, useJsApiLoader } from "@react-google-maps/api"
import { Car, Navigation, Square, LocateFixed, ChevronDown } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"
import { useTracking } from "../context/TrackingContext"
import polyline from "@mapbox/polyline"

const RADIUS_CAP_MILES = 50
const STRAY_BUFFER_MILES = 2.5
const ARRIVAL_THRESHOLD_MILES = 0.1
const MIN_TRIP_DISTANCE_MILES = 0.02 // below this, treat as no real movement - discard locally, no API calls at all

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
    const [destinationCoords, setDestinationCoords] = useState(null) // { lat, lng } - null means an open-ended, no-destination trip
    const [searchResults, setSearchResults] = useState([])
    const [searchTarget, setSearchTarget] = useState(null) // "start" | "destination" - which input triggered the current search

    const [currentPosition, setCurrentPosition] = useState(null) // { lat, lng }
    const [heading, setHeading] = useState(null) // degrees 0-360 from GPS, used to rotate the driving arrow
    const [path, setPath] = useState([]) // array of { lat, lng } collected while tracking
    const [distance, setDistance] = useState(0)
    const [closestDistanceToDestination, setClosestDistanceToDestination] = useState(null)
    const [distanceToDestination, setDistanceToDestination] = useState(null) // live distance to destination, for display while tracking
    const [elapsedSeconds, setElapsedSeconds] = useState(0)

    const { isTracking, setIsTracking } = useTracking() // shared with BottomNav so it can hide itself while tracking
    const [isStartingTrip, setIsStartingTrip] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const watchIdRef = useRef(null)
    const startTimeRef = useRef(null) // ISO timestamp captured when tracking begins
    const lastPointRef = useRef(null) // { lat, lng } of the most recent GPS point, used to measure each new segment's distance
    const closestDistanceRef = useRef(null) // closest distance-to-destination reached so far, used for stray detection
    const debounceRef = useRef(null)
    const wakeLockRef = useRef(null)
    const mapRef = useRef(null) // underlying Google Map instance, used for the recenter button
    const distanceRef = useRef(0) // mirrors `distance` so the watchPosition closure (created once at Start,
    // never recreated) can read the live total instead of whatever it was frozen at when tracking began

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

    // Detects a trip that was left running and never cleanly stopped - most likely
    // because the page got backgrounded (tab switch, app switch) and iOS reloaded
    // the page from scratch, silently wiping all tracking state. The "liveTripActive"
    // flag in localStorage survives a reload even though React state doesn't, so its
    // presence here means the previous session never reached handleStopTrip.
    useEffect(() => {
        if (localStorage.getItem("liveTripActive")) {
            localStorage.removeItem("liveTripActive")
            toast.error("Your last trip was interrupted (likely by switching apps) and could not be saved.")
        }
    }, [])

    // Get user's current location on mount to prefill the start point
    useEffect(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            // position.coords.latitude and position.coords.longitude live here
            const latPos = position.coords.latitude
            const longPos = position.coords.longitude

            setCurrentPosition( { lat: latPos, lng: longPos} )
            setStartCoords( { lat: latPos, lng: longPos} )

            // Turns the raw coordinates into a readable address for display
            fetch(`${API_BASE_URL}/maps/reverse-geocode?lat=${latPos}&lng=${longPos}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            .then(res => {
                if (res.ok) return res.json()
                return null
            })
            .then(data => {
                if (data) setStartAddress(data.formatted_address)
            })
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
            // Bias results toward the user's actual position, so searching "Walmart"
            // surfaces the nearby one instead of one in a random city
            const biasParams = currentPosition
                ? `&lat=${currentPosition.lat}&lng=${currentPosition.lng}`
                : ""

            fetch(`${API_BASE_URL}/maps/autocomplete?input=${encodeURIComponent(query)}${biasParams}`, {
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

    // Elapsed timer — starts/resets with tracking state
    useEffect(() => {
        if (!isTracking) {
            setElapsedSeconds(0)
            return
        }
        const id = setInterval(() => setElapsedSeconds(s => s + 1), 1000)
        return () => clearInterval(id)
    }, [isTracking])

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
    // `freeRoam` is passed explicitly (rather than read from state) since the "Don't know?"
    // pill sets destinationCoords to null and calls this in the same tick - reading a just-set
    // state value here would still see the stale pre-update value due to React's batching
    function handleStartTrip(freeRoam = false) {
        // TODO: future Plan Mode - skip this fresh-position override and let the user's
        //       manually selected start location stand, for trips being planned ahead of time
        //       rather than tracked live
        setIsStartingTrip(true)

        navigator.geolocation.getCurrentPosition((position) => {
            const freshStart = { lat: position.coords.latitude, lng: position.coords.longitude }
            setStartCoords(freshStart)
            setCurrentPosition(freshStart)

            // Validation handling
            if (!vehicleId || (!destinationCoords && !freeRoam)) {
                toast.error("Please fill in all of the fields.")
                setIsStartingTrip(false)
                return
            }

            if (destinationCoords && haversineMiles(freshStart.lat, freshStart.lng, destinationCoords.lat, destinationCoords.lng) > RADIUS_CAP_MILES) {
                toast.error("Your destination is too far.")
                setIsStartingTrip(false)
                return
            }

            // Begins watching GPS position, everything here runs on every position update
            watchIdRef.current = navigator.geolocation.watchPosition((trackingPosition) => {
                const newPoint = { lat: trackingPosition.coords.latitude, lng: trackingPosition.coords.longitude }

                setCurrentPosition(newPoint)
                if (trackingPosition.coords.heading != null) setHeading(trackingPosition.coords.heading)

                // Updates the distance traveled - mirrored into a ref so a stale closure
                // (like the arrival/stray checks below, captured once at Start) can still
                // read the live total instead of whatever it was when tracking began
                if (lastPointRef.current) {
                    const segment = haversineMiles(lastPointRef.current.lat, lastPointRef.current.lng, newPoint.lat, newPoint.lng)
                    setDistance(prev => {
                        const next = prev + segment
                        distanceRef.current = next
                        return next
                    })
                }

                // Stores the new point for the live route drawn on the map
                lastPointRef.current = newPoint
                setPath(prev => [...prev, newPoint])

                // Skip all destination-based logic entirely when free-roaming with no destination set
                if (!destinationCoords) return

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

            startTimeRef.current = new Date().toISOString()
            localStorage.setItem("liveTripActive", "true")
            localStorage.setItem("liveTripStartTime", startTimeRef.current)

            // Keeps the screen from auto-locking while actively tracking
            navigator.wakeLock?.request("screen")
                .then(lock => { wakeLockRef.current = lock })
                .catch(() => {})

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
        localStorage.removeItem("liveTripActive")
        localStorage.removeItem("liveTripStartTime")

        wakeLockRef.current?.release()
        wakeLockRef.current = null

        // Discard locally with no API calls at all if there was no real movement, so
        // spamming Start/Stop in place can't run up reverse-geocode/trip-save requests
        if (distanceRef.current < MIN_TRIP_DISTANCE_MILES) {
            setPath([])
            setDistance(0)
            distanceRef.current = 0
            setDistanceToDestination(null)
            closestDistanceRef.current = null
            setClosestDistanceToDestination(null)
            setIsTracking(false)
            toast.info("Trip discarded - no distance traveled.")
            return
        }

        setIsSubmitting(true)

        // Use the ref, not the closured `currentPosition` state - same staleness risk as distance
        const finalPosition = lastPointRef.current || currentPosition

        const submitTrip = (endAddress) => {
            fetch(`${API_BASE_URL}/trips`, {
                method: "POST",
                headers: {
                    "Content-Type" : "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({
                    vehicle_id: vehicleId,
                    start_location: startAddress,
                    end_location: endAddress,
                    distance: distanceRef.current,
                    start_time: startTimeRef.current || localStorage.getItem("liveTripStartTime"),
                    end_time: new Date().toISOString()
                })
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
                    // Captures the route the user took
                    const capturedPath = path
                    if (capturedPath.length > 1) {
                        const encodedPolyline = polyline.encode(capturedPath.map(p => [p.lat, p.lng]))
                        const staticUrl = `https://maps.googleapis.com/maps/api/staticmap?size=600x400&path=enc:${encodedPolyline}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`

                        ;(async () => {
                            const imageBlob = await fetch(staticUrl).then(r => r.blob())

                            const { upload_url, object_key } = await fetch(`${API_BASE_URL}/trips/${data.id}/image-upload-url`, {
                                method: "POST",
                                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
                            }).then(r => r.json())

                            await fetch(upload_url, {
                                method: "PUT",
                                body: imageBlob,
                                headers: { "Content-Type": "image/png" }
                            })

                            await fetch(`${API_BASE_URL}/trips/${data.id}/image`, {
                                method: "PATCH",
                                headers: {
                                    "Content-Type": "application/json",
                                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                                },
                                body: JSON.stringify({ object_key })
                            })
                        })().catch((err) => { toast.error("Route image failed: " + err.message) })
                    }

                    // Empty the fields
                    setPath([])
                    setDistance(0)
                    distanceRef.current = 0
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

        // When arrived, the destination address is already known — no need to reverse-geocode
        if (reason === "arrived") {
            submitTrip(destinationAddress || null)
            return
        }

        // For manual stop or straying, reverse-geocode wherever the trip actually ended
        if (finalPosition) {
            fetch(`${API_BASE_URL}/maps/reverse-geocode?lat=${finalPosition.lat}&lng=${finalPosition.lng}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            .then(res => {
                if (res.ok) return res.json()
                return null
            })
            .then(data => {
                submitTrip(data ? data.formatted_address : null)
            })
            .catch(() => submitTrip(null)) // never let a failed reverse-geocode block the actual trip save
        } else {
            submitTrip(null)
        }
    }

    // Pans the map back to the live position, since panning to follow the user
    // isn't automatic once they've manually moved the map themselves
    function handleRecenter() {
        if (mapRef.current && currentPosition) {
            mapRef.current.panTo(currentPosition)
        }
    }

    const currentVehicle = vehicles.find(v => v.id === vehicleId)

    // Straight-line preview distance, shown before tracking starts so the user can see
    // roughly how far the trip is (and understand the radius cap) before committing
    const previewDistance = (startCoords && destinationCoords)
        ? haversineMiles(startCoords.lat, startCoords.lng, destinationCoords.lat, destinationCoords.lng)
        : null

    return (
        <div className="relative overflow-hidden h-full">
            {/* Full-bleed map */}
            {isLoaded ? (
                <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={currentPosition || { lat: 0, lng: 0 }}
                    zoom={14}
                    onLoad={(map) => { mapRef.current = map }}
                    options={{ disableDefaultUI: true }}
                >
                    {currentPosition && (
                        <Marker
                            position={currentPosition}
                            icon={isTracking ? {
                                path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                                scale: 6,
                                fillColor: "#2563EB",
                                fillOpacity: 1,
                                strokeColor: "#ffffff",
                                strokeWeight: 2,
                                rotation: heading ?? 0,
                            } : "https://maps.google.com/mapfiles/ms/icons/blue-dot.png"}
                        />
                    )}
                    {destinationCoords && <Marker position={destinationCoords} icon="https://maps.google.com/mapfiles/ms/icons/red-dot.png" />}
                    {path.length > 1 && <Polyline path={path} />}
                </GoogleMap>
            ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">Loading map...</div>
            )}

            {isTracking ? (
                /* Live stats panel, shown in place of the vehicle/route cards while tracking */
                <div className="absolute top-4 left-4 right-4 rounded-2xl bg-background shadow-lg px-4 py-4">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-xs font-bold text-primary uppercase tracking-wide">Tracking · {currentVehicle ? `${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}` : "Vehicle"}</span>
                    </div>
                    <div className="flex">
                        <div className="flex-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Traveled</p>
                            <p className={destinationCoords ? "text-2xl font-extrabold text-foreground mt-1" : "text-[32px] font-extrabold text-primary mt-1 leading-none"}>
                                {distance.toFixed(1)} <span className="text-sm text-muted-foreground font-semibold">mi</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                Duration · {String(Math.floor(elapsedSeconds / 60)).padStart(2, "0")}:{String(elapsedSeconds % 60).padStart(2, "0")}
                            </p>
                        </div>
                        {destinationCoords && (
                            <>
                                <div className="w-px bg-border" />
                                <div className="flex-1 pl-4">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">To destination</p>
                                    <p className="text-[32px] font-extrabold text-primary mt-1 leading-none">{distanceToDestination !== null ? `~${distanceToDestination.toFixed(1)}` : "—"} <span className="text-sm text-muted-foreground font-semibold">mi</span></p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            ) : (
                /* Floating vehicle selector + route card */
                <div className="absolute top-4 left-4 right-4 flex flex-col gap-2">
                    <div className="relative flex items-stretch rounded-2xl overflow-hidden bg-background shadow-lg">
                        <div className="px-3 py-2.5 flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Car size={16} className="text-primary" />
                            </div>
                            <div className="text-left">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Vehicle</p>
                                <p className="text-sm font-bold text-foreground">{currentVehicle ? `${currentVehicle.year} ${currentVehicle.make} ${currentVehicle.model}` : "Select a vehicle"}</p>
                            </div>
                        </div>
                        <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            <option value="">Select a vehicle</option>
                            {vehicles.map(v => (
                                <option key={v.id} value={v.id}>{v.year} {v.make} {v.model}</option>
                            ))}
                        </select>
                    </div>

                    <div className="rounded-2xl overflow-hidden bg-background shadow-lg">
                        {/* TODO: future Plan Mode - re-enable search on this field so users can plan
                            a trip from a location other than where they currently are. For live
                            tracking, start must always be the user's real position, so it stays
                            read-only for now. */}
                        <div className="flex items-center gap-3 px-3 py-3">
                            <span className="w-2.5 h-2.5 rounded-full bg-foreground shrink-0" />
                            <span className="text-sm font-semibold text-foreground truncate">{startAddress || "Current location"}</span>
                        </div>
                        <div className="h-px bg-border mx-3" />
                        <div className="flex items-center gap-3 px-3 py-2.5">
                            <span className="w-2.5 h-2.5 bg-primary shrink-0" />
                            <input placeholder="Where to?" value={destinationAddress} type="text"
                                onChange={(e) => { setDestinationAddress(e.target.value); setSearchTarget("destination"); handleAddressSearch(e.target.value) }}
                                onBlur={() => { setSearchTarget(null); setSearchResults([]) }}
                                className="flex-1 py-0 bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground placeholder:font-medium focus:outline-none" />
                            <button type="button" disabled={!isLoaded || !vehicleId || isStartingTrip}
                                onClick={() => {
                                    setDestinationCoords(null)
                                    setDestinationAddress("")
                                    setSearchResults([])
                                    handleStartTrip(true)
                                }}
                                className="h-[30px] px-[13px] rounded-[9px] bg-primary/10 text-primary text-[13px] font-bold cursor-pointer shrink-0 disabled:opacity-50 disabled:cursor-not-allowed">
                                Don't know?
                            </button>
                        </div>
                        {previewDistance !== null && (
                            <>
                                <div className="h-px bg-border mx-3" />
                                <div className="px-3 py-2">
                                    <span className="text-xs font-semibold text-muted-foreground">~{previewDistance.toFixed(1)} mi to destination</span>
                                </div>
                            </>
                        )}
                    </div>
                    {searchTarget === "destination" && searchResults.length > 0 && (
                        <div className="flex flex-col gap-1 bg-background rounded-2xl shadow-lg overflow-hidden">
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

            {/* Recenter button */}
            <button type="button" onClick={handleRecenter}
                className="absolute right-4 bottom-[104px] w-[46px] h-[46px] rounded-2xl bg-background shadow-lg flex items-center justify-center cursor-pointer">
                <LocateFixed size={20} className="text-primary" />
            </button>

            {/* Floating Start/Stop Trip button */}
            <div className="absolute bottom-8 left-4 right-4">
                {isTracking ? (
                    <button type="button" onClick={() => handleStopTrip("manual")} disabled={isSubmitting}
                        className="w-full h-[58px] rounded-2xl bg-foreground text-background flex items-center justify-center gap-2 font-bold text-base cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg">
                        <Square size={16} fill="currentColor" />
                        {isSubmitting ? "Saving..." : "Stop trip"}
                    </button>
                ) : (
                    <button type="button" onClick={() => handleStartTrip(false)} disabled={!isLoaded || !vehicleId || !destinationCoords || isStartingTrip}
                        className="w-full h-[58px] rounded-2xl bg-primary text-primary-foreground flex items-center justify-center gap-2 font-bold text-base cursor-pointer hover:opacity-90 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                        <Navigation size={16} fill="currentColor" />
                        {isStartingTrip ? "Starting..." : "Start trip"}
                    </button>
                )}
            </div>
        </div>
    )
}

export default LiveTrip
