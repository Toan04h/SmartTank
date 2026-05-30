import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from 'sonner'

function Login() {
    const [seePassword, setSeePassword] = useState(false)
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const navigate = useNavigate()

    // Sends information to backend
    const handleSubmit = async (e) => {
        e.preventDefault() // stop refresh

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
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-card border border-border rounded-xl shadow-sm p-12 w-full max-w-lg">
                <h1 className="text-4xl font-bold text-foreground">Login</h1>
                {/* Email Field */}
                <input
                    type="email"
                    placeholder="Enter your email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                />
                {/* Password Field */}
                <div className="relative">
                    <input
                        type={seePassword ? "text" : "password"}
                        placeholder="Enter your password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-4 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
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
                    className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-lg cursor-pointer"
                >
                    Login
                </button>
            </form>
        </div>
    )
}

export default Login
