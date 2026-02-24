"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
    LayoutDashboard,
    DoorOpen,
    Video,
    ClipboardList,
    LogOut,
    Menu,
    X,
    MapPin
} from "lucide-react";
import clsx from "clsx";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Lokasi Cabang", href: "/admin/locations", icon: MapPin },
    { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
    { name: "Master Assets", href: "/admin/assets", icon: Video },
    { name: "Laporan", href: "/admin/checklists", icon: ClipboardList },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const router = useRouter();

    const handleLogout = () => {
        logout();
        router.push("/login");
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN"]}>
            <div className="min-h-screen bg-gray-50 flex">
                {/* Mobile sidebar backdrop */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <div className={clsx(
                    "fixed inset-y-0 left-0 z-50 w-72 bg-indigo-950 text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:w-72 lg:flex-col",
                    sidebarOpen ? "translate-x-0" : "-translate-x-full"
                )}>
                    <div className="flex grow flex-col gap-y-5 overflow-y-auto px-6 pb-4">
                        <div className="flex h-16 shrink-0 items-center justify-between">
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                                Live Studio Admin
                            </span>
                            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Nav links */}
                        <nav className="flex flex-1 flex-col">
                            <ul role="list" className="flex flex-1 flex-col gap-y-7">
                                <li>
                                    <ul role="list" className="-mx-2 space-y-2">
                                        {navigation.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        className={clsx(
                                                            isActive
                                                                ? "bg-indigo-900/50 text-white"
                                                                : "text-indigo-200 hover:text-white hover:bg-indigo-900/30",
                                                            "group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all"
                                                        )}
                                                    >
                                                        <item.icon
                                                            className={clsx(
                                                                isActive ? "text-white" : "text-indigo-300 group-hover:text-white",
                                                                "h-6 w-6 shrink-0"
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                        {item.name}
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </li>

                                <li className="mt-auto -mx-2">
                                    <div className="bg-white/5 rounded-2xl p-4 mb-4 backdrop-blur-md border border-white/10">
                                        <p className="text-sm font-medium text-white truncate">{user?.name || "Admin"}</p>
                                        <p className="text-xs text-indigo-300 truncate">{user?.email}</p>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all"
                                    >
                                        <LogOut className="h-6 w-6 shrink-0" />
                                        Keluar Sistem
                                    </button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                </div>

                {/* Main content */}
                <div className="flex flex-col flex-1 w-full lg:pl-0">
                    <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 lg:hidden lg:px-8">
                        <button
                            type="button"
                            className="-m-2.5 p-2.5 text-gray-700"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
                            Admin Dashboard
                        </div>
                    </div>

                    <main className="flex-1 pb-10">
                        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
