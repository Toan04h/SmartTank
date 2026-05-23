import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from 'sonner'

function Register() {
    const [seePassword, setSeePassword] = useState(false)
    const [seeConfirm, setSeeConfirm] = useState(false)
    const [confirmPassword, setConfirmPassword] = useState("")
    const [password, setPassword] = useState("")
    const [email, setEmail] = useState("")
    const navigate = useNavigate()

    // Sends information to backend
    const handleSubmit = async (e) => {
        e.preventDefault() // stop refresh

        const response = await fetch("http://localhost:8000/auth/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password })
        })

        // Usable info for frontend
        const data = await response.json()

        // Redirect user to login on success
        if (response.ok) {
            toast.success("Account creation successful!")
            navigate("/login")
        } else {
            toast.error(data.detail)
        }
    }

    return (
        <div className="flex items-center justify-center h-screen bg-background">
            <form onSubmit={handleSubmit} className="flex flex-col gap-5 bg-card border border-border rounded-xl shadow-sm p-12 w-full max-w-lg">
                <h1 className="text-4xl font-bold text-foreground">Register</h1>
                {/* Email Field */}
                <input
                    type="email"
                    placeholder="Enter in an email..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-4 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                />
                {/* Password Field */}
                <div className="relative">
                    <input
                        type={seePassword ? "text" : "password"}
                        placeholder="Enter in a password..."
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-4 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                    />
                    <button
                        type="button"
                        onClick={() => setSeePassword(!seePassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {seePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {/* Confirm Password Field */}
                <div className="relative">
                    <input
                        type={seeConfirm ? "text" : "password"}
                        placeholder="Enter in the same password..."
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-4 pr-10 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                    />
                    <button
                        type="button"
                        onClick={() => setSeeConfirm(!seeConfirm)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {seeConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                </div>
                {/* Error Text */}
                {confirmPassword && password !== confirmPassword && (<p className="text-red-500 text-sm">Passwords do not match</p>)}
                {/* Submit Button */}
                <button
                    type="submit"
                    className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-lg"
                >
                    Register
                </button>
            </form>
        </div>
    )
}

export default Register