"use client";

import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { DoorOpen, Box, CheckCircle2, AlertTriangle, AlertOctagon, Video, MapPin, Users, History, Bell, DoorClosed, XCircle, Clock, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";
import Link from "next/link";
import { useState, useMemo } from "react";
import clsx from "clsx";

export default function AdminPage() {
    const { user } = useAuth();
    const { rooms, assets, locations, checklists } = useLocalDb();
    const [expandedBoards, setExpandedBoards] = useState<Record<string, boolean>>({
        liveNow: false,
        ready: false,
        standby: false,
        trouble: false
    });

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

    // Calculate asset condition breakdown
    const assetStats = useMemo(() => {
        const total = assets.length;
        const good = assets.filter(a => a.status === "BAIK" || !a.status || a.status === "").length;
        const broken = assets.filter(a => a.status === "RUSAK").length;
        const dead = assets.filter(a => a.status === "MATI").length;
        const lost = assets.filter(a => a.status === "HILANG").length;

        return { total, good, broken, dead, lost };
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
            {/* Header Area */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-6">
                <div>
                    <h1 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-purple-600"></div>
                        ADMIN DASHBOARD
                    </h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                        Sistem Manajemen Studio • {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white border border-gray-200 p-2 rounded-sm shrink-0">
                    <div className="text-right">
                        <p className="text-[9px] font-black text-gray-400 uppercase leading-none">User</p>
                        <p className="text-xs font-black text-purple-600">{user?.name || "Admin"}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-black text-xs border border-purple-200">
                        {(user?.name || "A").charAt(0).toUpperCase()}
                    </div>
                </div>
            </div>

            {/* Top Metrics Row - System Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-gray-200 mb-8">
                {[
                    { label: "Laporan Belum Dibaca", value: checklists.filter(c => c.isRead === false).length, icon: Bell, color: "bg-rose-600" },
                    { label: "Total Unit Studio", value: roomStats.totalRooms, icon: DoorOpen, color: "bg-blue-600" },
                    { label: "Inventaris Aset", value: assetStats.total, icon: Box, color: "bg-purple-600" },
                    { label: "Total Laporan", value: checklists.length, icon: ClipboardCheck, color: "bg-amber-600" }
                ].map((stat, i) => (
                    <div key={i} className={clsx(
                        "p-4 border-r border-b border-gray-200 group hover:bg-gray-50 transition-colors relative",
                        stat.label === "Laporan Belum Dibaca" && stat.value > 0 ? "bg-rose-50/30" : "bg-white"
                    )}>
                        {stat.label === "Laporan Belum Dibaca" && stat.value > 0 && (
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-ping"></div>
                        )}
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">{stat.label}</p>
                        <div className="flex items-end justify-between">
                            <span className={clsx(
                                "text-3xl font-black tabular-nums",
                                stat.label === "Laporan Belum Dibaca" && stat.value > 0 ? "text-rose-600" : "text-gray-900"
                            )}>{stat.value}</span>
                            <stat.icon className={clsx(
                                "w-5 h-5",
                                stat.label === "Laporan Belum Dibaca" && stat.value > 0 ? "text-rose-500 opacity-20" : "opacity-10"
                            )} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Dashboard Workspace - Masonry Uniform Grid System */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-1 mb-10 items-start">

                {/* COLUMN 1: LIVE + STATUS ALAT */}
                <div className="flex flex-col gap-1">
                    {/* 1. LIVE NOW BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-emerald-500 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Live Sekarang
                            </h3>
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-sm">{categorizedRooms.liveNow.length}</span>
                        </div>
                        <div className="p-1 space-y-0.5">
                            {(expandedBoards.liveNow ? categorizedRooms.liveNow : categorizedRooms.liveNow.slice(0, 5)).map(r => (
                                <div key={r.id} className="bg-white p-2 border border-gray-50 hover:border-emerald-200 transition-all flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <span className="flex items-center gap-0.5 text-[9px] font-black text-emerald-600 bg-emerald-50/50 px-1 rounded uppercase shrink-0">
                                            <MapPin className="w-2.5 h-2.5" />
                                            {locations.find(l => l.id === r.locationId)?.name}
                                        </span>
                                        <span className="text-[11px] font-black text-gray-800 truncate">{r.name}</span>
                                    </div>
                                    <div className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase tracking-tighter shrink-0">Live</div>
                                </div>
                            ))}
                            {categorizedRooms.liveNow.length > 5 && (
                                <button onClick={() => setExpandedBoards(prev => ({ ...prev, liveNow: !prev.liveNow }))} className="w-full py-1 text-[9px] font-black text-gray-400 hover:text-emerald-600 uppercase tracking-widest border border-dashed border-gray-100 mt-1">
                                    {expandedBoards.liveNow ? "Sembunyikan" : `+${categorizedRooms.liveNow.length - 5} Lainnya`}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* 5. STATUS ALAT BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-purple-600 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <Box className="w-3.5 h-3.5 text-purple-600" />
                                Status Alat
                            </h3>
                            <span className="text-[9px] font-black bg-purple-100 text-purple-700 px-2 py-0.5 rounded-sm">{assetStats.total}</span>
                        </div>
                        <div className="p-3 bg-white">
                            <div className="space-y-3">
                                {[
                                    { label: "BAIK", value: assetStats.good, color: "bg-green-500", text: "text-green-600" },
                                    { label: "RUSAK", value: assetStats.broken, color: "bg-amber-500", text: "text-amber-600" },
                                    { label: "MATI", value: assetStats.dead, color: "bg-rose-500", text: "text-rose-600" },
                                    { label: "HILANG", value: assetStats.lost, color: "bg-gray-400", text: "text-gray-400" }
                                ].map((stat, i) => (
                                    <div key={i} className="space-y-1">
                                        <div className="flex items-end justify-between">
                                            <span className="text-[8px] font-black text-gray-400 uppercase tracking-tight">{stat.label}</span>
                                            <span className={clsx("text-sm font-black tabular-nums leading-none", stat.text)}>{stat.value}</span>
                                        </div>
                                        <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div className={clsx("h-full", stat.color)} style={{ width: `${assetStats.total > 0 ? (stat.value / assetStats.total) * 100 : 0}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUMN 2: READY + CABANG */}
                <div className="flex flex-col gap-1">
                    {/* 2. READY BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-yellow-400 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                                Studio Siap Live
                            </h3>
                            <span className="text-[9px] font-black bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-sm">{categorizedRooms.ready.length}</span>
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

                    {/* 6. DAFTAR CABANG BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-indigo-600 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                Daftar Cabang
                            </h3>
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-sm">{locations.length}</span>
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
                                                <div className="w-1 h-1 rounded-full bg-indigo-300"></div>
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

                {/* COLUMN 3: STANDBY */}
                <div className="flex flex-col gap-1">
                    {/* 3. STANDBY BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-slate-400 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400"></div>
                                Standby
                            </h3>
                            <span className="text-[9px] font-black bg-slate-100 text-slate-700 px-2 py-0.5 rounded-sm">{categorizedRooms.standby.length}</span>
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
                </div>

                {/* COLUMN 4: TROUBLE */}
                <div className="flex flex-col gap-1">
                    {/* 4. TROUBLE BOARD */}
                    <div className="bg-white border border-gray-200 flex flex-col h-fit">
                        <div className="h-1 bg-rose-500 w-full"></div>
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between bg-white">
                            <h3 className="text-[10px] font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                <XCircle className="w-3 h-3 text-rose-500" />
                                Dalam Perbaikan
                            </h3>
                            <span className="text-[9px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-sm">{categorizedRooms.trouble.length}</span>
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
                </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="bg-indigo-900 rounded-sm p-1 mt-10">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-px">
                    <Link href="/admin/checklists" className="bg-indigo-800/50 hover:bg-white/10 p-3 text-center transition-all group">
                        <History className="w-4 h-4 text-indigo-200 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Laporan</span>
                    </Link>
                    <Link href="/admin/assets" className="bg-indigo-800/50 hover:bg-white/10 p-3 text-center transition-all group border-l md:border-l-0 border-indigo-700/50">
                        <Box className="w-4 h-4 text-indigo-200 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Aset</span>
                    </Link>
                    <Link href="/admin/rooms" className="bg-indigo-800/50 hover:bg-white/10 p-3 text-center transition-all group border-t md:border-t-0 border-indigo-700/50">
                        <DoorOpen className="w-4 h-4 text-indigo-200 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Ruangan</span>
                    </Link>
                    <Link href="/admin/locations" className="bg-indigo-800/50 hover:bg-white/10 p-3 text-center transition-all group border-t md:border-t-0 border-l md:border-l-0 border-indigo-700/50">
                        <MapPin className="w-4 h-4 text-indigo-200 mx-auto mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black text-white uppercase tracking-widest block">Cabang</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
