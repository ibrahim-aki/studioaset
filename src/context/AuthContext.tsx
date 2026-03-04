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
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
            if (firebaseUser) {
                try {
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();

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

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role: data.role as UserRole,
                            name: data.name || "",
                            companyId: data.companyId || "",
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
                } catch (error) {
                    console.error("Auth initialization error:", error);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Monitor session mismatch
    useEffect(() => {
        if (user && !user.isDemo && user.role) {
            const userDocRef = doc(db, "users", user.uid);
            const localSessionId = localStorage.getItem("studio_session_id");

            const unsub = onSnapshot(userDocRef, (snap) => {
                if (snap.exists() && !snap.metadata.hasPendingWrites) {
                    const cloudSessionId = snap.data().lastSessionId;
                    if (cloudSessionId && localSessionId && cloudSessionId !== localSessionId) {
                        alert("Sesi Anda berakhir karena login di perangkat lain.");
                        logout();
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
