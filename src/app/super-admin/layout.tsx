"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Loader2, KeyRound } from "lucide-react";
import { useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
    const { user, loading, logout } = useAuth();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.replace("/login");
            } else if (user.role !== "SUPER_ADMIN") {
                // If not super admin, redirect to their respective dashboard or home
                if (user.role === "ADMIN") router.replace("/admin");
                else if (user.role === "OPERATOR") router.replace("/operator");
                else router.replace("/login");
            }
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            </div>
        );
    }

    if (!user || user.role !== "SUPER_ADMIN") {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />

            <nav className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">SA</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-none">Super Admin</h1>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">User Management</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                        <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                            <KeyRound className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600">{user?.name || "User"}</span>
                    </button>
                </div>

                <button
                    onClick={() => {
                        logout();
                        router.push("/login");
                    }}
                    className="text-xs font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors border border-rose-100"
                >
                    LOGOUT
                </button>
            </nav>
            <main className="">
                {children}
            </main>
        </div>
    );
}
