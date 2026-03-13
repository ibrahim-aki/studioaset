"use client";

import { use, useEffect, useState } from "react";
import { useLocalDb } from "@/context/LocalDbContext";
import { useAuth } from "@/context/AuthContext";
import { Video, Loader2, ArrowLeft, CheckCircle2, AlertTriangle, AlertOctagon, Send, Zap, Ban, ClipboardCheck, Flag, Clock, User, History, ChevronDown, ChevronUp, XCircle, Search, Plus, Package, Camera, Trash2 } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
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
            const compressedBlob = await compressImage(file);
            const fileName = `checklist-photos/${new Date().toISOString().split('T')[0]}/${assetId}_${Date.now()}.jpg`;
            const storageRef = ref(storage, fileName);
            await uploadBytes(storageRef, compressedBlob);
            const url = await getDownloadURL(storageRef);
            
            setChecklist(prev => prev.map(item => 
                item.assetId === assetId ? { ...item, photoUrl: url } : item
            ));
        } catch (error) {
            console.error("Upload error:", error);
            alert("Gagal mengunggah foto. Pastikan koneksi internet stabil.");
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
                                            <div>
                                                <h3 className="font-black text-gray-900 text-base tracking-tight">{item.assetName}</h3>
                                                {(() => {
                                                    const master = rawAssets.find(ma => ma.id === item.assetId);
                                                    const isClientAsset = master?.category?.toLowerCase().includes("client asset") ||
                                                        master?.category?.toLowerCase().includes("client aset");
                                                    if (isClientAsset) return <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">(Opsional)</span>;
                                                    return null;
                                                })()}
                                            </div>
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

                                    {/* Action Box: Photo Capture (Hanya muncul jika diaktifkan di Super Admin) */}
                                    {currentCompany?.requireChecklistPhoto && (
                                        <div className="mt-2">
                                            {item.photoUrl ? (
                                                <div className="relative w-full h-40 rounded-2xl overflow-hidden border-2 border-green-500 shadow-inner group/photo">
                                                    <img src={item.photoUrl} alt="Bukti Foto" className="w-full h-full object-cover" />
                                                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group/photo:opacity-100 transition-opacity">
                                                        <button 
                                                            type="button"
                                                            onClick={() => setChecklist(prev => prev.map(i => i.assetId === item.assetId ? { ...i, photoUrl: "" } : i))}
                                                            className="bg-white/20 hover:bg-white/40 p-3 rounded-full backdrop-blur-md text-white transition-all"
                                                        >
                                                            <Trash2 className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                    <div className="absolute bottom-2 left-2 bg-green-500 text-white text-[8px] font-black px-2 py-1 rounded-lg uppercase tracking-widest shadow-lg">
                                                        Foto Tersimpan
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className={clsx(
                                                    "w-full h-32 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed transition-all cursor-pointer",
                                                    uploadingAssetId === item.assetId 
                                                        ? "bg-gray-50 border-purple-200" 
                                                        : "bg-purple-50/50 border-purple-200 hover:bg-purple-50 hover:border-purple-300"
                                                )}>
                                                    {uploadingAssetId === item.assetId ? (
                                                        <div className="flex flex-col items-center animate-pulse">
                                                            <Loader2 className="w-6 h-6 animate-spin text-purple-600 mb-1" />
                                                            <span className="text-[10px] font-black text-purple-600 uppercase">Mengompres & Upload...</span>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                                                                <Camera className="w-6 h-6" />
                                                            </div>
                                                            <div className="text-center">
                                                                <p className="text-[11px] font-black text-purple-700 uppercase tracking-tight">Ambil Foto Aset</p>
                                                                <p className="text-[9px] text-purple-400 font-bold uppercase">(Wajib Kamera)</p>
                                                            </div>
                                                        </>
                                                    )}
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        capture="environment" 
                                                        className="hidden" 
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
                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100/50">
                        <label className="block text-sm font-bold text-gray-900 mb-4 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className="w-5 h-5 text-purple-600" /> Status Kesiapan Ruangan
                            </div>
                            {isLockedToFinished && (
                                <span className="text-[10px] font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100 animate-pulse">
                                    LIVE CLOSING REQUIRED
                                </span>
                            )}
                        </label>

                        {isLockedToFinished && (
                            <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                                <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                                    <AlertTriangle className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-black text-amber-900 uppercase tracking-tight">Sesi Live Belum Ditutup</p>
                                    <p className="text-[10px] text-amber-700 font-medium leading-relaxed mt-1">
                                        Status terakhir ruangan ini adalah <span className="font-bold underline">SEDANG LIVE</span>. Anda wajib memilih status <span className="font-bold">SELESAI LIVE</span> untuk menandai berakhirnya sesi sebelum bisa mengubah ke status lain di checklist berikutnya.
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-3">
                            <button
                                type="button"
                                disabled={isLockedToFinished}
                                onClick={() => setRoomStatus("LIVE_NOW")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    isLockedToFinished && "opacity-40 grayscale cursor-not-allowed",
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
                                    <p className="text-xs opacity-70 text-nowrap">Studio sedang aktif menyiarkan live</p>
                                </div>
                            </button>

                            <button
                                type="button"
                                disabled={isLockedToFinished}
                                onClick={() => setRoomStatus("READY_FOR_LIVE")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    isLockedToFinished && "opacity-40 grayscale cursor-not-allowed",
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
                                disabled={isLockedToFinished}
                                onClick={() => setRoomStatus("NOT_READY")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    isLockedToFinished && "opacity-40 grayscale cursor-not-allowed",
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
                                disabled={isLockedToFinished}
                                onClick={() => setRoomStatus("STANDBY")}
                                className={clsx(
                                    "flex items-center gap-4 p-4 rounded-2xl border-2 transition-all",
                                    isLockedToFinished && "opacity-40 grayscale cursor-not-allowed",
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
                                    isLockedToFinished && "border-blue-400 bg-blue-50/50",
                                    roomStatus === "FINISHED_LIVE"
                                        ? "bg-blue-50 border-blue-500 text-blue-700 shadow-sm"
                                        : "bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100"
                                )}
                            >
                                <div className={clsx(
                                    "w-10 h-10 rounded-full flex items-center justify-center relative",
                                    roomStatus === "FINISHED_LIVE" ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-400"
                                )}>
                                    <Flag className="w-6 h-6" />
                                    {isLockedToFinished && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-600 border-2 border-white"></span>
                                        </span>
                                    )}
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
