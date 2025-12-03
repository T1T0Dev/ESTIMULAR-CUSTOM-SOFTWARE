import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import axios from "axios";
import API_BASE_URL from "../constants/api";

const applyAuthHeader = (token) => {
    if (token) {
        axios.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
        delete axios.defaults.headers.common.Authorization;
    }
};

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutos antes del vencimiento
const RETRY_DELAY_MS = 60 * 1000; // reintento en caso de error temporal
let refreshTimerId = null;
let refreshPromise = null;

const decodeTokenPayload = (token) => {
    if (!token || typeof token !== "string") return null;
    const parts = token.split(".");
    if (parts.length < 2) return null;
    try {
        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4 || 4)) % 4), "=");
        const decode = typeof atob === "function"
            ? atob
            : (value) => Buffer.from(value, "base64").toString("binary");
        const json = decode(padded);
        return JSON.parse(json);
    } catch (_err) {
        return null;
    }
};

const getTokenExpirationMs = (token) => {
    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return null;
    const expMs = Number(payload.exp) * 1000;
    return Number.isFinite(expMs) ? expMs : null;
};

function clearRefreshTimer() {
    if (refreshTimerId) {
        clearTimeout(refreshTimerId);
        refreshTimerId = null;
    }
}

function scheduleTokenRefresh(token) {
    clearRefreshTimer();
    if (!token) return;
    const expirationMs = getTokenExpirationMs(token);
    if (!expirationMs) return;

    const triggerAt = expirationMs - REFRESH_BUFFER_MS;
    const delay = triggerAt - Date.now();

    if (delay <= 0) {
        refreshAuthToken();
        return;
    }

    refreshTimerId = setTimeout(() => {
        refreshAuthToken();
    }, delay);
}

async function refreshAuthToken() {
    if (refreshPromise) return refreshPromise;

    const state = useAuthStore?.getState ? useAuthStore.getState() : null;
    const activeToken = state?.token;
    if (!activeToken) return null;

    refreshPromise = axios
        .post(`${API_BASE_URL}/api/login/refresh`)
        .then((response) => {
            const payload = response?.data || {};
            const { token: newToken, user, profile, needsProfile } = payload;
            if (!newToken) {
                return null;
            }

            const currentState = useAuthStore.getState();
            currentState.setAuth({
                token: newToken,
                user,
                profile,
                needsProfile,
            });
            return newToken;
        })
        .catch((error) => {
            const status = error?.response?.status;
            if (status === 401 || status === 403) {
                useAuthStore.getState().clearAuth();
            } else {
                console.error("Error al refrescar el token", error);
                clearRefreshTimer();
                refreshTimerId = setTimeout(() => {
                    refreshAuthToken();
                }, RETRY_DELAY_MS);
            }
            return null;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

const useAuthStore = create(
    persist(
        (set) => ({
            token: null,
            user: null,
            profile: null,
            needsProfile: false,
            setAuth: ({ token, user, profile, needsProfile } = {}) => {
                set((state) => {
                    const nextToken = token !== undefined ? token : state.token;
                    const normalizedToken = nextToken ?? null;

                    applyAuthHeader(normalizedToken);
                    scheduleTokenRefresh(normalizedToken);

                    return {
                        token: normalizedToken,
                        user: user !== undefined ? (user ?? null) : state.user,
                        profile: profile !== undefined ? (profile ?? null) : state.profile,
                        needsProfile:
                            needsProfile !== undefined ? !!needsProfile : state.needsProfile,
                    };
                });
            },
            updateProfile: (profileDelta) => {
                set((state) => ({
                    profile: state.profile
                        ? { ...state.profile, ...profileDelta }
                        : { ...profileDelta },
                }));
            },
            setProfile: (profile) => set(() => ({ profile: profile ?? null })),
            setUser: (user) => set(() => ({ user: user ?? null })),
            updateUser: (userDelta) => {
                if (!userDelta) return;
                set((state) => ({
                    user: state.user
                        ? { ...state.user, ...userDelta }
                        : { ...userDelta },
                }));
            },
            setNeedsProfile: (value) => set(() => ({ needsProfile: value })),
            clearAuth: () => {
                clearRefreshTimer();
                applyAuthHeader(null);
                set(() => ({ token: null, user: null, profile: null, needsProfile: false }));
            },
            refreshTokenNow: async () => refreshAuthToken(),
        }),
        {
            name: "estimular-auth",
            storage:
                typeof window !== "undefined"
                    ? createJSONStorage(() => window.localStorage)
                    : undefined,
            partialize: (state) => ({
                token: state.token,
                user: state.user,
                profile: state.profile,
                needsProfile: state.needsProfile,
            }),
            onRehydrateStorage: () => (state) => {
                if (state?.token) {
                    applyAuthHeader(state.token);
                    scheduleTokenRefresh(state.token);
                }
            },
        }
    )
);

export default useAuthStore;

// Add axios interceptor to handle 401 errors
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            // Clear auth on 401 errors with a small delay to prevent flashing
            setTimeout(() => {
                useAuthStore.getState().clearAuth();
            }, 100);
        }
        return Promise.reject(error);
    }
);
