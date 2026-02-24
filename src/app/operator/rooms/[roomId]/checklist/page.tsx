"use client";

import { use, useEffect, useState } from "react";
import { useLocalDb } from "@/context/LocalDbContext";
import { useAuth } from "@/context/AuthContext";
import { Video, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Send, Zap, Ban, ClipboardCheck, Flag, Clock, User, History, ChevronDown, ChevronUp, XCircle, Search, Plus, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";

interface RoomAsset {
    id: string;
    assetId: string;
    assetName: string;
}

interface ChecklistItem {
    assetId: string;
    assetName: string;
    status: "BAIK" | "RUSAK" | "MATI" | "HILANG" | "";
    notes: string;
    movedToRoomId?: string;
}

export default function ChecklistFormPage({ params }: { params: Promise<{ roomId: string }> }) {
    const { roomId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [roomName, setRoomName] = useState("");
    const [locationId, setLocationId] = useState("");
    const [locationName, setLocationName] = useState("");
    const [assets, setAssets] = useState<RoomAsset[]>([]);
    const [loading, setLoading] = useState(true);

    const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
    const [overallNotes, setOverallNotes] = useState("");
    const [roomStatus, setRoomStatus] = useState<"LIVE_NOW" | "READY_FOR_LIVE" | "NOT_READY" | "STANDBY" | "FINISHED_LIVE" | "">("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    const [warehouseSearchTerm, setWarehouseSearchTerm] = useState("");
    const [isAddingFromWarehouse, setIsAddingFromWarehouse] = useState(false);

    const { rooms: rawRooms, roomAssets: rawRoomAssets, addChecklist, assets: rawAssets, updateAsset, moveRoomAsset, addRoomAsset, locations: rawLocations, checklists } = useLocalDb();

    useEffect(() => {
        try {
            const roomDoc = rawRooms.find(r => r.id === roomId);
            if (roomDoc) {
                setRoomName(roomDoc.name);
                setLocationId(roomDoc.locationId);
                const loc = rawLocations.find(l => l.id === roomDoc.locationId);
                if (loc) setLocationName(loc.name);
            }

            const roomAssetsData = rawRoomAssets.filter(ra => ra.roomId === roomId);

            const assetsData: RoomAsset[] = roomAssetsData.map(doc => ({
                id: doc.id,
                assetId: doc.assetId,
                assetName: doc.assetName,
            }));

            setAssets(assetsData);

            // Init checklist form with CURRENT master status
            setChecklist(assetsData.map(a => {
                const master = rawAssets.find(ma => ma.id === a.assetId);
                return {
                    assetId: a.assetId,
                    assetName: a.assetName,
                    status: (master?.status || "") as any,
                    notes: master?.conditionNotes || "",
                    movedToRoomId: ""
                };
            }));

        } catch (error) {
            console.error("Error fetching room data:", error);
        } finally {
            setLoading(false);
        }
    }, [roomId, rawRooms, rawRoomAssets]);

    const updateItemStatus = (assetId: string, status: ChecklistItem["status"]) => {
        setChecklist(prev => prev.map(item =>
            item.assetId === assetId ? { ...item, status } : item
        ));
    };

    const updateItemNotes = (assetId: string, notes: string) => {
        setChecklist(prev => prev.map(item =>
            item.assetId === assetId ? { ...item, notes } : item
        ));
    };

    const updateItemMovedToRoom = (assetId: string, movedToRoomId: string) => {
        setChecklist(prev => prev.map(item =>
            item.assetId === assetId ? { ...item, movedToRoomId } : item
        ));
    };

    const addAssetFromWarehouse = (assetId: string, assetName: string) => {
        // Avoid duplicates
        if (checklist.some(item => item.assetId === assetId)) {
            alert("Alat ini sudah ada dalam daftar checklist.");
            return;
        }

        const master = rawAssets.find(ma => ma.id === assetId);

        setChecklist(prev => [...prev, {
            assetId,
            assetName,
            status: (master?.status || "") as any,
            notes: master?.conditionNotes || "",
            movedToRoomId: ""
        }]);
        setWarehouseSearchTerm("");
        setIsAddingFromWarehouse(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validasi
        const uncompleted = checklist.find(c => c.status === "");
        if (uncompleted) {
            alert("Mohon isi status kondisi untuk semua alat sebelum submit.");
            return;
        }

        if (roomStatus === "") {
            alert("Mohon pilih status kesiapan ruangan (Bisa Live / Tidak / Rutin).");
            return;
        }

        // Enforcement: Broken/Dead assets must be moved to Warehouse
        const unreturnedDeadAssets = checklist.filter(item =>
            item.status === "MATI" &&
            item.movedToRoomId !== "GL-WAREHOUSE"
        );

        if (unreturnedDeadAssets.length > 0) {
            alert(`PENTING: Alat yang MATI (${unreturnedDeadAssets.map(a => a.assetName).join(", ")}) WAJIB dikembalikan ke GUDANG. Silakan ubah pilihan lokasi menjadi 'Kembalikan ke Gudang'.`);
            return;
        }

        setIsSubmitting(true);
        try {
            // Add checklist to history
            addChecklist({
                locationId,
                locationName,
                roomId,
                roomName,
                operatorId: user?.uid || "demo",
                operatorName: user?.name || "Unknown Operator",
                timestamp: new Date().toISOString(),
                overallNotes,
                roomStatus,
                items: checklist
            });

            // Auto-update global Master Asset status & apply moves
            checklist.forEach(item => {
                // 1. Handle Location/Room Update (Mandatory for warehouse pulls or inter-room moves)
                const isAlreadyInRoom = rawRoomAssets.some(ra => ra.assetId === item.assetId && ra.roomId === roomId);

                // Case A: Asset is new to this room (pulled from warehouse or other room)
                if (!isAlreadyInRoom) {
                    addRoomAsset({
                        roomId: roomId,
                        assetId: item.assetId,
                        assetName: item.assetName
                    }, user?.name || "Operator");
                }

                // Case B: Asset is explicitly moved to ANOTHER room or warehouse
                if (item.movedToRoomId && item.movedToRoomId !== "") {
                    moveRoomAsset(item.assetId, item.movedToRoomId, user?.name || "Operator");
                }

                // 2. Handle Condition/Status Update
                if (item.status) {
                    // Critical Fix: Only update status related fields. 
                    // Never pass locationId/category here as it might be stale.
                    updateAsset(item.assetId, {
                        status: item.status,
                        conditionNotes: item.notes
                    });
                }
            });

            setSubmitted(true);
        } catch (error) {
            console.error("Error submitting checklist:", error);
            alert("Gagal mengirim laporan. Coba lagi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const roomHistory = checklists
        .filter(c => c.roomId === roomId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    const getFullDateTime = (timestamp: string) => {
        const d = new Date(timestamp);
        const day = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
        const time = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');
        return `${day}, ${time}`;
    };

    const getRelativeTime = (timestamp: string) => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInMs = now.getTime() - past.getTime();
        const diffInMins = Math.floor(diffInMs / (1000 * 60));
        const diffInHours = Math.floor(diffInMins / 60);

        if (diffInMins < 1) return "Baru saja";
        if (diffInMins < 60) return `${diffInMins}m`;
        if (diffInHours < 24) return `${diffInHours}j`;
        return "";
    };

    if (loading) {
        return <div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-purple-600" /></div>;
    }

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 bg-white border border-green-100 rounded-3xl shadow-lg mt-10">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-black text-gray-900 mb-2">Laporan Terkirim!</h2>
                <p className="text-gray-500 font-medium mb-8">Terima kasih, hasil pengecekan Anda telah tercatat di sistem pusat.</p>
                <button
                    onClick={() => router.push("/operator/rooms")}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 rounded-2xl transition-colors"
                >
                    Kembali ke Daftar Ruangan
                </button>
            </div>
        );
    }

    return (
        <div className="pb-10">
            <Link href="/operator/rooms" className="inline-flex items-center text-sm font-bold text-gray-400 hover:text-gray-600 mb-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Kembali
            </Link>

            <div className="bg-gradient-to-tr from-purple-600 to-blue-600 p-6 rounded-3xl shadow-lg text-white mb-4">
                <h1 className="text-2xl font-black mb-1">Checklist: {roomName}</h1>
                <p className="opacity-90 text-sm">Silakan pilih status dari tiap properti di bawah ini dengan sejujurnya.</p>
            </div>

            {/* Room History Section */}
            <div className="mb-6 bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <History className="w-5 h-5 text-purple-600" />
                        <span className="text-sm font-black text-gray-900 uppercase tracking-widest">Riwayat Update Ruangan</span>
                        <span className="bg-purple-100 text-purple-600 text-[10px] px-2 py-0.5 rounded-full font-bold">{roomHistory.length}</span>
                    </div>
                    {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                </button>

                {showHistory && (
                    <div className="px-6 pb-6 pt-2 space-y-4 animate-in slide-in-from-top-2 duration-300">
                        {roomHistory.map((h, i) => (
                            <div key={i} className="flex flex-col gap-2 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-tight">
                                        <span className="flex items-center gap-1 text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                                            <User className="w-2.5 h-2.5" /> {h.operatorName}
                                        </span>
                                        <span className="flex items-center gap-1 text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                            <Clock className="w-2.5 h-2.5" /> {getFullDateTime(h.timestamp)} {getRelativeTime(h.timestamp) && `(${getRelativeTime(h.timestamp)})`}
                                        </span>
                                    </div>
                                    <span className={clsx(
                                        "text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                                        h.roomStatus === 'LIVE_NOW' ? 'bg-emerald-100 text-emerald-700' :
                                            h.roomStatus === 'READY_FOR_LIVE' ? 'bg-green-100 text-green-700' :
                                                h.roomStatus === 'NOT_READY' ? 'bg-rose-100 text-rose-700' :
                                                    h.roomStatus === 'STANDBY' ? 'bg-amber-100 text-amber-700' :
                                                        h.roomStatus === 'FINISHED_LIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                                    )}>
                                        {h.roomStatus === 'LIVE_NOW' ? 'LIVE SEKARANG' :
                                            h.roomStatus === 'READY_FOR_LIVE' ? 'SIAP LIVE' :
                                                h.roomStatus === 'NOT_READY' ? 'TIDAK BISA LIVE' :
                                                    h.roomStatus === 'STANDBY' ? 'STANDBY' :
                                                        h.roomStatus === 'FINISHED_LIVE' ? 'SELESAI LIVE' : 'UNKNOWN'}
                                    </span>
                                </div>
                                {h.overallNotes && (
                                    <p className="text-xs text-gray-600 italic font-medium leading-relaxed">&ldquo;{h.overallNotes}&rdquo;</p>
                                )}
                            </div>
                        ))}
                        {roomHistory.length === 0 && (
                            <p className="text-sm text-gray-400 font-bold text-center py-4 uppercase italic">Belum ada riwayat pengecekan</p>
                        )}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                <div className="space-y-4">
                    {/* Feature: Pull from Warehouse */}
                    <div className="mb-4">
                        <button
                            type="button"
                            onClick={() => setIsAddingFromWarehouse(!isAddingFromWarehouse)}
                            className="w-full flex items-center justify-center gap-2 py-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-3xl border-2 border-dashed border-purple-200 transition-all font-black text-sm uppercase tracking-widest"
                        >
                            {isAddingFromWarehouse ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                            {isAddingFromWarehouse ? "Batal Menambah" : "Tarik Aset Dari Gudang"}
                        </button>

                        {isAddingFromWarehouse && (
                            <div className="mt-3 p-4 bg-white rounded-3xl border-2 border-purple-200 shadow-xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari aset di gudang cabang..."
                                        value={warehouseSearchTerm}
                                        onChange={(e) => setWarehouseSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-purple-200 outline-none"
                                    />
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar">
                                    {rawAssets
                                        .filter(a => a.locationId === locationId && !rawRoomAssets.some(ra => ra.assetId === a.id))
                                        .filter(a => a.status === "BAIK" || a.status === "RUSAK")
                                        .filter(a =>
                                            a.name.toLowerCase().includes(warehouseSearchTerm.toLowerCase()) ||
                                            (a.assetCode && a.assetCode.toLowerCase().includes(warehouseSearchTerm.toLowerCase()))
                                        )
                                        .map(asset => (
                                            <button
                                                key={asset.id}
                                                type="button"
                                                onClick={() => addAssetFromWarehouse(asset.id, asset.name)}
                                                className="w-full flex items-center justify-between p-3 hover:bg-purple-50 rounded-2xl border border-gray-100 transition-colors group"
                                            >
                                                <div className="flex flex-col items-start gap-1 text-left">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-gray-900 group-hover:text-purple-700 leading-tight">{asset.name}</span>
                                                        <span className={clsx(
                                                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                                                            asset.status === "BAIK" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {asset.status}
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{asset.assetCode || 'NO-CODE'} • {asset.category}</span>
                                                </div>
                                                <div className="bg-purple-100 p-1.5 rounded-lg text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))
                                    }
                                    {rawAssets.filter(a => a.locationId === locationId && !rawRoomAssets.some(ra => ra.assetId === a.id) && (a.status === "BAIK" || a.status === "RUSAK")).length === 0 && (
                                        <p className="text-center py-6 text-xs font-bold text-gray-400 italic">Gudang kosong atau semua aset sudah terdistribusi.</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {checklist.length === 0 ? (
                        <div className="text-center p-10 bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 text-gray-400">
                            <Package className="w-10 h-10 mx-auto mb-3 opacity-20" />
                            <p className="text-sm font-black uppercase tracking-widest">Belum ada perlengkapan</p>
                            <p className="text-[10px] mt-1 font-bold uppercase tracking-tight">Gunakan tombol di atas untuk menarik barang dari gudang cabang.</p>
                        </div>
                    ) : (
                        checklist.map((item, idx) => (
                            <div key={item.assetId} className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100/80 group">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-50 text-gray-400 flex items-center justify-center font-black text-xs group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                                {idx + 1}
                                            </div>
                                            <h3 className="font-black text-gray-900 text-base tracking-tight">{item.assetName}</h3>
                                        </div>
                                        {!assets.some(a => a.assetId === item.assetId) && (
                                            <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Baru dari Gudang</span>
                                        )}
                                    </div>
                                    {/* Rest of mapping as usual */}
                                    <div className="flex flex-col gap-1.5 bg-gray-50 p-1.5 rounded-[1.25rem]">
                                        <div className="flex items-center gap-1.5">
                                            {[
                                                { id: 'BAIK', label: 'BAIK', color: 'green', icon: CheckCircle2 },
                                                { id: 'RUSAK', label: 'RUSAK', color: 'amber', icon: AlertTriangle },
                                                { id: 'MATI', label: 'MATI', color: 'rose', icon: XCircle },
                                                { id: 'HILANG', label: 'HILANG', color: 'slate', icon: AlertOctagon }
                                            ].map(st => (
                                                <button
                                                    key={st.id}
                                                    type="button"
                                                    onClick={() => updateItemStatus(item.assetId, st.id as ChecklistItem["status"])}
                                                    className={clsx(
                                                        "flex-1 flex items-center justify-center gap-1.5 text-[10px] font-black px-3 py-2.5 rounded-xl transition-all uppercase tracking-tight border-2",
                                                        item.status === st.id
                                                            ? st.color === 'green' ? "bg-green-500 border-green-500 text-white shadow-md shadow-green-200 scale-105"
                                                                : st.color === 'amber' ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-200 scale-105"
                                                                    : st.color === 'rose' ? "bg-rose-500 border-rose-500 text-white shadow-md shadow-rose-200 scale-105"
                                                                        : "bg-slate-600 border-slate-600 text-white shadow-md shadow-slate-200 scale-105"
                                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-200 hover:text-gray-600 shadow-sm"
                                                    )}
                                                >
                                                    <st.icon className={clsx("w-3.5 h-3.5", item.status === st.id ? "text-white" : "opacity-40")} />
                                                    <span className="xs:inline">{st.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                        {item.status === "MATI" && item.movedToRoomId !== "GL-WAREHOUSE" && (
                                            <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-pulse">
                                                <AlertOctagon className="w-3 h-3 text-rose-600" />
                                                <span className="text-[9px] font-black text-rose-600 uppercase tracking-tight">Wajib Kembalikan ke Gudang!</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-3 transition-all duration-300 grid-cols-1 md:grid-cols-2">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Catatan kondisi..."
                                                required={item.status !== "BAIK" && item.status !== ""}
                                                value={item.notes}
                                                onChange={(e) => updateItemNotes(item.assetId, e.target.value)}
                                                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:border-purple-200 focus:outline-none transition-all"
                                            />
                                        </div>

                                        <div className="relative">
                                            <select
                                                value={item.movedToRoomId || ""}
                                                onChange={(e) => updateItemMovedToRoom(item.assetId, e.target.value)}
                                                className="w-full bg-gray-50 border border-transparent rounded-xl px-4 py-2.5 text-xs text-gray-900 shadow-sm focus:bg-white focus:border-purple-200 focus:outline-none transition-all"
                                            >
                                                <option value="">&rarr; Tetap di {roomName}</option>
                                                <option value="GL-WAREHOUSE">&larr; Kembalikan ke Gudang</option>
                                                {rawRooms
                                                    .filter(r => r.locationId === locationId && r.id !== roomId)
                                                    .map(room => (
                                                        <option key={room.id} value={room.id}>
                                                            Geser ke: {room.name}
                                                        </option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {assets.length > 0 && (
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50">
                        <label className="block text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                            <Zap className="w-5 h-5 text-purple-600" /> Status Kesiapan Ruangan
                        </label>
                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                onClick={() => setRoomStatus("LIVE_NOW")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    roomStatus === "LIVE_NOW"
                                        ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    roomStatus === "LIVE_NOW" ? "bg-emerald-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <Video className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase leading-tight">Live Sekarang</p>
                                    <p className="text-xs opacity-70">Studio sedang aktif menyiarkan live</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRoomStatus("READY_FOR_LIVE")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    roomStatus === "READY_FOR_LIVE"
                                        ? "bg-green-50 border-green-500 text-green-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    roomStatus === "READY_FOR_LIVE" ? "bg-green-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase leading-tight">Siap Live</p>
                                    <p className="text-xs opacity-70">Studio siap digunakan 100%</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRoomStatus("NOT_READY")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    roomStatus === "NOT_READY"
                                        ? "bg-rose-50 border-rose-500 text-rose-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    roomStatus === "NOT_READY" ? "bg-rose-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <Ban className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase leading-tight">Tidak Bisa Live</p>
                                    <p className="text-xs opacity-70">Ada kerusakan fatal / kendala teknis</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRoomStatus("STANDBY")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    roomStatus === "STANDBY"
                                        ? "bg-amber-50 border-amber-500 text-amber-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    roomStatus === "STANDBY" ? "bg-amber-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <ClipboardCheck className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase leading-tight">Standby</p>
                                    <p className="text-xs opacity-70">Studio siaga (pemeriksaan rutin/istirahat)</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                onClick={() => setRoomStatus("FINISHED_LIVE")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    roomStatus === "FINISHED_LIVE"
                                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center",
                                    roomStatus === "FINISHED_LIVE" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <Flag className="w-6 h-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm uppercase leading-tight">Selesai Live</p>
                                    <p className="text-xs opacity-70">Sesi live berakhir, studio kembali siap</p>
                                </div>
                            </button>
                        </div>
                    </div>
                )}

                {assets.length > 0 && (
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100/50">
                        <label className="block text-sm font-bold text-gray-900 mb-2">Catatan Tambahan (Bila ada)</label>
                        <textarea
                            rows={3}
                            value={overallNotes}
                            onChange={(e) => setOverallNotes(e.target.value)}
                            placeholder="Misal: AC bocor, kebersihan ruangan kurang..."
                            className="w-full bg-white rounded-xl px-4 py-3 text-sm text-gray-900 placeholder-gray-500 border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
                        />
                    </div>
                )}

                {assets.length > 0 && (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-16 rounded-3xl font-black text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-xl shadow-green-500/30 flex items-center justify-center text-lg hover:brightness-110 active:scale-95 transition-all transform"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>Kirim Laporan <Send className="w-5 h-5 ml-2" /></>
                        )}
                    </button>
                )}
            </form>
        </div>
    );
}
