import { createContext, useContext, useState } from "react"

const TrackingContext = createContext(null)

// Shared between LiveTrip (sets this) and BottomNav (reads this) so the nav
// bar can hide itself while a trip is actively being tracked, since they
// don't have a parent/child relationship to pass this through props.
export function TrackingProvider({ children }) {
    const [isTracking, setIsTracking] = useState(false)

    return (
        <TrackingContext.Provider value={{ isTracking, setIsTracking }}>
            {children}
        </TrackingContext.Provider>
    )
}

export function useTracking() {
    return useContext(TrackingContext)
}
