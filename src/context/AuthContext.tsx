"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "SUPER_ADMIN" | "ADMIN" | "OPERATOR" | null;

interface AppUser {
    uid: string;
    email: string | null;
    role: UserRole;
    name?: string;
    companyId?: string;
    companyName?: string;
    locationId?: string;
    locationName?: string;
    isDemo?: boolean;
    phone?: string;
    lastSessionId?: string;
}

interface AuthContextType {
    user: AppUser | null;
    loading: boolean;
    triggerDemoLogin?: (role: UserRole) => void;
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

                        // Safety check: Don't login if role is missing (corrupted doc)
                        if (!data.role) {
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                role: null,
                                isDemo: false,
                            });
                            setLoading(false);
                            return;
                        }

                        // AUTO-SYNC COMPANY ID Logic
                        let finalCompanyId = data.companyId || "";
                        if (!finalCompanyId && (data.role === "ADMIN" || data.role === "OPERATOR")) {
                            const cachedId = localStorage.getItem("last_known_company_id");
                            if (cachedId) {
                                finalCompanyId = cachedId;
                                // Auto-repair in Firestore if missing
                                updateDoc(userDocRef, { companyId: cachedId }).catch(e => console.error("Auto-sync failed:", e));
                            }
                        }

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: data.role as UserRole,
                            name: data.name || "",
                            companyId: finalCompanyId,
                            companyName: data.companyName || "",
                            locationId: data.locationId || "",
                            locationName: data.locationName || "",
                            phone: data.phone || "",
                            lastSessionId: data.lastSessionId || "",
                            isDemo: false,
                        });
                    } else {
                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: null,
                            isDemo: false,
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
        if (user && !user.isDemo && user.role) {
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

    // Fungsi khusus untuk Demo
    const triggerDemoLogin = (role: UserRole) => {
        setUser({
            uid: "demo-user-123",
            email: `demo-${role?.toLowerCase()}@studio.com`,
            role: role,
            name: `Demo ${role}`,
            locationName: "Demo Branch",
            phone: "08123456789",
            isDemo: true,
        });
    };

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
        <AuthContext.Provider value={{ user, loading, triggerDemoLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
