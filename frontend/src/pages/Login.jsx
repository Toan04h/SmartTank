import { useState } from "react"
import { Eye, EyeOff, X } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from 'sonner'
import { API_BASE_URL } from "../api/config"

const DEMO_EMAIL = "demo@gmail.com"
const DEMO_PASSWORD = "demodemo"

function Login() {
    const [seePassword, setSeePassword] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showDemoBanner, setShowDemoBanner] = useState(true)
    const navigate = useNavigate()

    // Sends information to backend
    const handleSubmit = async (e) => {
        e.preventDefault() // stop refresh

        setIsSubmitting(true)

        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })

        // Usable info for frontend
        const data = await response.json()

        // Redirect user to dashboard on success
        if (response.ok) {
            localStorage.setItem("token", data.access_token)

            // Get's user's email to be displayed
            const profileResponse = await fetch(`${API_BASE_URL}/users/profile`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${data.access_token}` }
            })
            const profile = await profileResponse.json()
            localStorage.setItem("email", profile.email)

            toast.success("Login successful!")
            navigate("/")
        } else {
            toast.error(data.detail)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-background">
            <div className="bg-primary px-6 pt-12 pb-8 shrink-0">
                <h1 className="text-4xl font-bold text-primary-foreground">Welcome back</h1>
                <p className="text-base text-primary-foreground/70 mt-1">Log in to continue</p>
            </div>
            <div className="flex flex-col flex-1 justify-start pt-10 px-6">
                {showDemoBanner && (
                    <div className="flex items-start justify-between bg-card border border-border rounded-xl px-4 py-3 mb-5">
                        <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">Demo account</p>
                            <p className="text-sm text-foreground"><span className="text-muted-foreground">Email:</span> {DEMO_EMAIL}</p>
                            <p className="text-sm text-foreground"><span className="text-muted-foreground">Password:</span> {DEMO_PASSWORD}</p>
                        </div>
                        <button type="button" onClick={() => setShowDemoBanner(false)} className="text-muted-foreground hover:text-foreground cursor-pointer mt-0.5">
                            <X size={16} />
                        </button>
                    </div>
                )}
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Email Field */}
                    <input
                        type="email"
                        placeholder="Enter your email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-4 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                    />
                    {/* Password Field */}
                    <div className="relative">
                        <input
                            type={seePassword ? "text" : "password"}
                            placeholder="Enter your password..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-4 pr-10 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setSeePassword(!seePassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            {seePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? "Logging in..." : "Login"}
                    </button>
                    <div className="relative text-sm text-muted-foreground">
                        Don't have an account? <Link to="/register" className="text-primary">Sign up</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Login
