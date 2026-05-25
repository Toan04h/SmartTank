import { Outlet } from 'react-router-dom'
import BottomNav from '../components/BottomNav'

function AppLayout() {
    return (
        <div className="flex flex-col min-h-screen bg-background">
            <main className="flex-1 pb-16">
                <Outlet />
            </main>
            <BottomNav />
        </div>
    )
}

export default AppLayout
