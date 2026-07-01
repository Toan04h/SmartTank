import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LogOut, Eye, EyeOff } from "lucide-react"
import { API_BASE_URL } from "../api/config"
import { toast } from "sonner"

// TODO: Maybe add photo support
//       Fix changing password once API for users/password is added

function Profile() {
    const navigate = useNavigate()
    const email = localStorage.getItem("email")
    const [fullName, setFullName] = useState("")
    const [state, setState] = useState("")
    const [zipCode, setZipCode] = useState("")
    const [isEditing, setIsEditing] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [originalFullName, setOriginalFullName] = useState("")
    const [originalState, setOriginalState] = useState("")
    const [originalZipCode, setOriginalZipCode] = useState("")

    const [isChangingPassword, setIsChangingPassword] = useState(false)
    const [currentPassword, setCurrentPassword] = useState("")
    const [newPassword, setNewPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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

    // Closes the password editor without saving
    function handleCancelPasswordChange() {
        setIsChangingPassword(false)
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setShowCurrentPassword(false)
        setShowNewPassword(false)
        setShowConfirmPassword(false)
    }

    function handleChangePassword(e) {
        e.preventDefault()

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.")
            return
        }

        setIsSubmitting(true)

        fetch(`${API_BASE_URL}/users/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            },
            body: JSON.stringify({
                old_password: currentPassword, new_password: newPassword
            })
        })
        .then(res => {
            if (res.ok) {
                toast.success("Password changed successfully.")
                handleCancelPasswordChange()
            } else {
                toast.error("Could not change password. Check your current password and try again.")
            }
            setIsSubmitting(false)
        })
        .catch(() => {
            toast.error("Could not change password.")
            setIsSubmitting(false)
        })
    }

    // Clears the user's session and sends them back to login
    function handleLogout() {
        localStorage.removeItem("token")
        localStorage.removeItem("email")
        navigate("/login")
    }

    return (
        <div className="flex flex-col h-full overflow-x-hidden">
            {/* Cover banner */}
            <div className="relative bg-gradient-to-br from-primary to-[#4F8BFF] h-[168px] shrink-0">
                {/* TODO: BLOCKED - no profile picture field on backend, this is purely visual.
                    Avatar sits half on the banner, half on the white card below. Shows the
                    user's initial on a tinted circle until photo support exists. */}
                <div className="absolute left-1/2 -translate-x-1/2 -bottom-12 w-[100px] h-[100px] rounded-full bg-gradient-to-br from-[#EAF0FD] to-[#D7E3FB] border-4 border-background flex items-center justify-center">
                    <span className="text-4xl font-extrabold text-primary">{(fullName || email)?.[0]?.toUpperCase() || "?"}</span>
                </div>
            </div>

            <div className="flex flex-col gap-3 px-4 pt-14 pb-6 flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">

                {/* Name + email header */}
                <div className="text-center mb-1">
                    <p className="text-[22px] font-extrabold text-foreground">{fullName || "Your Name"}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{email}</p>
                </div>

                {/* Profile info - inline edit */}
                <form onSubmit={handleSubmit} className="bg-card rounded-2xl shadow-sm p-4 flex flex-col gap-3">
                    <div className="flex flex-row justify-between items-center">
                        <p className="text-base font-bold text-foreground">Profile info</p>
                        {!isEditing && (
                            <button type="button" onClick={() => { setOriginalFullName(fullName); setOriginalState(state); setOriginalZipCode(zipCode); setIsEditing(true)} }
                                className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-sm font-bold cursor-pointer">Edit</button>
                        )}
                    </div>

                    {isEditing ? (
                        <>
                            <input placeholder="Full Name" value={fullName} type="text" onChange={(e) => setFullName(e.target.value)}
                                className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                            <input placeholder="State" value={state} type="text" onChange={(e) => setState(e.target.value)}
                                className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                            <input placeholder="Zip Code" value={zipCode} type="text" onChange={(e) => setZipCode(e.target.value)}
                                className="px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                            <div className="flex flex-row gap-3">
                                <button type="button" onClick={handleCancel} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground font-bold cursor-pointer">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? "Saving..." : "Save"}
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="flex items-center justify-between py-1">
                                <p className="text-sm text-muted-foreground">Full name</p>
                                <p className="text-[15px] font-bold text-foreground">{fullName || "—"}</p>
                            </div>
                            <div className="h-px bg-border" />
                            <div className="flex items-center justify-between py-1">
                                <p className="text-sm text-muted-foreground">State</p>
                                <p className="text-[15px] font-bold text-foreground">{state || "—"}</p>
                            </div>
                            <div className="h-px bg-border" />
                            <div className="flex items-center justify-between py-1">
                                <p className="text-sm text-muted-foreground">Zip code</p>
                                <p className="text-[15px] font-bold text-foreground">{zipCode || "—"}</p>
                            </div>
                        </>
                    )}
                </form>

                {/* Password - inline edit */}
                <div className="bg-card rounded-2xl shadow-sm p-4">
                    <div className="flex flex-row justify-between items-center mb-1">
                        <p className="text-base font-bold text-foreground">Password</p>
                        {!isChangingPassword && (
                            <button type="button" onClick={() => setIsChangingPassword(true)}
                                className="px-3 py-1.5 rounded-lg border border-border text-foreground text-sm font-bold cursor-pointer">Change</button>
                        )}
                    </div>

                    {isChangingPassword ? (
                        <form onSubmit={handleChangePassword} className="flex flex-col gap-3 mt-2">
                            <div className="relative">
                                <input placeholder="Current password" value={currentPassword} type={showCurrentPassword ? "text" : "password"} onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-11 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                                <button type="button" onClick={() => setShowCurrentPassword(!showCurrentPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                                    {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative">
                                <input placeholder="New password" value={newPassword} type={showNewPassword ? "text" : "password"} onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-11 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="relative">
                                <input placeholder="Confirm new password" value={confirmPassword} type={showConfirmPassword ? "text" : "password"} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 pr-11 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none" />
                                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground cursor-pointer">
                                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            <div className="flex flex-row gap-3">
                                <button type="button" onClick={handleCancelPasswordChange} className="flex-1 h-11 rounded-xl bg-secondary text-muted-foreground font-bold cursor-pointer">Cancel</button>
                                <button type="submit" disabled={isSubmitting} className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-bold cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">{isSubmitting ? "Saving..." : "Save"}</button>
                            </div>
                        </form>
                    ) : (
                        <div className="mt-1">
                            <p className="text-sm text-muted-foreground">Current password</p>
                            <p className="text-lg font-extrabold text-foreground tracking-widest mt-1">••••••••</p>
                        </div>
                    )}
                </div>

                <button type="button" onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 h-[50px] rounded-2xl bg-card border-[1.5px] border-[#F4D5D6] text-destructive font-bold cursor-pointer shadow-sm">
                    <LogOut size={18} /> Log out
                </button>

            </div>
        </div>
    )
}

export default Profile
