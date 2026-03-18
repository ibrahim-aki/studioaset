"use client";

import { useState, useEffect } from "react";
import { useLocalDb, Room } from "@/context/LocalDbContext";
import { useAuth } from "@/context/AuthContext";
import { ArrowRight, Video, Loader2, ArrowLeft, Clock, User, MapPin, Lock, CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function OperatorRoomSelection() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLocationId, setSelectedLocationId] = useState("");

    const { user } = useAuth();
    const { rooms: rawRooms, locations, checklists, operatorShifts } = useLocalDb();

    // Cari shift aktif milik operator yang sedang login
    const activeShift = operatorShifts.find(
        s => s.operatorId === user?.uid && s.status === "ACTIVE"
    );

    useEffect(() => {
        const roomsData = [...rawRooms];
        roomsData.sort((a, b) => a.name.localeCompare(b.name));
        setRooms(roomsData);
        setLoading(false);
    }, [rawRooms]);

    useEffect(() => {
        // PRIORITAS: Jika ada shift aktif, SELALU kunci ke lokasi shift tersebut
        // Ini mencegah operator berpindah ke ruangan cabang lain
        if (activeShift) {
            setSelectedLocationId(activeShift.locationId);
        } else {
            // Fallback jika tidak ada shift aktif (edge case)
            const queryLocationId = typeof window !== 'undefined'
                ? new URLSearchParams(window.location.search).get('locationId')
                : null;
            if (queryLocationId) {
                setSelectedLocationId(queryLocationId);
            } else if (locations.length > 0 && !selectedLocationId) {
                setSelectedLocationId(locations[0].id);
            }
        }
    }, [activeShift, locations]);

    const filteredRooms = rooms.filter(room => {
        const matchLocation = room.locationId === selectedLocationId;
        const matchSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
        return matchLocation && matchSearch;
    });

    const getRelativeTime = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMins < 1) return "Baru saja";
        if (diffInMins < 60) return `${diffInMins} menit lalu`;
        if (diffInHours < 24) return `${diffInHours} jam lalu`;
        return `${diffInDays} hari lalu`;
    };

    const getRoomLastCheck = (roomId: string) => {
        const roomChecklists = checklists
            .filter(c => c.roomId === roomId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return roomChecklists[0] || null;
    };

    const getStatusConfig = (status: string | undefined) => {
        switch (status) {
            case "LIVE_NOW":
                return { label: "Sedang Live", color: "bg-emerald-500", icon: Video };
            case "READY_FOR_LIVE":
            case "FINISHED_LIVE":
                return { label: "Siap Live", color: "bg-green-500", icon: CheckCircle2 };
            case "STANDBY":
                return { label: "Standby", color: "bg-amber-500", icon: Clock };
            case "NOT_READY":
                return { label: "Dalam Perbaikan", color: "bg-rose-500", icon: AlertTriangle };
            default:
                return { label: "Tanpa Status", color: "bg-gray-400", icon: AlertCircle };
        }
    };

    const activeLocationName = locations.find(l => l.id === selectedLocationId)?.name || "";

    return (
        <div className="space-y-4">
            <div>
                <Link href="/operator" className="inline-flex items-center text-[11px] font-bold text-gray-400 hover:text-gray-600 mb-2 transition-colors uppercase tracking-widest">
                    <ArrowLeft className="w-3 h-3 mr-1" /> Kembali
                </Link>
                <h1 className="text-xl font-bold text-gray-900 tracking-tight">Pilih Ruangan</h1>
                <p className="text-xs text-gray-400 font-medium mt-0.5 mb-5 italic">Pilih ruangan yang ingin Anda evaluasi.</p>

                {/* Selector Lokasi: Dikunci jika ada shift aktif */}
                {activeShift ? (
                    <div className="w-full bg-brand-purple/5 border border-brand-purple/20 rounded-xl py-3 px-4 mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-3.5 h-3.5 text-brand-purple" />
                            <span className="text-xs font-bold text-brand-purple">{activeLocationName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black text-brand-purple/40 uppercase tracking-widest">
                            <Lock className="w-2.5 h-2.5" />
                            Shift Aktif
                        </div>
                    </div>
                ) : (
                    <div className="relative mb-3">
                        <select
                            value={selectedLocationId}
                            onChange={(e) => setSelectedLocationId(e.target.value)}
                            className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-xs text-gray-900 font-bold shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all appearance-none"
                        >
                            <option value="" disabled>-- Pilih Lokasi Cabang --</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cari ruangan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl py-3 pl-4 pr-10 text-xs text-gray-900 font-medium placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-purple/20 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-2.5">
                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-6 h-6 animate-spin text-brand-purple" /></div>
                ) : filteredRooms.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-gray-100 rounded-xl">
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Ruangan tidak ditemukan</p>
                    </div>
                ) : (
                    filteredRooms.map((room) => (
                        <Link
                            href={`/operator/rooms/${room.id}/checklist`}
                            key={room.id}
                            className="flex items-center justify-between bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-brand-purple/20 group transition-all transform active:scale-[0.99]"
                        >
                            <div className="flex items-center gap-3.5">
                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-brand-purple/5 text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-colors">
                                    <Video className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <h3 className="text-sm font-bold text-gray-900 leading-tight">{room.name}</h3>
                                        {(() => {
                                            const lastCheck = getRoomLastCheck(room.id);
                                            const config = getStatusConfig(lastCheck?.roomStatus);
                                            return (
                                                <span className={clsx(
                                                    "text-[7px] font-black px-1.5 py-0.5 rounded-full text-white uppercase tracking-widest flex items-center gap-0.5",
                                                    config.color
                                                )}>
                                                    <config.icon className="w-2 h-2" />
                                                    {config.label}
                                                </span>
                                            );
                                        })()}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-medium line-clamp-1 mb-1">{room.description || "Ops. Alat Studio"}</p>

                                    {getRoomLastCheck(room.id) ? (
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase tracking-widest">
                                            <span className="flex items-center gap-1 text-brand-purple bg-brand-purple/5 px-1.5 py-0.5 rounded">
                                                <User className="w-2 h-2" />
                                                {getRoomLastCheck(room.id)?.operatorName.split(' ')[0]}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <Clock className="w-2 h-2" />
                                                {getRelativeTime(getRoomLastCheck(room.id)!.timestamp)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-bold text-gray-300 uppercase italic">Belum terlapor</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-gray-200 group-hover:text-brand-purple transition-colors">
                                <ArrowRight className="w-5 h-5" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>

    );
}
