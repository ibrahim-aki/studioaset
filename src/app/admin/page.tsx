"use client";

import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { DoorOpen, Box, CheckCircle2, AlertTriangle, AlertOctagon, Video, MapPin, Users, History, Bell, DoorClosed, XCircle, Clock, ChevronDown, ChevronUp, ClipboardCheck, Tag, KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import clsx from "clsx";
import { useRouter } from "next/navigation";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function AdminPage() {
    const { user } = useAuth();
    const { rooms, assets, locations, checklists, operatorShifts } = useLocalDb();
    const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({
        liveNow: false,
        ready: false,
        standby: false,
        trouble: false
    });
    const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const { logout } = useAuth();
    const { addLog } = useLocalDb();
    const router = useRouter();
    const menuRef = useRef<HTMLDivElement>(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsProfileMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

    // Calculate room status based on latest checklist for each room
    const roomStats = useMemo(() => {
        const latestChecklists: Record<string, string> = {};

        // Sort checklists by timestamp (newest first)
        const sortedChecklists = [...checklists].sort((a, b) =>
            new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );

        sortedChecklists.forEach(c => {
            if (!latestChecklists[c.roomId]) {
                latestChecklists[c.roomId] = c.roomStatus;
            }
        });

        const liveCount = rooms.filter(r => latestChecklists[r.id] === "READY_FOR_LIVE" || latestChecklists[r.id] === "LIVE_NOW").length;
        const totalRooms = rooms.length;

        return { liveCount, totalRooms };
    }, [rooms, checklists]);

    // Calculate asset condition breakdown for Studio and Client
    const assetStats = useMemo(() => {
        const studioAssets = assets.filter(a =>
            !a.category?.toLowerCase().includes("client asset") &&
            !a.category?.toLowerCase().includes("client aset")
        );
        const clientAssets = assets.filter(a =>
            a.category?.toLowerCase().includes("client asset") ||
            a.category?.toLowerCase().includes("client aset")
        );

        const getStats = (list: any[]) => {
            const total = list.length;
            const good = list.filter(a => a.status === "BAIK" || !a.status || a.status === "").length;
            const broken = list.filter(a => a.status === "RUSAK").length;
            const dead = list.filter(a => a.status === "MATI").length;
            const lost = list.filter(a => a.status === "HILANG").length;
            return { total, good, broken, dead, lost };
        };

        return {
            studio: getStats(studioAssets),
            client: getStats(clientAssets),
            totalAll: assets.length
        };
    }, [assets]);

    // Location-wise overview
    const locationSummaries = useMemo(() => {
        return locations.map(loc => {
            const locRooms = rooms.filter(r => r.locationId === loc.id);
            const latestChecklists: Record<string, string> = {};

            [...checklists]
                .filter(c => c.locationId === loc.id)
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .forEach(c => {
                    if (!latestChecklists[c.roomId]) {
                        latestChecklists[c.roomId] = c.roomStatus;
                    }
                });

            const liveRooms = locRooms.filter(r => latestChecklists[r.id] === "READY_FOR_LIVE" || latestChecklists[r.id] === "LIVE_NOW").length;

            return {
                id: loc.id,
                name: loc.name,
                totalRooms: locRooms.length,
                liveRooms
            };
        });
    }, [locations, rooms, checklists]);

    // Categorized Room Lists
    const categorizedRooms = useMemo(() => {
        const latestChecklists: Record<string, string> = {};
        [...checklists]
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .forEach(c => {
                if (!latestChecklists[c.roomId]) {
                    latestChecklists[c.roomId] = c.roomStatus;
                }
            });

        const getLocName = (id?: string) => locations.find(l => l.id === id)?.name || "";
        const sortByLoc = (a: any, b: any) => getLocName(a.locationId).localeCompare(getLocName(b.locationId));

        return {
            liveNow: rooms.filter(r => latestChecklists[r.id] === "LIVE_NOW").sort(sortByLoc),
            ready: rooms.filter(r => latestChecklists[r.id] === "READY_FOR_LIVE" || latestChecklists[r.id] === "FINISHED_LIVE").sort(sortByLoc),
            standby: rooms.filter(r => !latestChecklists[r.id] || latestChecklists[r.id] === "ROUTINE_CHECK" || latestChecklists[r.id] === "STANDBY").sort(sortByLoc),
            trouble: rooms.filter(r => latestChecklists[r.id] === "NOT_READY").sort(sortByLoc)
        };
    }, [rooms, checklists, locations]);

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
            {/* Header Area - Refined Redesign */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-gray-100">
                <div className="relative">
                    <div className="absolute -left-4 top-1 bottom-1 w-1 bg-gradient-to-b from-brand-purple via-brand-pink to-brand-orange rounded-full shadow-[0_0_15px_rgba(124,77,255,0.3)]"></div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight leading-none uppercase">
                        Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-purple to-brand-blue">Overview</span>
                    </h1>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-2 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-teal animate-pulse"></span>
                        {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-4 group relative" ref={menuRef}>
                    <div className="text-right hidden sm:block">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Authenticated as</p>
                        <p className="text-sm font-black text-gray-900 group-hover:text-brand-purple transition-colors">{user?.name || "Administrator"}</p>
                    </div>
                    <button
                        onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                        className="relative focus:outline-none"
                    >
                        <div className="absolute inset-0 bg-brand-purple blur-lg opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <div className={clsx(
                            "relative w-12 h-12 rounded-lg bg-white border shadow-xl flex items-center justify-center text-brand-purple font-black text-lg transition-all duration-300",
                            isProfileMenuOpen ? "border-brand-purple translate-y-[-2px] ring-2 ring-brand-purple/20" : "border-gray-100 group-hover:translate-y-[-2px]"
                        )}>
                            {(user?.name || "A").charAt(0).toUpperCase()}
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                        </div>
                    </button>

                    {/* Profile Dropdown Menu */}
                    <div className={clsx(
                        "absolute right-0 top-full mt-3 w-56 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 overflow-hidden z-50 transition-all duration-300 origin-top-right",
                        isProfileMenuOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                    )}>
                        <div className="p-4 border-b border-gray-50 flex items-center gap-3 bg-gray-50/30">
                            <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center text-brand-purple font-bold">
                                {(user?.name || "A").charAt(0).toUpperCase()}
                            </div>
                            <div className="truncate">
                                <p className="text-xs font-black text-gray-900 truncate">{user?.name || "Administrator"}</p>
                                <p className="text-[10px] text-gray-400 font-bold truncate">{user?.role || "ADMIN"}</p>
                            </div>
                        </div>

                        <div className="p-1.5">
                            <button
                                onClick={() => {
                                    setIsPasswordModalOpen(true);
                                    setIsProfileMenuOpen(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-gray-600 hover:text-brand-purple hover:bg-brand-purple/5 rounded-lg transition-colors group/item"
                            >
                                <KeyRound className="w-4 h-4 text-gray-400 group-hover/item:text-brand-purple" />
                                <span>Ubah Password</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors group/item"
                            >
                                <LogOut className="w-4 h-4 text-rose-400" />
                                <span>Keluar Aplikasi</span>
                            </button>
                        </div>

                        <div className="p-2 bg-gray-50/50 border-t border-gray-50 text-center">
                            <span className="text-[8px] font-black text-gray-300 uppercase tracking-widest">
                                Studio Aset v2.0
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Metrics - Elevated Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
                {[
                    { label: "Laporan Baru", value: checklists.filter(c => !c.readBy?.some(r => r.adminId === user?.uid) && (c as any).isRead !== true).length, icon: Bell, color: "from-rose-500 to-pink-500", href: "/admin/checklists" },
                    { label: "Unit Studio", value: roomStats.totalRooms, icon: DoorOpen, color: "from-brand-teal to-blue-500", href: "/admin/rooms" },
                    { label: "Total Aset", value: assetStats.totalAll, icon: Box, color: "from-brand-purple to-purple-400", href: "/admin/assets" },
                    { label: "Total Laporan", value: checklists.length, icon: ClipboardCheck, color: "from-brand-orange to-amber-400", href: "/admin/checklists" }
                ].map((stat, i) => {
                    const isNewReport = stat.label === "Laporan Baru" && stat.value > 0;
                    return (
                        <Link
                            key={i}
                            href={stat.href}
                            className={clsx(
                                "group relative overflow-hidden bg-white p-4 rounded-lg border transition-all duration-500",
                                isNewReport
                                    ? "border-rose-200 shadow-[0_0_20px_rgba(244,63,94,0.1)] ring-1 ring-rose-500/10"
                                    : "border-gray-100 shadow-sm hover:shadow-md"
                            )}
                        >
                            <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity`}>
                                <stat.icon className="w-12 h-12" />
                            </div>
                            <div className="relative z-10">
                                <div className="relative w-fit">
                                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white mb-3 shadow-md transition-transform group-hover:scale-110 duration-300`}>
                                        <stat.icon className="w-4 h-4" />
                                    </div>
                                    {isNewReport && (
                                        <>
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500 border-2 border-white"></span>
                                            </span>
                                        </>
                                    )}
                                </div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                                <div className="flex items-baseline gap-2">
                                    <span className={clsx(
                                        "text-2xl font-black tabular-nums tracking-tighter transition-colors",
                                        isNewReport ? "text-rose-600" : "text-gray-900"
                                    )}>
                                        {stat.value}
                                    </span>
                                    {isNewReport && (
                                        <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded-full animate-pulse tracking-tighter">
                                            NEW REPORTS
                                        </span>
                                    )}
                                </div>
                                {isNewReport && (
                                    <div className="mt-2 h-0.5 w-full bg-rose-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-rose-500 animate-[shimmer_2s_infinite] bg-gradient-to-r from-rose-500 via-rose-300 to-rose-500 bg-[length:200%_100%]"></div>
                                    </div>
                                )}
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Dashboard Workspace - Refined Grid Scaling */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 items-start">

                {/* COLUMN 1: LIVE + ASET STUDIO */}
                <div className="flex flex-col gap-4">
                    {/* 1. LIVE NOW BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full bg-brand-teal animate-pulse shadow-[0_0_10px_rgba(77,182,172,0.6)]"></span>
                                Live Sekarang
                            </h3>
                            <span className="text-[10px] font-black bg-brand-teal/10 text-brand-teal px-3 py-1 rounded-full">{categorizedRooms.liveNow.length}</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(expandedBoards.liveNow ? categorizedRooms.liveNow : categorizedRooms.liveNow.slice(0, 5)).map(r => (
                                <div key={r.id} className="bg-white p-2 border border-gray-50 hover:border-emerald-200 transition-all flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-brand-teal bg-brand-teal/5/50 px-1 rounded uppercase shrink-0">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {locations.find(l => l.id === r.locationId)?.name}
                                        </span>
                                        <span className="text-[11px] font-black text-gray-800 truncate">{r.name}</span>
                                    </div>
                                    <div className="text-[8px] font-black text-brand-teal bg-brand-teal/5 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">Live</div>
                                </div>
                            ))}
                            {categorizedRooms.liveNow.length > 5 && (
                                <button onClick={() => setExpandedBoards(prev => ({ ...prev, liveNow: !prev.liveNow }))} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-brand-teal uppercase tracking-widest border border-dashed border-gray-100 mt-1">
                                    {expandedBoards.liveNow ? "Sembunyikan" : `+${categorizedRooms.liveNow.length - 5} Lainnya`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 5. ASET STUDIO BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Box className="w-4 h-4 text-brand-purple" />
                                Aset Studio
                            </h3>
                            <span className="text-[10px] font-black bg-brand-purple/10 text-brand-purple px-3 py-1 rounded-full">{assetStats.studio.total}</span>
                        </div>
                        <div className="p-3 bg-white">
                            <div className="space-y-3">
                                {[
                                    { label: "BAIK", value: assetStats.studio.good, color: "bg-green-500", text: "text-green-600" },
                                    { label: "RUSAK", value: assetStats.studio.broken, color: "bg-brand-orange", text: "text-brand-orange" },
                                    { label: "MATI", value: assetStats.studio.dead, color: "bg-rose-500", text: "text-rose-600" },
                                    { label: "HILANG", value: assetStats.studio.lost, color: "bg-gray-400", text: "text-gray-400" }
                                ].map((stat, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-end justify-between">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight">{stat.label}</span>
                                            <span className={clsx("text-sm font-black tabular-nums leading-none", stat.text)}>{stat.value}</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={clsx("h-full", stat.color)} style={{ width: `${assetStats.studio.total > 0 ? (stat.value / assetStats.studio.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: STUDIO SIAP LIVE + ASET CLIENT */}
                <div className="flex flex-col gap-4">
                    {/* 2. READY BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                                Studio Siap Live
                            </h3>
                            <span className="text-[10px] font-black bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">{categorizedRooms.ready.length}</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(expandedBoards.ready ? categorizedRooms.ready : categorizedRooms.ready.slice(0, 5)).map(r => (
                                <div key={r.id} className="bg-white p-2 border border-gray-50 hover:border-yellow-200 transition-all flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-yellow-600 bg-yellow-50/50 px-1 rounded uppercase shrink-0">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {locations.find(l => l.id === r.locationId)?.name}
                                        </span>
                                        <span className="text-[11px] font-black text-gray-800 truncate">{r.name}</span>
                                    </div>
                                    <div className="text-[8px] font-black text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">Ready</div>
                                </div>
                            ))}
                            {categorizedRooms.ready.length > 5 && (
                                <button onClick={() => setExpandedBoards(prev => ({ ...prev, ready: !prev.ready }))} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-yellow-600 uppercase tracking-widest border border-dashed border-gray-100 mt-1">
                                    {expandedBoards.ready ? "Sembunyikan" : `+${categorizedRooms.ready.length - 5} Lainnya`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 6. ASET CLIENT BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-4 h-4 text-brand-orange" />
                                Aset Client
                            </h3>
                            <span className="text-[10px] font-black bg-brand-orange/10 text-brand-orange px-3 py-1 rounded-full">{assetStats.client.total}</span>
                        </div>
                        <div className="p-3 bg-white">
                            <div className="space-y-3">
                                {[
                                    { label: "BAIK", value: assetStats.client.good, color: "bg-green-500", text: "text-green-600" },
                                    { label: "RUSAK", value: assetStats.client.broken, color: "bg-brand-orange", text: "text-brand-orange" },
                                    { label: "MATI", value: assetStats.client.dead, color: "bg-rose-500", text: "text-rose-600" },
                                    { label: "HILANG", value: assetStats.client.lost, color: "bg-gray-400", text: "text-gray-400" }
                                ].map((stat, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-end justify-between">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight">{stat.label}</span>
                                            <span className={clsx("text-sm font-black tabular-nums leading-none", stat.text)}>{stat.value}</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={clsx("h-full", stat.color)} style={{ width: `${assetStats.client.total > 0 ? (stat.value / assetStats.client.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 3: STANDBY + DAFTAR CABANG */}
                <div className="flex flex-col gap-4">
                    {/* 3. STANDBY BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-slate-400"></div>
                                Standby
                            </h3>
                            <span className="text-[10px] font-black bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{categorizedRooms.standby.length}</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(expandedBoards.standby ? categorizedRooms.standby : categorizedRooms.standby.slice(0, 5)).map(r => (
                                <div key={r.id} className="bg-white p-2 border border-gray-50 hover:border-slate-200 transition-all flex items-center gap-1.5">
                                    <span className="flex items-center gap-0.5 text-[9px] font-black text-slate-500 bg-slate-50 px-1 rounded uppercase shrink-0">
                                        <MapPin className="w-2.5 h-2.5" />
                                        {locations.find(l => l.id === r.locationId)?.name}
                                    </span>
                                    <span className="text-[11px] font-black text-gray-600 truncate">{r.name}</span>
                                </div>
                            ))}
                            {categorizedRooms.standby.length > 5 && (
                                <button onClick={() => setExpandedBoards(prev => ({ ...prev, standby: !prev.standby }))} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-slate-600 uppercase tracking-widest border border-dashed border-gray-100 mt-1">
                                    {expandedBoards.standby ? "Sembunyikan" : `+${categorizedRooms.standby.length - 5} Lainnya`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 7. DAFTAR CABANG BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-brand-purple" />
                                Daftar Cabang
                            </h3>
                            <span className="text-[10px] font-black bg-brand-purple/10 text-brand-purple px-3 py-1 rounded-full">{locations.length}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-gray-50/20">
                                        <th className="px-3 py-1.5 text-[8px] font-black text-gray-400 uppercase">Cabang</th>
                                        <th className="px-3 py-1.5 text-[8px] font-black text-gray-400 uppercase text-right">Unit</th>
                                        <th className="px-3 py-1.5 text-[8px] font-black text-gray-400 uppercase text-right">Live</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {locationSummaries.map(loc => (
                                        <tr key={loc.id} className="group hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-1.5 text-[10px] font-black text-gray-700 tracking-tight flex items-center gap-1.5">
                                                <div className="w-1 h-1 rounded-full bg-brand-purple"></div>
                                                {loc.name}
                                            </td>
                                            <td className="px-3 py-1.5 text-right text-[10px] font-bold text-gray-400 tabular-nums">{loc.totalRooms}</td>
                                            <td className="px-3 py-1.5 text-right">
                                                <span className={clsx(
                                                    "text-[10px] font-black tabular-nums",
                                                    loc.liveRooms > 0 ? "text-green-600" : "text-gray-300"
                                                )}>{loc.liveRooms}</span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUMN 4: DALAM PERBAIKAN + OPERATOR AKTIF */}
                <div className="flex flex-col gap-4">
                    {/* 4. TROUBLE BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <XCircle className="w-4 h-4 text-rose-500" />
                                Dalam Perbaikan
                            </h3>
                            <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-3 py-1 rounded-full">{categorizedRooms.trouble.length}</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(expandedBoards.trouble ? categorizedRooms.trouble : categorizedRooms.trouble.slice(0, 5)).map(r => (
                                <div key={r.id} className="bg-white p-2 border border-rose-50 hover:border-rose-200 transition-all flex items-center justify-between gap-3 border-l-2 border-l-rose-500">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-rose-600 bg-rose-50 px-1 rounded uppercase shrink-0">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {locations.find(l => l.id === r.locationId)?.name}
                                        </span>
                                        <span className="text-[11px] font-black text-rose-800 truncate">{r.name}</span>
                                    </div>
                                    <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0" />
                                </div>
                            ))}
                            {categorizedRooms.trouble.length > 5 && (
                                <button onClick={() => setExpandedBoards(prev => ({ ...prev, trouble: !prev.trouble }))} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-rose-600 uppercase tracking-widest border border-dashed border-gray-100 mt-1">
                                    {expandedBoards.trouble ? "Sembunyikan" : `+${categorizedRooms.trouble.length - 5} Lainnya`}
                                </button>
                            )}
                            {categorizedRooms.trouble.length === 0 && (
                                <div className="p-8 text-center bg-gray-50/50">
                                    <p className="text-[9px] font-black text-gray-300 uppercase italic tracking-widest">Aman Terkendali</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 8. OPERATOR AKTIF BOARD */}
                    <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex flex-col h-fit overflow-hidden hover:shadow-xl transition-all duration-500">
                        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/50 backdrop-blur-md">
                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-brand-orange" />
                                Operator Aktif
                            </h3>
                            {(() => {
                                const activeShifts = operatorShifts.filter(s => s.status === "ACTIVE");
                                const uniqueShiftsMap: Record<string, typeof activeShifts[0]> = {};
                                activeShifts.forEach(s => {
                                    if (!uniqueShiftsMap[s.operatorId] || new Date(s.createdAt) > new Date(uniqueShiftsMap[s.operatorId].createdAt)) {
                                        uniqueShiftsMap[s.operatorId] = s;
                                    }
                                });
                                const count = Object.keys(uniqueShiftsMap).length;
                                return count > 0 && (
                                    <span className="text-[9px] font-black bg-brand-orange/10 text-amber-700 px-2 py-0.5 rounded-sm">
                                        {count}
                                    </span>
                                );
                            })()}
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(() => {
                                const activeShifts = operatorShifts.filter(s => s.status === "ACTIVE");
                                if (activeShifts.length === 0) {
                                    return (
                                        <div className="p-6 text-center">
                                            <p className="text-[9px] font-black text-gray-300 uppercase italic tracking-widest">Tidak ada bertugas</p>
                                        </div>
                                    );
                                }

                                const uniqueShiftsMap: Record<string, typeof activeShifts[0]> = {};
                                activeShifts.forEach(s => {
                                    if (!uniqueShiftsMap[s.operatorId] || new Date(s.createdAt) > new Date(uniqueShiftsMap[s.operatorId].createdAt)) {
                                        uniqueShiftsMap[s.operatorId] = s;
                                    }
                                });

                                return Object.values(uniqueShiftsMap).map(shift => (
                                    <div key={shift.id} className="bg-white p-3 border border-gray-50 hover:border-amber-200 transition-all flex flex-col gap-1.5 shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[11px] font-black text-gray-900 uppercase tracking-tight">{shift.operatorName}</p>
                                            <span className="text-[8px] font-black text-brand-orange bg-brand-orange/5 px-1.5 py-0.5 rounded uppercase tracking-tighter">On Duty</span>
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500">
                                                <MapPin className="w-3 h-3 text-brand-purple" />
                                                <span className="uppercase">{shift.locationName}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-gray-500 lowercase">
                                                <History className="w-3 h-3 text-brand-purple" />
                                                <span>{shift.startTime} - {shift.endTime}</span>
                                            </div>
                                            {shift.operatorPhone && (
                                                <div className="flex items-center gap-1.5 text-[9px] font-bold text-brand-purple">
                                                    <Bell className="w-3 h-3" />
                                                    <span>{shift.operatorPhone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </div>


        </div >
    );
}
