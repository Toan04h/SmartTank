import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"

// TODO: Maybe add photo support
//       Fix changing password once API for users/password is added

function Profile() {
    const navigate = useNavigate()
    const [fullName, setFullName] = useState("")
    const [state, setState] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [originalFullName, setOriginalFullName] = useState("")
    const [originalState, setOriginalState] = useState("")
    const [originalZipCode, setOriginalZipCode] = useState("")

    // Fetch user's profile
    useEffect(() => {
        fetch(`${API_BASE_URL}/users/profile`, {
            headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        })
        .then(res => {
            if (res.ok) return res.json()
            return null
        })
        .then(data => {
            setFullName(data.full_name || "")
            setState(data.state || "")
            setZipCode(data.zip_code || "")
        })
    }, [])

    // Updates user's info based on their changes
    function handleSubmit(e) {
        e.preventDefault()

        setIsSubmitting(true)

        if (state.length > 2) {
            toast.error("Please put the abbreviation for your state.")
            setIsSubmitting(false)
            return
        }

        if ( !(5 <= zipCode.length && zipCode.length <= 10) ){
            toast.error("Please enter in the right digits for the zip code (i.e. 5 or 9).")
            setIsSubmitting(false)
            return
        }

        fetch(`${API_BASE_URL}/users/profile`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
                full_name: fullName, state: state, zip_code: zipCode
            })
        })
        .then(res => {
            if (res.ok) {
                toast.success("Successfully updated user's profile.")
                setIsEditing(false)
                setIsSubmitting(false)
            } else {
                toast.error("Could not update user's profile")
                setIsSubmitting(false)
                return null
            }})
    }

    // Reverts user's changes if they press the cancel button
    function handleCancel() {
        setIsEditing(false)
        setFullName(originalFullName)
        setZipCode(originalZipCode)
        setState(originalState)
    }

    // Clears the user's session and sends them back to login
    function handleLogout() {
        localStorage.removeItem("token")
        localStorage.removeItem("email")
        navigate("/login")
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] overflow-x-hidden">
            {/* Cover banner */}
            <div className="relative bg-primary h-16 shrink-0">
                {/* TODO: BLOCKED - no profile picture field on backend, this is purely visual.
                    Avatar sits half on the banner, half on the white card below */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-10 w-20 h-20 rounded-full bg-secondary border-4 border-background" />
            </div>

            <div className="flex flex-col gap-4 px-4 pt-10 pb-6 flex-1 overflow-y-auto">

                {/* Name header */}
                <div>
                    <p className="text-2xl font-bold text-foreground text-center">{fullName || "Your Name"}</p>
                </div>

                {/* Profile info - inline edit */}
                <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-4 flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center">
                        <p className="text-base font-semibold text-primary">Profile Info</p>
                        {!isEditing && (
                            <button type="button" onClick={() => { setOriginalFullName(fullName); setOriginalState(state); setOriginalZipCode(zipCode); setIsEditing(true)} } className="text-base text-primary font-medium cursor-pointer">Edit</button>
                        )}
                    </div>

                    {isEditing ? (
                        <>
                            <input placeholder="Full Name" value={fullName} type="text" onChange={(e) => setFullName(e.target.value)}
                                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                            <input placeholder="State" value={state} type="text" onChange={(e) => setState(e.target.value)}
                                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                            <input placeholder="Zip Code" value={zipCode} type="text" onChange={(e) => setZipCode(e.target.value)}
                                className="px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                            <div className="flex flex-row gap-3">
                                <button type="submit" disabled={isSubmitting} className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-semibold cursor-pointer hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" onClick={handleCancel} className="flex-1 py-3 rounded-lg border border-border text-foreground cursor-pointer hover:bg-secondary">Cancel</button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div>
                                <p className="text-sm text-muted-foreground">Full Name</p>
                                <p className="text-lg text-foreground">{fullName || "—"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">State</p>
                                <p className="text-lg text-foreground">{state || "—"}</p>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Zip Code</p>
                                <p className="text-lg text-foreground">{zipCode || "—"}</p>
                            </div>
                        </>
                    )}
                </form>

                {/* TODO: BLOCKED - no password change endpoint exists on backend */}
                <div className="bg-card rounded-xl border border-border p-4 flex flex-col gap-2">
                    <p className="text-base font-semibold text-primary">Password</p>
                    <p className="text-base text-muted-foreground">Changing password is not yet supported.</p>
                </div>

                <button type="button" onClick={handleLogout} className="flex items-center justify-center gap-2 py-3 rounded-lg border border-border text-foreground cursor-pointer hover:bg-secondary">
                    <LogOut size={18} /> Logout
                </button>

            </div>
        </div>
    )
}

export default Profile
