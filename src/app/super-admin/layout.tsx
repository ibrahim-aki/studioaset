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
                <div className="flex items-center gap-8">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <span className="text-white font-bold text-xs">SA</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-gray-900 leading-none">Super Admin</h1>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider leading-none mt-1">System Management</p>
                        </div>
                    </div>

                    <div className="hidden md:flex items-center gap-1">
                        <button
                            onClick={() => router.push("/super-admin")}
                            className="px-3 py-1.5 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="w-1 h-1 rounded-full bg-indigo-600"></span>
                            MANAJEMEN SISTEM
                        </button>
                        <button
                            onClick={() => router.push("/admin")}
                            className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors flex items-center gap-2"
                        >
                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                            PANTAU DASHBOARD ADMIN
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 rounded-lg transition-colors group"
                    >
                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                            <KeyRound className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold text-gray-600 group-hover:text-indigo-600 transition-colors">{user?.name || "User"}</span>
                    </button>

                    <button
                        onClick={() => {
                            logout();
                            router.push("/login");
                        }}
                        className="text-[10px] font-black text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-colors border border-rose-100 uppercase tracking-widest"
                    >
                        Keluar
                    </button>
                </div>
            </nav>
            <main className="">
                {children}
            </main>
        </div>
    );
}
