import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { TrackingProvider } from '../context/TrackingContext'

function AppLayout() {
    return (
        <TrackingProvider>
            <div className="flex flex-col h-dvh bg-background overflow-hidden">
                <main className="flex-1 min-h-0 overflow-hidden">
                    <Outlet />
                </main>
                <BottomNav />
            </div>
        </TrackingProvider>
    )
}

export default AppLayout
