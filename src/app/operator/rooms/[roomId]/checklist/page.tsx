"use client";

import { use, useEffect, useState } from "react";
import { useLocalDb } from "@/context/LocalDbContext";
import { useAuth } from "@/context/AuthContext";
import { Video, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Send, Zap, Ban, ClipboardCheck, Flag, Clock, User, History, ChevronDown, ChevronUp, XCircle, Search, Plus, Package, Camera, Trash2 } from "lucide-react";
// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "dsbryri1d";
const CLOUDINARY_UPLOAD_PRESET = "studioaset_checklist";
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
    photoUrl?: string;
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
    const [uploadingAssetId, setUploadingAssetId] = useState<string | null>(null);
    const { 
        rooms: rawRooms, 
        roomAssets: rawRoomAssets, 
        addChecklist, 
        assets: rawAssets, 
        updateAsset, 
        moveRoomAsset, 
        addRoomAsset, 
        locations: rawLocations, 
        checklists,
        companies 
    } = useLocalDb();
    
    // Ambil preferensi perusahaan
    const currentCompany = companies.find(c => c.id === user?.companyId);

    // Filter checklists for this room to find latest status
    const lastCheck = checklists
        .filter(c => c.roomId === roomId)
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    const isLockedToFinished = lastCheck?.roomStatus === "LIVE_NOW";

    const [warehouseSearchTerm, setWarehouseSearchTerm] = useState("");
    const [isAddingFromWarehouse, setIsAddingFromWarehouse] = useState(false);

    useEffect(() => {
        try {
            const roomDoc = rawRooms.find(r => r.id === roomId);
            if (roomDoc) {
                setRoomName(roomDoc.name);
                setLocationId(roomDoc.locationId);
                const loc = rawLocations.find(l => l.id === roomDoc.locationId);
                if (loc) setLocationName(loc.name);
            }

            const roomAssetsData = rawRoomAssets
                .filter(ra => ra.roomId === roomId)
                .filter(ra => rawAssets.some(ma => ma.id === ra.assetId));

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

    const compressImage = async (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx?.drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error("Gagal kompresi"));
                    }, "image/jpeg", 0.7);
                };
            };
            reader.onerror = (e) => reject(e);
        });
    };

    const handlePhotoCapture = async (assetId: string, file: File) => {
        if (!file) return;
        setUploadingAssetId(assetId);
        try {
            // Kompresi dulu sebelum upload ke Cloudinary
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], `${assetId}_${Date.now()}.jpg`, { type: "image/jpeg" });

            const formData = new FormData();
            formData.append("file", compressedFile);
            formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

            const res = await fetch(
                `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                { method: "POST", body: formData }
            );

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error?.message || "Gagal mengirim foto ke server");
            }

            const data = await res.json();
            setChecklist(prev => prev.map(item =>
                item.assetId === assetId ? { ...item, photoUrl: data.secure_url } : item
            ));
        } catch (error: any) {
            console.error("Upload error:", error);
            alert("Gagal mengunggah foto: " + error.message);
        } finally {
            setUploadingAssetId(null);
        }
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
        const uncompleted = checklist.find(c => {
            const master = rawAssets.find(ma => ma.id === c.assetId);
            const isClientAsset = master?.category?.toLowerCase().includes("client asset") ||
                master?.category?.toLowerCase().includes("client aset");

            // Jika bukan client asset, wajib isi status
            return !isClientAsset && c.status === "";
        });

        if (uncompleted) {
            alert("Mohon isi status kondisi untuk semua alat studio sebelum submit.");
            return;
        }

        // Validasi Foto Kamera (Opsional Berdasarkan Pengaturan Super Admin)
        if (currentCompany?.requireChecklistPhoto) {
            const missingPhoto = checklist.find(c => !c.photoUrl);
            if (missingPhoto) {
                alert(`PENTING: Perusahaan mewajibkan bukti foto. Aset "${missingPhoto.assetName}" belum difoto. Silakan ambil foto melalui kamera.`);
                return;
            }
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

        if (isLockedToFinished && roomStatus !== "FINISHED_LIVE") {
            alert("PERINGATAN: Ruangan ini masih dalam status LIVE. Anda WAJIB memilih status 'Selesai Live' untuk menutup sesi live sebelum dapat mengubah ke status lainnya.");
            return;
        }

        setIsSubmitting(true);
        try {
            // STEP 1 (KRITIS): Simpan checklist ke database — jika ini gagal, batalkan semua
            await addChecklist({
                locationId,
                locationName,
                roomId,
                roomName,
                operatorId: user?.uid || "",
                operatorName: user?.name || "Unknown Operator",
                timestamp: new Date().toISOString(),
                overallNotes,
                roomStatus,
                items: checklist
            });

            // STEP 2 (SEKUNDER/BEST-EFFORT): Proses perpindahan aset
            // Dibungkus try-catch individual agar kegagalan permission pada
            // koleksi roomAssets tidak membatalkan laporan yang sudah tersimpan.
            for (const item of checklist) {
                const isAlreadyInRoom = rawRoomAssets.some(ra => ra.assetId === item.assetId && ra.roomId === roomId);

                // Case A: Aset baru (diambil dari gudang)
                if (!isAlreadyInRoom) {
                    try {
                        await addRoomAsset({
                            roomId: roomId,
                            assetId: item.assetId,
                            assetName: item.assetName
                        }, user?.name || "Operator");
                    } catch (raErr) {
                        console.warn(`[Checklist] Gagal daftarkan aset baru ke ruangan (non-kritis):`, raErr);
                    }
                }

                // Case B: Aset dipindahkan keluar
                if (item.movedToRoomId && item.movedToRoomId !== "") {
                    try {
                        await moveRoomAsset(item.assetId, item.movedToRoomId, user?.name || "Operator");
                    } catch (mvErr) {
                        console.warn(`[Checklist] Gagal pindahkan aset (non-kritis):`, mvErr);
                    }
                }
            }

            // Laporan utama sudah tersimpan — tampilkan halaman sukses
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
                    onClick={() => router.push(`/operator/rooms?locationId=${locationId}`)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 rounded-2xl transition-colors"
                >
                    Kembali ke Daftar Ruangan
                </button>
            </div>
        );
    }

    return (
        <div className="pb-10">
            <Link href="/operator/rooms" className="inline-flex items-center text-[10px] font-bold text-gray-400 hover:text-gray-600 mb-2 transition-colors uppercase tracking-[0.2em]">
                <ArrowLeft className="w-3 h-3 mr-1" /> Kembali
            </Link>

            <div className="bg-gradient-to-tr from-brand-purple to-brand-blue p-5 rounded-2xl shadow-md text-white mb-3">
                <h1 className="text-xl font-black mb-0.5 tracking-tight">Ruang: {roomName}</h1>
                <p className="opacity-80 text-[10px] font-medium italic">Laporkan kondisi aset dengan teliti</p>
            </div>

            {/* Room History Section */}
            <div className="mb-4 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                    type="button"
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-brand-purple" />
                        <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Riwayat Update</span>
                        <span className="bg-brand-purple/5 text-brand-purple text-[9px] px-1.5 py-0.5 rounded-full font-bold">{roomHistory.length}</span>
                    </div>
                    {showHistory ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>

                {showHistory && (
                    <div className="px-5 pb-5 pt-1 space-y-3 animate-in slide-in-from-top-1 duration-200">
                        {roomHistory.map((h, i) => (
                            <div key={i} className="flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100 text-[10px]">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 font-bold uppercase tracking-tight">
                                        <span className="flex items-center gap-1 text-brand-purple bg-white px-1.5 py-0.5 rounded border border-brand-purple/5">
                                            <User className="w-2.5 h-2.5" /> {h.operatorName.split(' ')[0]}
                                        </span>
                                        <span className="text-gray-400">{getRelativeTime(h.timestamp)}</span>
                                    </div>
                                    <span className={clsx(
                                        "text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter",
                                        h.roomStatus === 'LIVE_NOW' ? 'bg-emerald-500 text-white' :
                                            h.roomStatus === 'READY_FOR_LIVE' ? 'bg-green-500 text-white' :
                                                h.roomStatus === 'NOT_READY' ? 'bg-rose-500 text-white' :
                                                    h.roomStatus === 'STANDBY' ? 'bg-amber-500 text-white' :
                                                        h.roomStatus === 'FINISHED_LIVE' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                                    )}>
                                        {h.roomStatus?.replace('_', ' ')}
                                    </span>
                                </div>
                                {h.overallNotes && (
                                    <p className="text-gray-500 italic font-medium leading-relaxed">&ldquo;{h.overallNotes}&rdquo;</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-8">
                <div className="space-y-4">
                    {/* Feature: Pull from Warehouse */}
                    <div className="mb-2">
                        <button
                            type="button"
                            onClick={() => setIsAddingFromWarehouse(!isAddingFromWarehouse)}
                            className="w-full flex items-center justify-center gap-2 py-3 bg-brand-purple/5 hover:bg-brand-purple/10 text-brand-purple rounded-xl border border-dashed border-brand-purple/20 transition-all font-bold text-[11px] uppercase tracking-[0.2em]"
                        >
                            {isAddingFromWarehouse ? <XCircle className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {isAddingFromWarehouse ? "Batal" : "Tambah Barang Dari Gudang"}
                        </button>

                        {isAddingFromWarehouse && (
                            <div className="mt-2 p-3 bg-white rounded-xl border border-brand-purple/10 shadow-lg animate-in zoom-in-95 duration-200">
                                <div className="relative mb-2">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Cari alat..."
                                        value={warehouseSearchTerm}
                                        onChange={(e) => setWarehouseSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-3 py-2 bg-gray-50 border-none rounded-lg text-xs font-bold focus:ring-1 focus:ring-brand-purple/20 outline-none"
                                    />
                                </div>

                                <div className="max-h-48 overflow-y-auto space-y-1.5 px-0.5 custom-scrollbar">
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
                                                className="w-full flex items-center justify-between p-2.5 hover:bg-brand-purple/5 rounded-lg border border-gray-50 transition-colors group"
                                            >
                                                <div className="flex flex-col items-start gap-0.5 text-left">
                                                    <span className="text-[11px] font-bold text-gray-900 group-hover:text-brand-purple leading-tight">{asset.name}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{asset.assetCode || 'NO-CODE'} • {asset.category}</span>
                                                </div>
                                                <div className="text-brand-purple/40 group-hover:text-brand-purple transition-all">
                                                    <Plus className="w-4 h-4" />
                                                </div>
                                            </button>
                                        ))
                                    }
                                </div>
                            </div>
                        )}
                    </div>

                    {checklist.length === 0 ? (
                        <div className="text-center p-8 bg-gray-50 rounded-2xl border border-dashed border-gray-100 text-gray-300">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-10" />
                            <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Ruangan Kosong</p>
                        </div>
                    ) : (
                        checklist.map((item, idx) => (
                            <div key={item.assetId} className="bg-white rounded-2xl p-3.5 shadow-sm border border-gray-100/80 group">
                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-6 h-6 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center font-black text-[10px] group-hover:bg-brand-purple/5 group-hover:text-brand-purple transition-all">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-[13px] tracking-tight leading-tight">{item.assetName}</h3>
                                                {(() => {
                                                    const master = rawAssets.find(ma => ma.id === item.assetId);
                                                    if (master?.category?.toLowerCase().includes("client")) return <span className="text-[8px] font-bold text-brand-purple bg-brand-purple/5 px-1 rounded-sm uppercase tracking-tighter">Client Asset</span>;
                                                    return null;
                                                })()}
                                            </div>
                                        </div>
                                        {!assets.some(a => a.assetId === item.assetId) && (
                                            <span className="text-[7px] font-black bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase tracking-widest shadow-sm">BARU</span>
                                        )}
                                    </div>
                                    {/* Status Selector - Compact Row */}
                                    <div className="flex items-center gap-1 p-1 bg-gray-50 rounded-xl">
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
                                                    "flex-1 flex flex-col items-center justify-center py-1.5 rounded-lg transition-all border-2",
                                                    item.status === st.id
                                                        ? st.color === 'green' ? "bg-green-500 border-green-500 text-white shadow-lg shadow-green-200"
                                                            : st.color === 'amber' ? "bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-200"
                                                                : st.color === 'rose' ? "bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-200"
                                                                    : "bg-slate-600 border-slate-600 text-white shadow-lg shadow-slate-200"
                                                        : "bg-white border-transparent text-gray-300 hover:text-gray-500"
                                                )}
                                            >
                                                <st.icon className={clsx("w-3.5 h-3.5 mb-0.5", item.status === st.id ? "text-white" : "opacity-30")} />
                                                <span className="text-[8px] font-black tracking-tighter uppercase">{st.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {item.status === "MATI" && item.movedToRoomId !== "GL-WAREHOUSE" && (
                                        <div className="px-3 py-1 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-pulse">
                                            <AlertOctagon className="w-3 h-3 text-rose-600" />
                                            <span className="text-[9px] font-black text-rose-600 uppercase tracking-tight">Wajib Kenbali Ke Gudang!</span>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 relative">
                                            <input
                                                type="text"
                                                placeholder="Catatan..."
                                                required={item.status !== "BAIK" && item.status !== ""}
                                                value={item.notes}
                                                onChange={(e) => updateItemNotes(item.assetId, e.target.value)}
                                                className="w-full bg-gray-50 border border-transparent rounded-lg px-3 py-2 text-[10px] font-medium text-gray-900 placeholder-gray-400 focus:bg-white focus:border-brand-purple/20 focus:outline-none transition-all"
                                            />
                                        </div>
                                        <div className="flex-1 relative">
                                            <select
                                                value={item.movedToRoomId || ""}
                                                onChange={(e) => updateItemMovedToRoom(item.assetId, e.target.value)}
                                                className="w-full bg-gray-50 border border-transparent rounded-lg px-2 py-2 text-[10px] font-bold text-gray-600 focus:bg-white focus:border-brand-purple/20 focus:outline-none transition-all appearance-none"
                                            >
                                                <option value="">&rarr; Lokasi: {roomName.split(' ')[0]}</option>
                                                <option value="GL-WAREHOUSE">&larr; Balik Gudang</option>
                                                {rawRooms
                                                    .filter(r => r.locationId === locationId && r.id !== roomId)
                                                    .map(room => (
                                                        <option key={room.id} value={room.id}>&rarr; Pindah: {room.name.split(' ')[0]}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    {/* Action Box: Photo Capture - Compact */}
                                    {currentCompany?.requireChecklistPhoto && (
                                        <div className="pt-1">
                                            {item.photoUrl ? (
                                                <div className="relative w-full h-36 rounded-xl overflow-hidden border border-emerald-500/20 shadow-inner group/photo">
                                                    <img src={item.photoUrl} alt="Bukti" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group/photo:opacity-100 transition-opacity backdrop-blur-[2px]">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setChecklist(prev => prev.map(i => i.assetId === item.assetId ? { ...i, photoUrl: "" } : i))}
                                                            className="bg-rose-500 text-white p-2 rounded-lg shadow-lg"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className={clsx(
                                                    "w-full h-16 flex items-center justify-center gap-3 rounded-xl border border-dashed transition-all cursor-pointer",
                                                    uploadingAssetId === item.assetId 
                                                        ? "bg-gray-50 border-brand-purple/20" 
                                                        : "bg-brand-purple/5 border-brand-purple/10 hover:bg-brand-purple/10"
                                                )}>
                                                    {uploadingAssetId === item.assetId ? (
                                                        <Loader2 className="w-4 h-4 animate-spin text-brand-purple" />
                                                    ) : (
                                                        <>
                                                            <Camera className="w-4 h-4 text-brand-purple/50" />
                                                            <span className="text-[10px] font-bold text-brand-purple/70 uppercase">Ambil Bukti Foto</span>
                                                        </>
                                                    )}
                                                    <input 
                                                        type="file" accept="image/*" capture="environment" className="hidden" 
                                                        onChange={(e) => e.target.files?.[0] && handlePhotoCapture(item.assetId, e.target.files[0])}
                                                        disabled={!!uploadingAssetId}
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {assets.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100/50">
                        <label className="block text-[11px] font-black uppercase text-gray-900 tracking-widest mb-3 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-4 h-4 text-brand-purple" /> Status Ruangan
                            </div>
                            {isLockedToFinished && (
                                <span className="text-[8px] font-black text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full animate-pulse border border-rose-100">Live Closing Required</span>
                            )}
                        </label>

                        {isLockedToFinished && (
                            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-[10px] text-amber-700 font-medium leading-tight">
                                    Wajib pilih <span className="font-bold underline">Selesai Live</span> untuk menutup sesi sebelumnya.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: "LIVE_NOW", label: "Live Now", c: "emerald", icon: Video },
                                { id: "READY_FOR_LIVE", label: "Siap Live", c: "green", icon: CheckCircle2 },
                                { id: "NOT_READY", label: "Ada Kendala", c: "rose", icon: Ban },
                                { id: "STANDBY", label: "Standby", c: "amber", icon: Clock },
                            ].map((s) => (
                                <button
                                    key={s.id} type="button"
                                    disabled={isLockedToFinished && s.id !== "FINISHED_LIVE"}
                                    onClick={() => setRoomStatus(s.id as any)}
                                    className={clsx(
                                        "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all",
                                        isLockedToFinished && s.id !== "FINISHED_LIVE" && "opacity-20 grayscale cursor-not-allowed",
                                        roomStatus === s.id
                                            ? s.c === 'emerald' ? "bg-emerald-50 border-emerald-500 text-emerald-700"
                                            : s.c === 'green' ? "bg-green-50 border-green-500 text-green-700"
                                            : s.c === 'rose' ? "bg-rose-50 border-rose-500 text-rose-700"
                                            : "bg-amber-50 border-amber-500 text-amber-700"
                                            : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                                    )}
                                >
                                    <s.icon className={clsx("w-5 h-5", roomStatus === s.id ? "" : "text-gray-300")} />
                                    <span className="text-[10px] font-bold uppercase tracking-tighter">{s.label}</span>
                                </button>
                            ))}
                            <button
                                type="button"
                                onClick={() => setRoomStatus("FINISHED_LIVE")}
                                className={clsx(
                                    "col-span-2 flex items-center justify-center gap-3 p-3 rounded-xl border-2 transition-all",
                                    isLockedToFinished && "border-blue-400 bg-blue-50/50",
                                    roomStatus === "FINISHED_LIVE"
                                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-400 hover:bg-gray-100"
                                )}
                            >
                                <div className="relative">
                                    <Flag className={clsx("w-5 h-5", roomStatus === "FINISHED_LIVE" ? "text-blue-500" : "text-gray-300")} />
                                    {isLockedToFinished && (
                                        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600 border border-white"></span>
                                        </span>
                                    )}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest">Selesai Live (Tutup Sesi)</span>
                            </button>
                        </div>
                    </div>
                )}

                {assets.length > 0 && (
                    <div className="bg-white rounded-2xl p-4 border border-gray-100/50">
                        <textarea
                            rows={2}
                            value={overallNotes}
                            onChange={(e) => setOverallNotes(e.target.value)}
                            placeholder="Catatan tambahan ruangan..."
                            className="w-full bg-gray-50 rounded-xl px-4 py-2 text-[11px] text-gray-900 border border-transparent focus:bg-white focus:border-brand-purple/20 transition-all outline-none"
                        />
                    </div>
                )}

                {assets.length > 0 && (
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-14 rounded-2xl font-black text-white bg-gradient-to-r from-green-500 to-emerald-600 shadow-lg shadow-emerald-500/20 flex items-center justify-center text-sm uppercase tracking-widest hover:brightness-105 active:scale-95 transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>Simpan Laporan <Send className="w-4 h-4 ml-2" /></>
                        )}
                    </button>
                )}
            </form>
        </div>

    );
}
