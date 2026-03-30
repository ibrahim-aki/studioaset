"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "CLIENT_ADMIN" | "CLIENT_OPERATOR" | "HQ_ADMIN" | null;

interface AppUser {
    uid: string;
    email: string | null;
    role: UserRole; // Tetap simpan sebagai primary role (backward compatibility)
    roles: UserRole[]; // List semua role yang dimiliki
    name?: string;
    companyId?: string;
    companyName?: string;
    locationId?: string;
    locationIds?: string[];
    locationName?: string;
    phone?: string;
    lastSessionId?: string;
    needsPasswordChange?: boolean;
}

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, logout: () => { } });

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AppUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubDoc: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (unsubDoc) {
                unsubDoc();
                unsubDoc = null;
            }

            if (firebaseUser) {
                const userDocRef = doc(db, "users", firebaseUser.uid);

                // Use onSnapshot for real-time profile updates (Role, Company, etc)
                unsubDoc = onSnapshot(userDocRef, (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();

                        const rawRole = data.role?.toUpperCase() || "";
                        const rawRoles: string[] = Array.isArray(data.roles) ? data.roles : (data.role ? [data.role] : []);

                        const normalizeRole = (r: string): UserRole => {
                            const upper = r.toUpperCase();
                            if (upper.includes("SUPER") && upper.includes("ADMIN")) return "SUPER_ADMIN";
                            if (upper === "ADMIN STUDIO" || upper === "ADMIN" || upper === "STUDIO ADMIN") return "ADMIN";
                            if (upper.includes("CLIENT") && upper.includes("ADMIN")) return "CLIENT_ADMIN";
                            if (upper.includes("CLIENT") && upper.includes("OPERATOR")) return "CLIENT_OPERATOR";
                            if (upper === "OPERATOR") return "OPERATOR";
                            if (upper === "HQ_ADMIN" || upper.includes("KANTOR PUSAT") || upper.includes("HQ ADMIN")) return "HQ_ADMIN";
                            return upper.replace(/\s+/g, '_') as UserRole;
                        };

                        const normalizedRoles = Array.from(new Set(rawRoles.map(normalizeRole).filter(Boolean))) as UserRole[];
                        const primaryRole = normalizedRoles[0] || null;

                        // Safety check: Don't login if no valid roles found
                        if (normalizedRoles.length === 0) {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                role: null,
                                roles: [],
                            });
                            setLoading(false);
                            return;
                        }

                        // AUTO-SYNC COMPANY ID Logic
                        let finalCompanyId = data.companyId || "";
                        const needsSync = normalizedRoles.some(r => ["ADMIN", "OPERATOR", "CLIENT_ADMIN", "CLIENT_OPERATOR", "HQ_ADMIN"].includes(r || ""));

                        if (!finalCompanyId && needsSync) {
                            const cachedId = localStorage.getItem("last_known_company_id");
                            if (cachedId) {
                                finalCompanyId = cachedId;
                                updateDoc(userDocRef, { companyId: cachedId }).catch(e => console.error("Auto-sync failed:", e));
                            }
                        }

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: primaryRole,
                            roles: normalizedRoles,
                            name: data.name || "",
                            companyId: finalCompanyId,
                            companyName: data.companyName || "",
                            locationId: data.locationId || "",
                            locationIds: data.locationIds || (data.locationId ? [data.locationId] : []),
                            locationName: data.locationName || "",
                            phone: data.phone || "",
                            lastSessionId: data.lastSessionId || "",
                            needsPasswordChange: data.needsPasswordChange || false,
                        });
                    } else {
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: null,
                            roles: [],
                        });
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("User doc listener error:", error);
                    setLoading(false);
                });
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubDoc) unsubDoc();
        };
    }, []);

    // Monitor session mismatch
    useEffect(() => {
        if (user && user.role) {
            const userDocRef = doc(db, "users", user.uid);

            const unsub = onSnapshot(userDocRef, (snap) => {
                // Skip snapshots from local cache to avoid stale data alerts
                if (snap.metadata.fromCache) return;

                if (snap.exists()) {
                    const cloudSessionId = snap.data().lastSessionId;
                    const localSessionId = localStorage.getItem("studio_session_id");

                    // LOGIC: 
                    // 1. Only trigger if BOTH IDs exist
                    // 2. Only trigger if cloud ID has changed to something OTHER than our current session
                    // 3. Ignore if cloud ID is empty (means no active session restriction)
                    if (cloudSessionId && localSessionId && cloudSessionId !== localSessionId) {
                        // Additional safety: If we just logged in (within last 3 seconds), 
                        // verify we aren't seeing our own previous write
                        if (!snap.metadata.hasPendingWrites) {

                            // Cek jika cloudSessionId baru saja di-generate di perangkat lain (ini ditandakan
                            // dengan perbedaan waktu sejak login atau penulisan ID).
                            // Karena saat login, kita menghapus localSessionId sesaat sebelum Firebase onAuthStateChanged
                            // terpanggil, kita beri jeda sebentar agar context tidak buru-buru menendang user 
                            // sebelum `updateDoc` di halaman login selesai.
                            setTimeout(() => {
                                const currentLocalSessionId = localStorage.getItem("studio_session_id");
                                if (cloudSessionId !== currentLocalSessionId) {
                                    alert("Sesi Anda berakhir karena login di perangkat lain.");
                                    logout();
                                }
                            }, 2000); // Beri delay 2 detik untuk memastikan penulisan selesai
                        }
                    }
                }
            });
            return () => unsub();
        }
    }, [user?.uid, user?.role]);

    const logout = async () => {
        try {
            setUser(null);
            localStorage.removeItem("studio_session_id");
            await auth.signOut();
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
