"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { LogOut, UserCircle, Key } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const { addLog } = useLocalDb();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const router = useRouter();

    const handleLogout = () => {
        addLog({
            type: "AUTH",
            toValue: "Logout Berhasil",
            operatorName: user?.name || user?.email || "Unknown",
            notes: "Role: OPERATOR"
        });
        logout();
        router.push("/login");
    };

    return (
        <ProtectedRoute allowedRoles={["OPERATOR"]}>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen}
                    onClose={() => setIsPasswordModalOpen(false)}
                />

                {/* Mobile Header / Topbar */}
                <header className="fixed top-0 inset-x-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">
                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-xl transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                            {user?.name?.charAt(0).toUpperCase() || "O"}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-bold text-gray-900 leading-tight">Studio Ops</p>
                            <p className="text-[10px] text-indigo-500 font-bold leading-tight truncate max-w-[100px] flex items-center gap-1">
                                {user?.name || "Operator"} <Key className="w-2.5 h-2.5" />
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        title="Keluar"
                    >
                        <LogOut className="w-5 h-5 ml-1" />
                    </button>
                </header>

                {/* Main Content Area (Mobile First padding) */}
                <main className="flex-1 px-4 pt-20 pb-8 w-full max-w-md mx-auto relative">
                    {children}
                </main>
            </div>
        </ProtectedRoute>
    );
}
