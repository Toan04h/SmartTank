import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { TrackingProvider, useTracking } from '../context/TrackingContext'

// Split from AppLayout so this can read the tracking state the provider below renders -
// a component can't consume a context it's also providing
function AppLayoutContent() {
    const { isTracking } = useTracking()

    return (
        <div className="flex flex-col h-dvh bg-background overflow-hidden">
            <main className={`flex-1 overflow-hidden ${isTracking ? "" : "pb-20"}`}>
                <Outlet />
            </main>
            <BottomNav />
        </div>
    )
}

function AppLayout() {
    return (
        <TrackingProvider>
            <AppLayoutContent />
        </TrackingProvider>
    )
}

export default AppLayout
