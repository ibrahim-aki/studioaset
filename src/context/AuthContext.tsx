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
                    // Generate or get session ID from local storage
                    let localSessionId = localStorage.getItem("studio_session_id");
                    if (!localSessionId) {
                        localSessionId = Math.random().toString(36).substring(2, 15);
                        localStorage.setItem("studio_session_id", localSessionId);
                    }

                    // Fetch role and company from Firestore
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    let role: UserRole = null;
                    let name = "";

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();

                        // Safety check: ensure role exists to prevent "Invalid Role" error
                        if (!data.role) {
                            console.error("User document found but role is missing:", firebaseUser.uid);
                            setUser({
                                uid: firebaseUser.uid,
                                email: firebaseUser.email,
                                role: null,
                                isDemo: false,
                            });
                            return;
                        }

                        role = data.role as UserRole;
                        name = data.name || "";

                        // Use updateDoc (SAFEST) to only update session ID without risk of overwriting the whole doc
                        updateDoc(userDocRef, {
                            lastSessionId: localSessionId,
                            lastLogin: new Date().toISOString()
                        }).catch(err => {
                            console.warn("Session update failed (possibly due to incomplete initial setup):", err.message);
                        });

                        setUser({
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            role,
                            name,
                            companyId: data.companyId || "",
                            companyName: data.companyName || "",
                            locationId: data.locationId || "",
                            locationName: data.locationName || "",
                            phone: data.phone || "",
                            lastSessionId: localSessionId,
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
                    console.error("Error fetching user role:", error);
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        role: null,
                        isDemo: false,
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // Check for session hijacking (Single Session Login)
    useEffect(() => {
        if (user && !user.isDemo && db && user.lastSessionId) {
            const userDocRef = doc(db, "users", user.uid);
            const localSessionId = localStorage.getItem("studio_session_id");

            const unsubSession = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists() && !docSnap.metadata.hasPendingWrites) {
                    const data = docSnap.data();

                    // Only logout if:
                    // 1. There is a session ID in Firestore
                    // 2. We have a session ID locally
                    // 3. They don't match
                    if (data.lastSessionId && localSessionId && data.lastSessionId !== localSessionId) {
                        console.warn("Session Mismatch:", { server: data.lastSessionId, local: localSessionId });
                        alert("Sesi Anda telah berakhir karena akun ini login di perangkat lain.");
                        logout();
                    }
                }
            });
            return () => unsubSession();
        }
    }, [user?.uid]);

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
