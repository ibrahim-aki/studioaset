"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import {
    LayoutDashboard,
    DoorOpen,
    Video,
    ClipboardList,
    LogOut,
    Menu,
    X,
    MapPin,
    Shield,
    History as HistoryIcon,
    ShieldCheck,
    ChevronLeft,
    ChevronRight,
    User,
    KeyRound,
    ChevronDown
} from "lucide-react";
import clsx from "clsx";

const navigation = [
    { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { name: "Lokasi Cabang", href: "/admin/locations", icon: MapPin },
    { name: "Rooms", href: "/admin/rooms", icon: DoorOpen },
    { name: "Master Assets", href: "/admin/assets", icon: Video },
    { name: "Laporan", href: "/admin/checklists", icon: ClipboardList },
    { name: "Log Admin", href: "/admin/logs", icon: ShieldCheck },
    { name: "Changelog", href: "/admin/changelog", icon: HistoryIcon },
];

import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
    const [isProfileExpanded, setIsProfileExpanded] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const { addLog } = useLocalDb();
    const router = useRouter();

    const handleLogout = () => {
        addLog({
            type: "AUTH",
            toValue: "Logout",
            operatorName: user?.name || user?.email || "Unknown",
            notes: "Role: ADMIN"
        });
        logout();
        router.push("/login");
    };

    return (
        <ProtectedRoute allowedRoles={["ADMIN", "CLIENT_ADMIN"]}>
            <div className="min-h-screen bg-gray-50 flex">
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen || (user?.role !== 'SUPER_ADMIN' && user?.needsPasswordChange === true)}
                    onClose={() => setIsPasswordModalOpen(false)}
                    preventClose={user?.role !== 'SUPER_ADMIN' && user?.needsPasswordChange === true}
                />

                {/* Mobile sidebar backdrop */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 z-40 bg-gray-900/80 backdrop-blur-sm lg:hidden transition-opacity duration-300"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside className={clsx(
                    "fixed inset-y-0 left-0 z-50 bg-[#1A0D3C] text-white transition-all duration-300 ease-in-out lg:translate-x-0 lg:flex lg:flex-col shadow-2xl",
                    isCollapsed ? "lg:w-20" : "lg:w-72",
                    sidebarOpen ? "translate-x-0 w-72" : "max-lg:-translate-x-full w-72 lg:translate-x-0"
                )}>
                    {/* Toggle Button for Desktop */}
                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex absolute -right-3 top-8 h-6 w-6 bg-brand-purple rounded-full items-center justify-center text-white border-2 border-[#1A0D3C] hover:bg-brand-purple/80 transition-all z-[61] shadow-lg hover:scale-110 active:scale-95"
                    >
                        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                    </button>

                    <div className="flex grow flex-col gap-y-5 overflow-y-auto overflow-x-hidden px-6 pb-4 scrollbar-hide">
                        <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5">
                            {!isCollapsed ? (
                                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-blue to-brand-purple truncate">
                                    Live Studio Admin
                                </span>
                            ) : (
                                <Shield className="h-8 w-8 text-brand-blue mx-auto" />
                            )}
                            <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        {/* Nav links */}
                        <nav className="flex flex-1 flex-col pt-4">
                            <ul role="list" className="flex flex-1 flex-col gap-y-1">
                                <li>
                                    {user?.role === "SUPER_ADMIN" && (
                                        <Link
                                            href="/super-admin"
                                            className={clsx(
                                                "group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-bold text-brand-orange hover:text-white hover:bg-brand-orange/20 transition-all border border-brand-orange/30 mb-6 shadow-sm",
                                                isCollapsed && "justify-center border-none bg-brand-orange/10 px-0"
                                            )}
                                            title={isCollapsed ? "Manajemen Sistem" : ""}
                                        >
                                            <Shield className="h-6 w-6 shrink-0 text-brand-orange group-hover:rotate-12 transition-transform" />
                                            {!isCollapsed && <span>Manajemen Sistem</span>}
                                        </Link>
                                    )}

                                    <ul role="list" className="-mx-2 space-y-1">
                                        {navigation.map((item) => {
                                            const isActive = pathname === item.href;
                                            return (
                                                <li key={item.name}>
                                                    <Link
                                                        href={item.href}
                                                        className={clsx(
                                                            isActive
                                                                ? "bg-white/15 text-white shadow-inner"
                                                                : "text-white/60 hover:text-white hover:bg-white/10",
                                                            "group flex gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all",
                                                            isCollapsed && "justify-center"
                                                        )}
                                                        title={isCollapsed ? item.name : ""}
                                                    >
                                                        <item.icon
                                                            className={clsx(
                                                                isActive ? "text-white scale-110" : "text-white/50 group-hover:text-white group-hover:scale-110",
                                                                "h-6 w-6 shrink-0 transition-all duration-300"
                                                            )}
                                                            aria-hidden="true"
                                                        />
                                                        {!isCollapsed && <span className="truncate">{item.name}</span>}
                                                        {isActive && !isCollapsed && (
                                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-blue shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
                                                        )}

                                                    </Link>
                                                </li>
                                            );
                                        })}

                                        {/* Profil Section - Now under Changelog */}
                                        <li className="pt-2">
                                            <button
                                                onClick={() => setIsProfileExpanded(!isProfileExpanded)}
                                                className={clsx(
                                                    "w-full group flex items-center gap-x-3 rounded-xl p-3 text-sm leading-6 font-semibold transition-all",
                                                    isProfileExpanded ? "bg-white/10 text-white" : "text-white/60 hover:text-white hover:bg-white/5",
                                                    isCollapsed && "justify-center"
                                                )}
                                                title={isCollapsed ? "Profil Saya" : ""}
                                            >
                                                <User className={clsx(
                                                    "h-6 w-6 shrink-0 transition-all duration-300",
                                                    isProfileExpanded ? "text-white scale-110" : "text-white/50 group-hover:text-white"
                                                )} />
                                                {!isCollapsed && (
                                                    <>
                                                        <span className="truncate flex-1 text-left">Profil Saya</span>
                                                        <ChevronDown className={clsx(
                                                            "h-4 w-4 transition-transform duration-300",
                                                            isProfileExpanded && "rotate-180"
                                                        )} />
                                                    </>
                                                )}
                                            </button>

                                            {/* Profile Expanded Content */}
                                            <div className={clsx(
                                                "overflow-hidden transition-all duration-300 ease-in-out px-1.5",
                                                isProfileExpanded ? "max-h-60 opacity-100 mt-1" : "max-h-0 opacity-0"
                                            )}>
                                                <div className="bg-brand-purple/20 rounded-xl p-2 space-y-1 border border-white/5">
                                                    {!isCollapsed && (
                                                        <div className="px-2 py-2 mb-1 border-b border-white/5">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
                                                                <span className="text-white text-xs truncate font-bold">{user?.name || "Admin"}</span>
                                                            </div>
                                                            {user?.locationName && (
                                                                <span className="text-[10px] text-brand-orange truncate block pl-3.5 italic">
                                                                    {user.locationName}
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => setIsPasswordModalOpen(true)}
                                                        className={clsx(
                                                            "w-full group flex items-center rounded-lg p-2 text-xs font-medium text-white/60 hover:text-white hover:bg-white/10 transition-all",
                                                            isCollapsed ? "justify-center" : "gap-x-3 text-left"
                                                        )}
                                                    >
                                                        <KeyRound className="h-4 w-4 shrink-0 text-white/40 group-hover:text-white" />
                                                        {!isCollapsed && <span>Ubah Password</span>}
                                                    </button>

                                                    <button
                                                        onClick={handleLogout}
                                                        className={clsx(
                                                            "w-full group flex items-center rounded-lg p-2 text-xs font-medium text-rose-300 hover:text-white hover:bg-rose-500/20 transition-all",
                                                            isCollapsed ? "justify-center" : "gap-x-3 text-left"
                                                        )}
                                                    >
                                                        <LogOut className="h-4 w-4 shrink-0 text-rose-400 group-hover:text-white" />
                                                        {!isCollapsed && <span>Keluar Aplikasi</span>}
                                                    </button>
                                                </div>
                                            </div>
                                        </li>
                                    </ul>
                                </li>
                            </ul>
                        </nav>

                        {/* Footer / App Version could go here */}
                        {!isCollapsed && (
                            <div className="mt-auto px-2 py-4 border-t border-white/5">
                                <p className="text-[10px] text-center text-white/40 font-medium uppercase tracking-widest opacity-50">
                                    Studio Aset v2.0
                                </p>
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main content area */}
                <div className={clsx(
                    "flex flex-col flex-1 w-full transition-all duration-300 min-w-0",
                    isCollapsed ? "lg:pl-20" : "lg:pl-72"
                )}>
                    {/* Mobile Header */}
                    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur-md px-4 shadow-sm sm:gap-x-6 lg:hidden lg:px-8">
                        <button
                            type="button"
                            className="-m-2.5 p-2.5 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu className="h-6 w-6" aria-hidden="true" />
                        </button>
                        <div className="flex-1 text-sm font-semibold leading-6 text-gray-900">
                            {pathname === "/super-admin" ? "Sistem Manajemen" : "Admin Dashboard"}
                        </div>
                    </header>

                    <main className="flex-1 pb-10">
                        <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-full mx-auto">
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </ProtectedRoute>
    );
}
