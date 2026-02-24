"use client";

import { useState, useEffect } from "react";
import { useLocalDb, Room } from "@/context/LocalDbContext";
import { DoorOpen, ArrowRight, Video, Loader2, ArrowLeft, Clock, User } from "lucide-react";
import Link from "next/link";

export default function OperatorRoomSelection() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedLocationId, setSelectedLocationId] = useState("");

    const { rooms: rawRooms, locations, checklists } = useLocalDb();

    useEffect(() => {
        const roomsData = [...rawRooms];
        roomsData.sort((a, b) => a.name.localeCompare(b.name));
        setRooms(roomsData);
        setLoading(false);
    }, [rawRooms]);

    useEffect(() => {
        if (locations.length > 0 && !selectedLocationId) {
            setSelectedLocationId(locations[0].id);
        }
    }, [locations, selectedLocationId]);

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

    return (
        <div className="space-y-6">
            <div>
                <Link href="/operator" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
                </Link>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pilih Ruangan</h1>
                <p className="text-sm text-gray-500 font-medium mt-1 mb-6">Pilih ruangan yang ingin Anda evaluasi jadwal/kondisinya.</p>

                <div className="relative mb-4">
                    <select
                        value={selectedLocationId}
                        onChange={(e) => setSelectedLocationId(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-2xl py-4 pl-5 pr-12 text-sm text-gray-900 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all appearance-none"
                    >
                        <option value="" disabled>-- Pilih Lokasi Cabang --</option>
                        {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                        ))}
                    </select>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Cari ruangan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-2xl py-4 pl-5 pr-12 text-sm text-gray-900 font-medium placeholder-gray-500 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                    />
                </div>
            </div>

            <div className="space-y-4">
                {loading ? (
                    <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>
                ) : filteredRooms.length === 0 ? (
                    <div className="text-center p-8 border-2 border-dashed border-gray-200 rounded-2xl">
                        <p className="text-gray-500 font-medium">Ruangan tidak ditemukan.</p>
                    </div>
                ) : (
                    filteredRooms.map((room) => (
                        <Link
                            href={`/operator/rooms/${room.id}/checklist`}
                            key={room.id}
                            className="flex items-center justify-between bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-purple-200 group transition-all transform active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-purple-100 to-blue-100 text-purple-600 group-hover:from-purple-500 group-hover:to-blue-500 group-hover:text-white transition-colors shadow-inner">
                                    <Video className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 leading-tight">{room.name}</h3>
                                    <p className="text-xs text-gray-400 font-medium line-clamp-1 mt-0.5 mb-1.5">{room.description || "Tidak ada deksripsi"}</p>

                                    {getRoomLastCheck(room.id) ? (
                                        <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-tight">
                                            <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                                <User className="w-2.5 h-2.5" />
                                                {getRoomLastCheck(room.id)?.operatorName}
                                            </span>
                                            <span className="flex items-center gap-1 text-gray-400">
                                                <Clock className="w-2.5 h-2.5" />
                                                {getRelativeTime(getRoomLastCheck(room.id)!.timestamp)}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-[10px] font-bold text-gray-300 uppercase italic">Belum ada laporan</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-gray-300 group-hover:text-purple-600 transition-colors">
                                <ArrowRight className="w-6 h-6" />
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </div>
    );
}
