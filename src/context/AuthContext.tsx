"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";

export type UserRole = "ADMIN" | "OPERATOR" | null;

interface AppUser {
    uid: string;
    email: string | null;
    role: UserRole;
    name?: string;
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
            // ---- DEMO MODE BYPASS ----
            // Tampilkan UI Bypass saat awal (Firebase Auth dilewatkan jika dipicu manual)
            setLoading(false);
            return;
            // ---- END DEMO MODE ----

            /* // ASLI FIREBASE CODE - DI-COMMENT SEMENTARA UNTUK DEMO
            if (firebaseUser) {
                try {
                    // Fetch role from Firestore
                    const userDocRef = doc(db, "users", firebaseUser.uid);
                    const userDocSnap = await getDoc(userDocRef);

                    let role: UserRole = null;
                    let name = "";

                    if (userDocSnap.exists()) {
                        const data = userDocSnap.data();
                        role = data.role as UserRole;
                        name = data.name || "";
                    }

                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        role,
                        name,
                    });
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        role: null,
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
            */
        });

        return () => unsubscribe();
    }, []);

    // Fungsi khusus untuk Demo
    const triggerDemoLogin = (role: UserRole) => {
        setUser({
            uid: "demo-user-123",
            email: `demo-${role?.toLowerCase()}@studio.com`,
            role: role,
            name: `Demo ${role}`,
        });
    };

    const logout = async () => {
        setUser(null);
        // await auth.signOut(); // uncomment this when using real firebase
    };

    return (
        <AuthContext.Provider value={{ user, loading, triggerDemoLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
