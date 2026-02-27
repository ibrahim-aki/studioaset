"use client";

import { useState, useEffect, use } from "react";
import { useLocalDb, Room, MasterAsset, RoomAsset } from "@/context/LocalDbContext";
import { Plus, Trash2, ArrowLeft, Video, Package, Loader2, MapPin, History, Clock, User } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { useAuth } from "@/context/AuthContext";

export default function RoomAssetsDistribution({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const { user } = useAuth();

    const [room, setRoom] = useState<Room | null>(null);
    const [masterAssets, setMasterAssets] = useState<MasterAsset[]>([]);
    const [roomAssets, setRoomAssets] = useState<RoomAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [assetSearchTerm, setAssetSearchTerm] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { rooms: rawRooms, assets: rawMasterAssets, roomAssets: rawRoomAssets, addRoomAsset, deleteRoomAsset, locations: rawLocations, checklists } = useLocalDb();

    useEffect(() => {
        const r = rawRooms.find(r => r.id === roomId);
        if (r) {
            setRoom(r);
            // FILTER: Only show assets that belong to the SAME LOCATION as this room
            // SORT: Alphabetically
            const filtered = rawMasterAssets
                .filter(a => a.locationId === r.locationId && (a.status === "BAIK" || a.status === "RUSAK"))
                .sort((a, b) => a.name.localeCompare(b.name));
            setMasterAssets(filtered);
        }

        setRoomAssets(rawRoomAssets.filter(ra => ra.roomId === roomId));
        setLoading(false);
    }, [roomId, rawRooms, rawMasterAssets, rawRoomAssets]);

    const filteredMasterAssets = masterAssets.filter(a =>
        a.name.toLowerCase().includes(assetSearchTerm.toLowerCase()) ||
        (a.assetCode && a.assetCode.toLowerCase().includes(assetSearchTerm.toLowerCase()))
    );

    const handleAddAsset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAssetId) return;

        setIsSubmitting(true);
        try {
            const existingRoom = rawRoomAssets.find(a => a.assetId === selectedAssetId);
            const masterAsset = masterAssets.find(a => a.id === selectedAssetId);

            if (!masterAsset) throw new Error("Aset master tidak ditemukan");

            if (existingRoom) {
                if (existingRoom.roomId === roomId) {
                    alert("Aset spesifik ini sudah ditambahkan ke dalam ruangan ini!");
                    setIsSubmitting(false);
                    return;
                }

                const otherRoom = rawRooms.find(r => r.id === existingRoom.roomId);
                const confirmMove = confirm(`Aset ini saat ini berada di "${otherRoom?.name || "Ruangan Lain"}". Pindahkan ke ruangan ini?`);
                if (!confirmMove) {
                    setIsSubmitting(false);
                    return;
                }
            }

            await addRoomAsset({
                roomId,
                assetId: selectedAssetId,
                assetName: masterAsset.name
            }, user?.name || user?.email || undefined);

            // Reset form
            setSelectedAssetId("");
            setAssetSearchTerm("");
            setIsDropdownOpen(false);
        } catch (error: any) {
            console.error("Error adding asset to room:", error);
            alert(`Gagal menambahkan aset ke ruangan: ${error.message || "Terjadi kesalahan sistem"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveAsset = async (id: string, name: string) => {
        if (confirm(`Hapus ${name} dari ruangan ini?`)) {
            try {
                await deleteRoomAsset(id, user?.name || user?.email || undefined);
            } catch (error) {
                console.error("Error removing:", error);
            }
        }
    };

    // ... rest of logic for mini history stays same but I'll make sure it's integrated below
    const getAssetMiniHistory = (assetId: string) => {
        return checklists
            .filter(c => c.items.some(item => item.assetId === assetId))
            .map(c => {
                const item = c.items.find(i => i.assetId === assetId);
                return {
                    timestamp: c.timestamp,
                    status: item?.status || "BAIK",
                    notes: item?.notes || "-",
                    operatorName: c.operatorName
                };
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 3);
    };

    const getRelativeTime = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInMins < 1) return "Baru saja";
        if (diffInMins < 60) return `${diffInMins}m lalu`;
        if (diffInHours < 24) return `${diffInHours}j lalu`;
        return `${diffInDays}hr lalu`;
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>;
    }

    return (
        <div>
            <div className="mb-6">
                <Link href="/admin/rooms" className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors bg-blue-50/50 w-fit px-3 py-1.5 rounded-lg mb-4">
                    <ArrowLeft className="w-4 h-4 mr-1.5" /> Kembali
                </Link>
                <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 drop-shadow-sm flex items-center gap-2">
                            <Video className="text-indigo-600 w-7 h-7" /> {room?.name || "Loading..."}
                        </h1>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                            <p className="text-gray-500 text-sm font-medium">
                                Manajemen alokasi instrumen & properti studio.
                            </p>
                            {room && (
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black border border-blue-100 uppercase tracking-wider">
                                    <MapPin className="w-3 h-3" /> Area: {rawLocations.find(l => l.id === room.locationId)?.name || "Internal"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* FORM ADD ASSET WITH SEARCH */}
                <div className="bg-white p-6 rounded-[2rem] shadow-xl shadow-gray-100 border border-gray-100 lg:col-span-1 h-fit sticky top-6">
                    <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 uppercase tracking-tight">
                        <Package className="w-6 h-6 text-indigo-600" /> Alokasikan Aset
                    </h2>

                    <div className="space-y-5">
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Cari & Pilih Master Aset</label>

                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Ketik Nama atau Kode Aset..."
                                    value={assetSearchTerm}
                                    onChange={(e) => {
                                        setAssetSearchTerm(e.target.value);
                                        setIsDropdownOpen(true);
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all font-bold text-sm text-gray-900 placeholder-gray-400"
                                />
                                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                    <Plus className={clsx("w-5 h-5 transition-transform duration-300", isDropdownOpen ? "rotate-45 text-indigo-600" : "text-gray-300")} />
                                </div>

                                {isDropdownOpen && (
                                    <div className="absolute z-50 mt-2 w-full bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
                                        <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                            {filteredMasterAssets.length === 0 ? (
                                                <div className="p-4 text-center text-xs font-bold text-gray-400 uppercase italic">Aset tidak ditemukan</div>
                                            ) : (
                                                filteredMasterAssets.map(asset => {
                                                    const assigned = rawRoomAssets.find(ra => ra.assetId === asset.id);
                                                    const otherRoom = assigned ? rawRooms.find(r => r.id === assigned.roomId) : null;
                                                    const isCurrentlySelected = selectedAssetId === asset.id;

                                                    return (
                                                        <button
                                                            key={asset.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedAssetId(asset.id);
                                                                setAssetSearchTerm(asset.name);
                                                                setIsDropdownOpen(false);
                                                            }}
                                                            className={clsx(
                                                                "w-full text-left px-5 py-4 border-b border-gray-50 last:border-0 transition-all flex flex-col gap-1",
                                                                isCurrentlySelected ? "bg-indigo-50" : "hover:bg-gray-50"
                                                            )}
                                                        >
                                                            <div className="flex justify-between items-start">
                                                                <span className="text-sm font-black text-gray-900 leading-tight">{asset.name}</span>
                                                                <span className="text-[9px] font-mono font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded uppercase">{asset.assetCode || "NO-CODE"}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter bg-indigo-50 px-2 py-0.5 rounded-full">{asset.category}</span>
                                                                <span className={clsx(
                                                                    "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                                    asset.status === "BAIK" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                                )}>
                                                                    {asset.status}
                                                                </span>
                                                                {otherRoom && (
                                                                    <span className="text-[9px] font-black text-amber-600 flex items-center gap-1 uppercase tracking-tighter">
                                                                        <MapPin className="w-2.5 h-2.5" /> Terpakai di: {otherRoom.name}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {selectedAssetId && (
                            <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 animate-in zoom-in-95 duration-200">
                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Aset Terpilih:</p>
                                <p className="text-sm font-black text-indigo-900">{masterAssets.find(a => a.id === selectedAssetId)?.name}</p>
                            </div>
                        )}

                        <button
                            onClick={handleAddAsset}
                            disabled={isSubmitting || !selectedAssetId}
                            className={clsx(
                                "w-full flex items-center justify-center px-4 py-4 rounded-2xl shadow-lg text-sm font-black transition-all transform active:scale-95 uppercase tracking-widest",
                                isSubmitting || !selectedAssetId
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-gray-900 text-white hover:bg-black hover:shadow-indigo-500/20"
                            )}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" /> Alokasikan</>}
                        </button>
                    </div>
                </div>

                {/* LIST DISTRIBUTED ASSETS */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                            <h2 className="font-bold text-gray-900 text-lg">Daftar Properti di Ruangan Ini</h2>
                            <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                                Total: {roomAssets.length} Item
                            </span>
                        </div>

                        {roomAssets.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                <Video className="w-12 h-12 text-gray-300 mb-3" />
                                <p className="text-gray-500 text-sm">Belum ada aset yang dialokasikan di ruangan ini.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-gray-100">
                                {roomAssets.map(asset => (
                                    <li key={asset.id} className="p-6 flex items-center justify-between hover:bg-gray-50/50 transition-colors group">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-indigo-100 p-3 rounded-xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                                <Video className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-gray-900">{asset.assetName}</h3>
                                                <p className="text-[10px] text-gray-500 font-medium font-mono mt-0.5">ID: {asset.assetId.substring(0, 8).toUpperCase()}</p>

                                                <div className="mt-3 space-y-1.5 border-l-2 border-gray-100 pl-3">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                        <History className="w-2.5 h-2.5" /> 3 Update Terakhir
                                                    </p>
                                                    {getAssetMiniHistory(asset.assetId).map((hist, i) => (
                                                        <div key={i} className="flex flex-col gap-0.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={clsx(
                                                                    "text-[8px] font-black px-1 py-0.5 rounded uppercase tracking-tighter",
                                                                    hist.status === 'BAIK' ? 'bg-green-100 text-green-700' :
                                                                        hist.status === 'PERLU_PERBAIKAN' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                                )}>
                                                                    {hist.status}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-gray-700 line-clamp-1">{hist.notes}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[8px] font-bold text-gray-400">
                                                                <span className="flex items-center gap-0.5"><User className="w-2 h-2" /> {hist.operatorName}</span>
                                                                <span className="flex items-center gap-0.5"><Clock className="w-2 h-2" /> {getRelativeTime(hist.timestamp)}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {getAssetMiniHistory(asset.assetId).length === 0 && (
                                                        <p className="text-[9px] font-bold text-gray-300 italic">Belum ada riwayat update</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6">
                                            <div className="flex flex-col items-center bg-gray-50 px-4 py-1.5 rounded-lg border border-gray-200">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</span>
                                                <span className="text-xs font-black text-indigo-600">Unit</span>
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAsset(asset.id, asset.assetName)}
                                                className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-2 rounded-xl transition-colors"
                                                title="Hapus dari ruangan"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
