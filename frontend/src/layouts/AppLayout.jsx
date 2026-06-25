import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { TrackingProvider } from '../context/TrackingContext'

function AppLayout() {
    return (
        <TrackingProvider>
            <div className="flex flex-col min-h-screen bg-background">
                <main className="flex-1 pb-20">
                    <Outlet />
                </main>
                <BottomNav />
            </div>
        </TrackingProvider>
    )
}

export default AppLayout
