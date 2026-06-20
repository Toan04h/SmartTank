import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useNavigate, Link } from "react-router-dom"
import { toast } from 'sonner'
import { API_BASE_URL } from "../api/config"

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

        if (password.length < 8) {
            toast.error("Password is not 8 characters or more")
            return
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match")
            return
        }

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
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
        <div className="flex flex-col h-screen bg-background">
            <div className="bg-primary px-6 pt-12 pb-8 shrink-0">
                <h1 className="text-4xl font-bold text-primary-foreground">Create account</h1>
                <p className="text-base text-primary-foreground/70 mt-1">Sign up to get started</p>
            </div>
            <div className="flex flex-col flex-1 justify-start pt-10 px-6">
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Email Field */}
                    <input
                        type="email"
                        placeholder="Enter in an email..."
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-4 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                    />
                    {/* Password Field */}
                    <div className="relative">
                        <input
                            type={seePassword ? "text" : "password"}
                            placeholder="Enter in a password..."
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
                    {/* Confirm Password Field */}
                    <div className="relative">
                        <input
                            type={seeConfirm ? "text" : "password"}
                            placeholder="Enter in the same password..."
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-4 pr-10 rounded-lg border border-transparent bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-lg"
                        />
                        <button
                            type="button"
                            onClick={() => setSeeConfirm(!seeConfirm)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            {seeConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>
                    {/* Error Text */}
                    {confirmPassword && password !== confirmPassword && (<p className="text-red-500 text-sm">Passwords do not match</p>)}
                    {password.length > 0 && password.length < 8 && (<p className="text-red-500 text-sm">Password must be 8 characters or longer</p>)}
                    {/* Submit Button */}
                    <button
                        type="submit"
                        className="w-full py-4 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity text-lg cursor-pointer"
                    >
                        Register
                    </button>
                    <div className="relative text-sm text-muted-foreground">
                        Already have an account? <Link to="/login" className="text-primary">Log in</Link>
                    </div>
                </form>
            </div>
        </div>
    )
}

export default Register