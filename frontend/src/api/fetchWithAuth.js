import { API_BASE_URL } from "./config"

export async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem("token")
    const authOpts = {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${token}`
        }
    }

    let res = await fetch(url, authOpts)

    if (res.status !== 401) return res

    const refreshToken = localStorage.getItem("refresh_token")
    if (!refreshToken) {
        clearSessionAndRedirect()
        return res
    }

    const refreshRes = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken })
    })

    if (!refreshRes.ok) {
        clearSessionAndRedirect()
        return res
    }

    const { access_token } = await refreshRes.json()
    localStorage.setItem("token", access_token)

    return fetch(url, {
        ...options,
        headers: {
            ...options.headers,
            "Authorization": `Bearer ${access_token}`
        }
    })
}

export function logout() {
    const refreshToken = localStorage.getItem("refresh_token")
    if (refreshToken) {
        fetch(`${API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: refreshToken })
        }).catch(() => {})
    }
    clearSessionAndRedirect()
}

function clearSessionAndRedirect() {
    localStorage.removeItem("token")
    localStorage.removeItem("refresh_token")
    localStorage.removeItem("email")
    window.location.href = "/login"
}
