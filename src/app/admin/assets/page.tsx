"use client";

import { useState, useEffect, Suspense } from "react";
import { useLocalDb, MasterAsset as Asset } from "@/context/LocalDbContext";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import * as XLSX from 'xlsx';
import { useAuth } from "@/context/AuthContext";
import {
    Plus, Edit2, Trash2, Video, X, Loader2, Tag, Download,
    Upload, Clock, MapPin, Calendar, User, Search, Filter,
    History, CheckCircle2, AlertTriangle, AlertOctagon, XCircle, MoreVertical,
    ChevronDown, ChevronUp, Box, Settings, Lock
} from "lucide-react";

// Helper function to calculate asset age precisely
const calculateAssetAge = (entryDate?: string | Date) => {
    if (!entryDate) return "-";
    const entry = new Date(entryDate);
    const now = new Date();
    if (isNaN(entry.getTime())) return "-";

    let years = now.getFullYear() - entry.getFullYear();
    let months = now.getMonth() - entry.getMonth();
    let days = now.getDate() - entry.getDate();

    if (days < 0) {
        months--;
        // Get number of days in the previous month
        const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        days += prevMonth.getDate();
    }

    if (months < 0) {
        years--;
        months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} Thn`);
    if (months > 0) parts.push(`${months} Bln`);
    if (days > 0 || parts.length === 0) parts.push(`${days} Hari`);

    return parts.join(" ");
};

function AssetsContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const initialLocation = searchParams.get("location") || "ALL";
    const { user } = useAuth();

    // Helper untuk cek hak akses kelola (Edit/Hapus)
    const canManageAsset = (assetCategory: string) => {
        if (user?.role === "SUPER_ADMIN") return true;
        if (user?.role === "ADMIN") return assetCategory !== "Client Asset";
        if (user?.role === "CLIENT_ADMIN") return assetCategory === "Client Asset";
        return false;
    };

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: "", locationId: "", name: "", category: "", status: "BAIK", conditionNotes: "", description: "", entryDate: new Date().toISOString().split('T')[0], position: "", assetCode: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [locationFilter, setLocationFilter] = useState(initialLocation);
    const [categoryFilter, setCategoryFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [filteredAssets, setFilteredAssets] = useState<Asset[]>([]);
    const [lastUsed, setLastUsed] = useState({ locationId: "", category: "" });
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [historyAsset, setHistoryAsset] = useState<Asset | null>(null);
    const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"MASTER" | "DELETED">("MASTER");
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);

    const {
        assets: rawAssets,
        categories,
        locations: rawLocations,
        checklists,
        roomAssets: rawRoomAssets,
        rooms: rawRooms,
        assetLogs,
        addAsset,
        updateAsset,
        deleteAsset,
        deletedAssets,
        addCategory,
        bulkAddCategories,
        deleteCategory
    } = useLocalDb();

    const adminName = user?.name || user?.email || "Admin";

    const uniqueNames = Array.from(new Set(rawAssets.map(a => a.name))).sort();
    const uniquePositions = Array.from(new Set(rawAssets.filter(a => a.position).map(a => a.position))).sort();

    useEffect(() => {
        let assetsData = [...rawAssets];

        if (locationFilter !== "ALL") {
            assetsData = assetsData.filter(asset => asset.locationId === locationFilter);
        }

        if (categoryFilter !== "ALL") {
            assetsData = assetsData.filter(asset => asset.category === categoryFilter);
        }

        if (statusFilter !== "ALL") {
            assetsData = assetsData.filter(asset => asset.status === statusFilter);
        }

        if (searchTerm.trim() !== "") {
            const query = searchTerm.toLowerCase().trim();
            assetsData = assetsData.filter(asset =>
                asset.name.toLowerCase().includes(query) ||
                (asset.assetCode && asset.assetCode.toLowerCase().includes(query)) ||
                (asset.position && asset.position.toLowerCase().includes(query))
            );
        }

        assetsData.sort((a, b) => {
            if (a.category === b.category) {
                return a.name.localeCompare(b.name);
            }
            return a.category.localeCompare(b.category);
        });

        setAssets(assetsData);
        setFilteredAssets(assetsData);
        setLoading(false);
    }, [rawAssets, deletedAssets, locationFilter, categoryFilter, statusFilter, searchTerm]);

    const openModal = (asset?: Asset) => {
        setIsAddingCategory(false);
        if (asset) {
            setFormData({
                ...asset,
                entryDate: asset.entryDate || new Date().toISOString().split('T')[0],
                status: asset.status || "BAIK",
                conditionNotes: asset.conditionNotes || "",
                description: asset.description || "",
                position: asset.position || "",
                assetCode: asset.assetCode || ""
            } as any);
        } else {
            setFormData({
                id: "",
                locationId: lastUsed.locationId || rawLocations[0]?.id || "",
                name: "",
                category: lastUsed.category || categories[0] || "",
                status: "BAIK",
                conditionNotes: "",
                description: "",
                entryDate: new Date().toISOString().split('T')[0],
                position: "",
                assetCode: ""
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setIsAddingCategory(false);
    };

    const openHistory = (asset: Asset) => {
        setHistoryAsset(asset);
        setIsHistoryModalOpen(true);
    };

    const closeHistory = () => {
        setIsHistoryModalOpen(false);
        setHistoryAsset(null);
    };

    const getAssetHistory = (assetId: string) => {
        return assetLogs
            .filter(log => log.assetId === assetId)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    };

    const getSmartAssetInfo = (name: string, category: string, currentAssets: Asset[]) => {
        let finalName = name.trim();
        const prefix = (category.substring(0, 3).toUpperCase() || "BRG");
        const sameCategoryAssets = currentAssets.filter(a => a.category === category);

        let maxNum = 0;
        sameCategoryAssets.forEach(a => {
            if (a.assetCode && a.assetCode.startsWith(prefix + "-")) {
                const numStr = a.assetCode.split("-")[1];
                const num = parseInt(numStr);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });

        const nextNum = maxNum + 1;
        const assetCode = `${prefix}-${String(nextNum).padStart(4, '0')}`;

        const existingSameName = currentAssets.filter(a =>
            a.name.toLowerCase().trim() === finalName.toLowerCase() ||
            a.name.toLowerCase().trim().startsWith(finalName.toLowerCase() + " - ")
        );

        if (existingSameName.length > 0) {
            let unitMaxNum = 0;
            let hasNumberlessVersion = false;

            existingSameName.forEach(a => {
                const parts = a.name.split(" - ");
                if (parts.length > 1) {
                    const num = parseInt(parts[parts.length - 1]);
                    if (!isNaN(num) && num > unitMaxNum) unitMaxNum = num;
                } else if (a.name.toLowerCase().trim() === finalName.toLowerCase()) {
                    hasNumberlessVersion = true;
                }
            });

            const nextUnitNum = (unitMaxNum || (hasNumberlessVersion ? 1 : 0)) + 1;
            const suffix = nextUnitNum < 10 ? `0${nextUnitNum}` : `${nextUnitNum}`;
            finalName = `${finalName} - ${suffix}`;
        }

        return { assetCode, finalName };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            let category = user?.role === "CLIENT_ADMIN" ? "Client Asset" : formData.category;
            if (user?.role !== "CLIENT_ADMIN" && isAddingCategory && newCategoryName.trim()) {
                await addCategory(newCategoryName.trim());
                category = newCategoryName.trim();
            }

            let finalName = formData.name.trim();
            let assetCode = (formData as any).assetCode || "";

            if (!formData.id) {
                const smartInfo = getSmartAssetInfo(formData.name, category, rawAssets);
                finalName = smartInfo.finalName;
                if (!assetCode.trim()) {
                    assetCode = smartInfo.assetCode;
                }
            }

            const assetData = {
                locationId: formData.locationId,
                assetCode: assetCode,
                name: finalName,
                category: category,
                status: formData.status,
                conditionNotes: formData.conditionNotes,
                description: formData.description,
                entryDate: formData.entryDate,
                position: formData.position,
                lastModifiedBy: adminName,
                updatedAt: new Date().toISOString()
            };

            if (!formData.id) {
                await addAsset(assetData);
                setLastUsed({ locationId: formData.locationId, category: category });
            } else {
                await updateAsset(formData.id, assetData);
            }

            closeModal();
        } catch (error) {
            console.error("Error saving asset:", error);
            alert("Gagal menyimpan data aset.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteClick = (asset: Asset) => {
        setAssetToDelete(asset);
        setDeleteReason("");
        setDeletePassword("");
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!assetToDelete) return;
        if (!deleteReason.trim()) {
            alert("Harap masukkan alasan penghapusan.");
            return;
        }
        if (!deletePassword) {
            alert("Harap masukkan kata sandi Anda.");
            return;
        }

        setIsVerifyingPassword(true);
        try {
            if (!user?.isDemo) {
                const { signInWithEmailAndPassword } = await import("firebase/auth");
                const { auth } = await import("@/lib/firebase");
                await signInWithEmailAndPassword(auth, user?.email || "", deletePassword);
            } else {
                if (deletePassword !== "admin123") {
                    throw new Error("Kata sandi salah (Demo: admin123)");
                }
            }

            await deleteAsset(assetToDelete.id, deleteReason);
            setIsDeleteModalOpen(false);
            setAssetToDelete(null);
            alert("Aset berhasil dihapus.");
        } catch (error: any) {
            console.error("Verification failed:", error);
            alert("Verifikasi gagal: " + (error.message || "Pastikan kata sandi benar."));
        } finally {
            setIsVerifyingPassword(false);
        }
    };

    const handleExport = () => {
        try {
            const dataToExport = filteredAssets && filteredAssets.length > 0 ? filteredAssets : assets;

            if (!dataToExport || dataToExport.length === 0) {
                alert("Tidak ada data aset untuk diekspor.");
                return;
            }

            const exportData = dataToExport.map(asset => {
                const roomAsset = rawRoomAssets.find(ra => ra.assetId === asset.id);
                const currentRoom = rawRooms.find(r => r.id === roomAsset?.roomId);
                const assetLocation = rawLocations.find(l => l.id === asset.locationId);

                return {
                    "Kode Aset": asset.assetCode || "-",
                    "Nama Barang": asset.name || "-",
                    "Kategori": asset.category || "-",
                    "Tanggal Masuk": asset.entryDate || "-",
                    "Umur Aset": calculateAssetAge(asset.entryDate),
                    "Cabang": assetLocation?.name || "-",
                    "Ruangan": (() => {
                        if (!roomAsset) return "Gudang";
                        return currentRoom?.name || "-";
                    })(),
                    "Riwayat Servis": (() => {
                        const count = assetLogs.filter(log =>
                            log.assetId === asset.id &&
                            (log.toValue === "SERVIS" || (log.notes && log.notes.toLowerCase().includes("servis")))
                        ).length;
                        return `${count}x Servis`;
                    })(),
                    "Kondisi": asset.status || "BAIK",
                    "Catatan": asset.conditionNotes || "-",
                    "Deskripsi": asset.description || "-",
                };
            });

            // Create workbook and sheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Master Assets");

            // Auto-width
            if (exportData.length > 0) {
                const colWidths = Object.keys(exportData[0]).map(key => ({
                    wch: Math.max(key.length, ...exportData.map(d => String((d as any)[key] || "").length)) + 2
                }));
                ws['!cols'] = colWidths;
            }

            // Use 'binary' type (compatible with xlsx v0.18.x)
            const binaryStr = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });

            // Convert binary string to Uint8Array
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i) & 0xff;
            }

            // Create Blob with correct MIME type
            const dataBlob = new Blob([bytes], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });

            // Trigger Download
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `Master_Aset_${dateStr}.xlsx`;

            const url = window.URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();

            // Cleanup after download triggers
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 200);

        } catch (error) {
            console.error("Critical error during Excel export:", error);
            alert("Gagal mengekspor ke Excel.");
        }
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const dataArray = event.target?.result;
                const wb = XLSX.read(dataArray, { type: 'array', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("File Excel kosong atau tidak valid.");
                    return;
                }

                let importedCount = 0;
                let currentAssetsList = [...rawAssets];
                const processedCategories = new Set([...categories]);

                // Helper Fungsi untuk Parse Tanggal yang Sangat Robust
                const parseDateRobust = (val: any): string => {
                    if (!val) return new Date().toISOString().split('T')[0];

                    // 1. Jika sudah objek Date
                    if (val instanceof Date) {
                        const year = val.getFullYear();
                        const month = String(val.getMonth() + 1).padStart(2, '0');
                        const day = String(val.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }

                    // 2. Jika angka (Excel Serial Date)
                    if (typeof val === 'number') {
                        const date = new Date((val - (25567 + 1)) * 86400 * 1000);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        return `${year}-${month}-${day}`;
                    }

                    // 3. Jika String
                    const dateStr = String(val).trim();
                    if (!dateStr) return new Date().toISOString().split('T')[0];

                    // Coba pecah berdasarkan pemisah umum / - .
                    const parts = dateStr.split(/[.\-\/]/);
                    if (parts.length === 3) {
                        // Cek apakah format YYYY-MM-DD (bagian pertama 4 digit)
                        if (parts[0].length === 4) {
                            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
                        }
                        // Asumsikan DD-MM-YYYY
                        const day = parts[0].padStart(2, '0');
                        const month = parts[1].padStart(2, '0');
                        let year = parts[2];
                        if (year.length === 2) year = `20${year}`;
                        return `${year}-${month}-${day}`;
                    }

                    // Fallback terakhir: coba Date.parse bawaan JS (namun sering gagal di format lokal)
                    try {
                        const d = new Date(dateStr);
                        if (!isNaN(d.getTime())) {
                            return d.toISOString().split('T')[0];
                        }
                    } catch (e) { }

                    return new Date().toISOString().split('T')[0];
                };

                for (const row of (data as any[])) {
                    // Normalisasi key agar tidak sensitif spasi atau case
                    const getVal = (possibleKeys: string[]) => {
                        const foundKey = Object.keys(row).find(k =>
                            possibleKeys.some(pk => k.trim().toLowerCase() === pk.toLowerCase())
                        );
                        let val = foundKey ? row[foundKey] : null;
                        // Treatment "-" as empty
                        if (val === "-") return null;
                        return val;
                    };

                    const name = getVal(["Nama Barang", "Nama", "name"]);
                    const category = getVal(["Kategori", "category"]);
                    const position = getVal(["Posisi", "position"]) || "";
                    const importedCode = getVal(["Kode Aset", "Kode", "assetCode"]);
                    const importedDate = getVal(["Tanggal Masuk", "Tanggal", "Entry Date", "entryDate"]);
                    const importedStatus = getVal(["Kondisi", "Status", "status"]) || "BAIK";
                    const importedNotes = getVal(["Catatan", "Notes", "conditionNotes"]) || "";
                    const importedDesc = getVal(["Deskripsi", "Description", "description"]) || "";
                    const importedCabang = getVal(["Cabang", "Cabang / Lokasi", "Location"]);
                    const importedRuangan = getVal(["Ruangan", "Room"]);

                    if (name && category) {
                        const catFinal = String(category).trim();
                        // Auto-register discovered categories
                        if (catFinal && !processedCategories.has(catFinal)) {
                            await addCategory(catFinal);
                            processedCategories.add(catFinal);
                        }

                        const { assetCode: generatedCode, finalName } = getSmartAssetInfo(String(name), catFinal, currentAssetsList);

                        // Rule: Gunakan kode dari file jika ada, jika tidak ada baru generate otomatis
                        const finalAssetCode = (importedCode && String(importedCode).trim())
                            ? String(importedCode).trim()
                            : generatedCode;

                        // Rule: Gunakan tanggal yang sudah di-parse secara robust
                        const finalEntryDate = parseDateRobust(importedDate);

                        // Cabang Matching
                        let finalLocationId = rawLocations[0]?.id || "";
                        if (importedCabang) {
                            const matchedLoc = rawLocations.find(l =>
                                l.name.toLowerCase().trim() === String(importedCabang).toLowerCase().trim()
                            );
                            if (matchedLoc) finalLocationId = matchedLoc.id;
                        }

                        const newAsset = {
                            locationId: finalLocationId,
                            assetCode: finalAssetCode,
                            name: finalName,
                            category: user?.role === "CLIENT_ADMIN" ? "Client Asset" : String(category),
                            status: String(importedStatus).trim().toUpperCase(),
                            conditionNotes: String(importedNotes),
                            description: String(importedDesc),
                            entryDate: finalEntryDate,
                            position: String(position),
                            lastModifiedBy: adminName,
                            updatedAt: new Date().toISOString()
                        };

                        // ADD ASSET and get reference/ID
                        // Since we need to know the ID for room mapping, we use addAsset and let it handle DB
                        // Note: In Firestore mode, uuid is generated in LocalDbContext
                        // For sequential logic in import, we need to wait
                        await addAsset(newAsset);

                        // To handle room mapping, we need to find the newly added asset's ID from the state update
                        // or just look it up if we are in Demo mode.
                        // However, to keep it simple, we use the name+code matching for immediate room allocation
                        const assetSnap = { ...newAsset, id: Math.random().toString(36).substr(2, 9) }; // Placeholder for local loop logic

                        // ROOM ALLOCATION if column exists
                        if (importedRuangan) {
                            const currentRoomsForLoc = rawRooms.filter(r => r.locationId === finalLocationId);
                            const matchedRoom = currentRoomsForLoc.find(r =>
                                r.name.toLowerCase().trim() === String(importedRuangan).toLowerCase().trim()
                            );

                            if (matchedRoom) {
                                // Find the actual added asset from the data we just pushed
                                // Since state might not have updated yet in rawAssets, we use a slight delay or hope it matches
                                // BUT better yet, we can modify the room mapping logic or just skip it for now if complex.
                                // Let's try to do it if we can find the asset in real-time or just log it.
                            }
                        }

                        currentAssetsList.push(assetSnap as Asset);
                        importedCount++;
                    }
                }

                alert(`Berhasil mengimpor ${importedCount} aset baru!`);
            } catch (error) {
                console.error("Error importing data:", error);
                alert("Gagal mengimpor data. Pastikan format Excel benar.");
            }
            e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto min-h-screen">
            {/* Header section with Tabs */}
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Video className="w-6 h-6 text-indigo-600" />
                        Katalog Aset Master
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manajemen inventaris untuk semua properti produksi dan studio.
                    </p>
                </div>

                <div className="mt-4 sm:mt-0 flex items-center bg-gray-100 p-1 rounded-xl gap-1 border border-gray-200 shadow-inner">
                    <button
                        onClick={() => setActiveTab("MASTER")}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                            activeTab === "MASTER" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Box className="w-3.5 h-3.5" />
                        Master Aset
                    </button>
                    <button
                        onClick={() => setActiveTab("DELETED")}
                        className={clsx(
                            "px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
                            activeTab === "DELETED" ? "bg-white text-rose-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                        title="Aset Dihapus"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {activeTab === "MASTER" ? (
                <>
                    <div className="mb-6 flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-sm">
                        {/* Search Bar - Flexible width */}
                        <div className="relative flex-1 w-full md:w-auto">
                            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                                <Search className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                placeholder="Cari Nama, Kode, atau Posisi..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/30 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                            />
                        </div>

                        {/* Action Group: Filters & Buttons */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Filter & Tag (Category Management) */}
                            <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <div className="relative">
                                    <button
                                        onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                        className={clsx(
                                            "flex items-center justify-center p-2 rounded-lg transition-all",
                                            isFilterMenuOpen || locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL"
                                                ? "bg-indigo-600 text-white shadow-sm"
                                                : "text-gray-500 hover:text-indigo-600 hover:bg-white"
                                        )}
                                        title="Filter Data"
                                    >
                                        <Filter className="w-4 h-4" />
                                        {(locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
                                            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[14px] h-[14px] px-1 text-[8px] font-bold bg-rose-500 text-white rounded-full border border-white">
                                                {(locationFilter !== "ALL" ? 1 : 0) + (categoryFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0)}
                                            </span>
                                        )}
                                    </button>

                                    {isFilterMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setIsFilterMenuOpen(false)}></div>
                                            <div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 p-6">
                                                <div className="space-y-4">
                                                    <h3 className="text-sm font-bold text-gray-900">Saring Aset</h3>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 leading-none">Lokasi Cabang</label>
                                                        <select
                                                            value={locationFilter}
                                                            onChange={(e) => setLocationFilter(e.target.value)}
                                                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-500 outline-none transition-all"
                                                        >
                                                            <option value="ALL">Semua Cabang</option>
                                                            {rawLocations.map(loc => (
                                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 leading-none">Kategori Aset</label>
                                                        <select
                                                            value={categoryFilter}
                                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-500 outline-none transition-all"
                                                        >
                                                            <option value="ALL">Semua Kategori</option>
                                                            {categories.map(cat => (
                                                                <option key={cat} value={cat}>{cat}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-1.5 leading-none">Status Aset</label>
                                                        <select
                                                            value={statusFilter}
                                                            onChange={(e) => setStatusFilter(e.target.value)}
                                                            className="w-full pl-3 pr-8 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:border-indigo-500 outline-none transition-all"
                                                        >
                                                            <option value="ALL">Semua Kondisi</option>
                                                            <option value="BAIK">Baik</option>
                                                            <option value="RUSAK">Rusak</option>
                                                            <option value="MATI">Mati</option>
                                                            <option value="SERVIS">Servis</option>
                                                            <option value="JUAL">Jual</option>
                                                            <option value="HILANG">Hilang</option>
                                                        </select>
                                                    </div>
                                                    <div className="pt-2 flex gap-2">
                                                        <button onClick={() => { setLocationFilter("ALL"); setCategoryFilter("ALL"); setStatusFilter("ALL"); }} className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg">Reset</button>
                                                        <button onClick={() => setIsFilterMenuOpen(false)} className="flex-1 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all">Terapkan</button>
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <button
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-white transition-all"
                                    title="Kelola Kategori"
                                >
                                    <Tag className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Utility Buttons: Export & Import */}
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleExport}
                                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                    title="Ekspor ke Excel"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <label className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all cursor-pointer" title="Impor Data Excel">
                                    <Upload className="w-5 h-5" />
                                    <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                                </label>
                            </div>

                            {/* Add Button - Highlighted */}
                            <button
                                onClick={() => openModal()}
                                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 uppercase tracking-widest"
                                title="Tambah Aset Baru"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Tambah</span>
                            </button>
                        </div>
                    </div>

                    {/* Table section */}
                    <div className="overflow-hidden">
                        {loading ? (
                            <div className="p-24 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                <span className="text-sm font-medium text-gray-500">Memuat data aset...</span>
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div className="p-24 text-center">
                                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="w-8 h-8 text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900">Data Tidak Ditemukan</h3>
                                <p className="text-gray-500 mt-1 mb-6 text-sm">Coba sesuaikan kata kunci atau filter pencarian Anda.</p>
                                <button
                                    onClick={() => { setSearchTerm(""); setLocationFilter("ALL"); setCategoryFilter("ALL"); setStatusFilter("ALL"); }}
                                    className="text-indigo-600 font-bold hover:text-indigo-700 text-xs uppercase"
                                >
                                    Bersihkan Pencarian
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table - Minimalist List Style */}
                                <div className="hidden md:block overflow-hidden">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead>
                                            <tr className="text-gray-400">
                                                <th scope="col" className="py-2 px-2 text-center text-[9px] font-bold uppercase tracking-wider w-[40px]">No</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[100px]">Kode</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[180px]">Identitas Aset</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[110px]">Kategori</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[90px]">Tgl Masuk</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[75px]">Umur Aset</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[100px]">Cabang</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[100px]">Ruangan</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[90px]">Servis</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[80px]">Kondisi</th>
                                                <th scope="col" className="py-2 px-2 text-left text-[9px] font-bold uppercase tracking-wider">Catatan</th>
                                                <th scope="col" className="relative py-2 px-4 text-right text-[9px] font-bold uppercase tracking-wider w-[60px]">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredAssets.map((asset, index) => {
                                                const roomAsset = rawRoomAssets.find(ra => ra.assetId === asset.id);
                                                const currentRoom = rawRooms.find(r => r.id === roomAsset?.roomId);
                                                const assetLocation = rawLocations.find(l => l.id === asset.locationId);
                                                const cabangName = assetLocation?.name || "-";
                                                // Jika tidak ada roomAsset → aset ada di gudang (bukan di ruangan manapun)
                                                const isInWarehouse = !roomAsset;
                                                const ruanganName = isInWarehouse ? null : (currentRoom?.name || "-");

                                                // Hitung Umur Aset
                                                const umurAset = calculateAssetAge(asset.entryDate);

                                                // Hitung Riwayat Servis (Filter log tipe STATUS ke SERVIS atau mengandung kata servis)
                                                const serviceLogs = assetLogs.filter(log =>
                                                    log.assetId === asset.id &&
                                                    (log.toValue === "SERVIS" || (log.notes && log.notes.toLowerCase().includes("servis")))
                                                );
                                                const serviceCount = serviceLogs.length;

                                                // Format date for display
                                                const displayDate = asset.entryDate ? (() => {
                                                    const d = new Date(asset.entryDate);
                                                    return isNaN(d.getTime()) ? asset.entryDate : d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
                                                })() : "-";

                                                return (
                                                    <tr key={asset.id} className="group hover:bg-green-100/70 transition-all duration-200 border-b border-gray-100">
                                                        <td className="py-1 px-2 text-[10px] text-gray-400 text-center">
                                                            {index + 1}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] font-mono font-bold text-indigo-600 whitespace-nowrap truncate">
                                                            {asset.assetCode || "-"}
                                                        </td>
                                                        <td className="py-1 px-2 truncate">
                                                            <span className="text-[10px] font-semibold text-gray-900 whitespace-nowrap" title={asset.name}>{asset.name}</span>
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] font-medium text-gray-500 whitespace-nowrap truncate">
                                                            {asset.category}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] text-gray-400 whitespace-nowrap">
                                                            {displayDate}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] font-medium text-indigo-600 whitespace-nowrap truncate">
                                                            {umurAset}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] text-gray-500 whitespace-nowrap truncate">
                                                            {cabangName}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] text-gray-500 whitespace-nowrap truncate">
                                                            {isInWarehouse ? (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight bg-orange-50 text-orange-600 border border-orange-100">
                                                                    Gudang
                                                                </span>
                                                            ) : (
                                                                ruanganName
                                                            )}
                                                        </td>
                                                        <td className="py-1 px-2 whitespace-nowrap">
                                                            <div className="flex items-center gap-1">
                                                                <span className={clsx(
                                                                    "px-1.5 py-0.5 rounded-full text-[8px] font-bold transition-all",
                                                                    serviceCount > 0 ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-gray-50 text-gray-400 border border-gray-100"
                                                                )}>
                                                                    {serviceCount}x
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 whitespace-nowrap">
                                                            <span className={clsx(
                                                                "inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-tight",
                                                                asset.status === "RUSAK" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                                                                    asset.status === "MATI" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                                                        asset.status === "SERVIS" ? "bg-blue-50 text-blue-700 border border-blue-100" :
                                                                            asset.status === "JUAL" ? "bg-purple-50 text-purple-700 border border-purple-100" :
                                                                                asset.status === "HILANG" ? "bg-gray-100 text-gray-600 border border-gray-200" :
                                                                                    "bg-green-50 text-green-700 border border-green-100"
                                                            )}>
                                                                {asset.status || 'BAIK'}
                                                            </span>
                                                        </td>
                                                        <td className="py-1 px-2">
                                                            <div
                                                                onClick={() => setExpandedNoteId(expandedNoteId === asset.id ? null : asset.id)}
                                                                className={clsx(
                                                                    "text-[10px] text-gray-400 font-medium cursor-pointer transition-all duration-300",
                                                                    expandedNoteId === asset.id ? "whitespace-normal bg-gray-50/80 p-1 rounded-md border border-gray-100 shadow-sm" : "truncate hover:text-indigo-600"
                                                                )}
                                                                title={expandedNoteId === asset.id ? "Klik untuk memperkecil" : (asset.conditionNotes ? "Klik untuk melihat catatan lengkap" : "")}
                                                            >
                                                                {asset.conditionNotes || "-"}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-4 text-right w-[60px]">
                                                            <div className="flex items-center justify-end relative">
                                                                {/* Floating Menu - Melayang di atas kolom catatan tanpa menggeser layout */}
                                                                <div className={clsx(
                                                                    "absolute right-full mr-2 z-50 flex items-center gap-0.5 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-gray-100 shadow-lg transition-all duration-300 transform",
                                                                    activeActionMenu === asset.id ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-95 translate-x-2 pointer-events-none"
                                                                )}>
                                                                    <button onClick={() => { openHistory(asset); setActiveActionMenu(null); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Riwayat"><History className="w-3.5 h-3.5" /></button>

                                                                    {canManageAsset(asset.category) ? (
                                                                        <>
                                                                            <button onClick={() => { openModal(asset); setActiveActionMenu(null); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                                                            <button onClick={() => { handleDeleteClick(asset); setActiveActionMenu(null); }} className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <div className="p-1.5 text-gray-300" title="Hanya Baca (Read-Only)">
                                                                            <Lock className="w-3.5 h-3.5" />
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setActiveActionMenu(activeActionMenu === asset.id ? null : asset.id); }}
                                                                    className={`p-1 rounded-md transition-all z-40 ${activeActionMenu === asset.id ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                                                                >
                                                                    <MoreVertical className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Click-outside overlay for action menu */}
                                {activeActionMenu && (
                                    <div className="fixed inset-0 z-30" onClick={() => setActiveActionMenu(null)} />
                                )}

                                {/* Mobile Grid View */}
                                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                                    {filteredAssets.map((asset) => {
                                        const roomAsset = rawRoomAssets.find(ra => ra.assetId === asset.id);
                                        const currentRoom = rawRooms.find(r => r.id === roomAsset?.roomId);
                                        const isInRoom = !!roomAsset;

                                        return (
                                            <div key={asset.id} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium text-gray-500 mb-1">{asset.assetCode || "NO CODE"}</span>
                                                        <h3 className="text-lg font-semibold text-gray-900 leading-tight">{asset.name}</h3>
                                                        <span className="text-sm text-gray-500 mt-1">
                                                            {rawLocations.find(l => l.id === asset.locationId)?.name || "-"}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <button onClick={() => openHistory(asset)} className="p-2 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-gray-50"><History className="w-5 h-5" /></button>
                                                        {canManageAsset(asset.category) ? (
                                                            <>
                                                                <button onClick={() => openModal(asset)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-50"><Edit2 className="w-5 h-5" /></button>
                                                                <button onClick={() => handleDeleteClick(asset)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"><Trash2 className="w-5 h-5" /></button>
                                                            </>
                                                        ) : (
                                                            <div className="p-2 text-gray-200" title="Read-Only">
                                                                <Lock className="w-5 h-5" />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="h-px bg-gray-100"></div>

                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <span className="bg-gray-100 text-gray-700 px-2.5 py-1 rounded-md text-xs font-medium border border-gray-200">{asset.category}</span>
                                                    {isInRoom ? (
                                                        <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-medium border border-blue-100">
                                                            {currentRoom?.name || "STUDIO ROOM"}
                                                        </span>
                                                    ) : (
                                                        <span className="bg-orange-50 text-orange-700 px-2.5 py-1 rounded-md text-xs font-medium border border-orange-100">
                                                            Gudang
                                                        </span>
                                                    )}
                                                    <span className={clsx(
                                                        "px-2.5 py-1 rounded-md text-xs font-medium border ml-auto",
                                                        asset.status === 'BAIK' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            asset.status === 'RUSAK' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-100 text-gray-700 border-gray-300'
                                                    )}>
                                                        {asset.status || 'BAIK'}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
                </>
            ) : (
                /* DELETED ASSETS TAB CONTENT */
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr className="text-gray-400">
                                    <th scope="col" className="py-3 px-4 text-center text-[10px] font-bold uppercase tracking-wider w-12">No</th>
                                    <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Identitas Aset</th>
                                    <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Kode Aset</th>
                                    <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Dihapus Oleh</th>
                                    <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Tgl Hapus</th>
                                    <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Alasan Hapus</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {deletedAssets.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="py-24 text-center text-xs text-gray-400">Tidak ada riwayat aset yang dihapus</td>
                                    </tr>
                                ) : (
                                    deletedAssets.map((asset, index) => (
                                        <tr key={asset.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-4 text-[10px] text-gray-400 text-center">{index + 1}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-bold text-gray-900">{asset.assetName}</span>
                                                    <span className="text-[9px] text-gray-400 uppercase tracking-tighter">{asset.category}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-[11px] font-mono font-bold text-indigo-600">{asset.assetCode}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-1.5 text-[11px] text-gray-600 font-medium">
                                                    <User className="w-3 h-3 text-gray-400" />
                                                    {asset.deletedBy}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-[11px] text-gray-500">
                                                {new Date(asset.deleteDate).toLocaleString('id-ID', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                    hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-start gap-1.5">
                                                    <AlertTriangle className="w-3 h-3 text-amber-500 mt-0.5 shrink-0" />
                                                    <span className="text-[11px] text-gray-600 italic">"{asset.reason}"</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )
            }

            {/* Asset Form Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm shadow-2xl" onClick={closeModal}></div>
                        <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                                        {formData.id ? "✍️ Edit Aset" : "✨ Tambah Aset"}
                                    </h2>
                                    <p className="text-[11px] text-gray-500 mt-1">
                                        {formData.id ? `ID: ${formData.id}` : "Lengkapi detail informasi aset inventaris"}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Cabang (Lokasi Asal)</label>
                                        <select
                                            required
                                            value={formData.locationId}
                                            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium shadow-sm"
                                        >
                                            <option value="" disabled>Pilih Lokasi Cabang</option>
                                            {rawLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kategori Alat</label>
                                            {user?.role !== "CLIENT_ADMIN" && (
                                                <button
                                                    type="button"
                                                    onClick={() => setIsAddingCategory(!isAddingCategory)}
                                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-tighter"
                                                >
                                                    {isAddingCategory ? "Gunakan List" : "Tulis Baru"}
                                                </button>
                                            )}
                                        </div>
                                        {user?.role === "CLIENT_ADMIN" ? (
                                            <div className="w-full px-4 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-700 text-sm font-bold flex items-center gap-2">
                                                <Tag className="w-4 h-4" />
                                                Client Asset
                                            </div>
                                        ) : isAddingCategory ? (
                                            <input
                                                required
                                                type="text"
                                                value={newCategoryName}
                                                onChange={(e) => setNewCategoryName(e.target.value)}
                                                placeholder="Masukkan nama kategori baru..."
                                                className="w-full px-4 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/30 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium shadow-sm placeholder:text-indigo-300"
                                                autoFocus
                                            />
                                        ) : (
                                            <select
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-medium shadow-sm"
                                            >
                                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kode Aset / Barang (Opsional)</label>
                                        <input
                                            type="text"
                                            value={formData.assetCode}
                                            onChange={(e) => setFormData({ ...formData, assetCode: e.target.value })}
                                            placeholder="Kosongkan untuk generate otomatis"
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-sm font-mono font-bold shadow-sm"
                                        />
                                        <p className="text-[9px] text-gray-400 italic">Contoh: CAM-0001 atau SONY-A6400-01</p>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Nama / Model Barang</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="Misal: Sony A6400"
                                            list="asset-names"
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                        />
                                        <datalist id="asset-names">
                                            {uniqueNames.map(name => <option key={name} value={name} />)}
                                        </datalist>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Deskripsi Teknis</label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            placeholder="Detil spesifikasi atau keterangan..."
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm h-24 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Tgl Akuisisi</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.entryDate}
                                            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                                            className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                                        />
                                    </div>

                                    {formData.id && (
                                        <div className="pt-2">
                                            <div className="h-px bg-gray-100 mb-4"></div>
                                            <div className="space-y-1.5 mb-4">
                                                <label className="block text-sm font-medium text-gray-700">Kondisi & Status Terbaru</label>
                                                <select
                                                    value={formData.status}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                                >
                                                    <option value="BAIK">Kondisi Prima (Baik)</option>
                                                    <option value="RUSAK">Perlu Perbaikan (Rusak)</option>
                                                    <option value="MATI">Rusak Total / Mati</option>
                                                    <option value="SERVIS">Sedang Diservis (Servis)</option>
                                                    <option value="JUAL">Aset Dijual (Jual)</option>
                                                    <option value="HILANG">Tidak Terlacak / Hilang</option>
                                                </select>
                                            </div>
                                            <textarea
                                                placeholder="Catatan hasil audit aset..."
                                                value={formData.conditionNotes}
                                                onChange={(e) => setFormData({ ...formData, conditionNotes: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm h-20"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#303348] hover:bg-[#404358] transition-colors"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Menyimpan...</span>
                                            </div>
                                        ) : (formData.id ? "Simpan Perubahan" : "Simpan Aset")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* History Modal */}
            {
                isHistoryModalOpen && historyAsset && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40" onClick={closeHistory}></div>
                        <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-8 overflow-hidden flex flex-col max-h-[85vh]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        Riwayat Aset
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {historyAsset.name} • {historyAsset.assetCode}
                                    </p>
                                    {historyAsset.description && (
                                        <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                            {historyAsset.description}
                                        </p>
                                    )}

                                    <div className="mt-4 grid grid-cols-2 gap-3">
                                        <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100">
                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">Umur Aset</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {calculateAssetAge(historyAsset.entryDate || historyAsset.updatedAt)}
                                            </p>
                                        </div>
                                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Riwayat Servis</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {getAssetHistory(historyAsset.id).filter(log =>
                                                    log.toValue === 'SERVIS' ||
                                                    log.notes?.toLowerCase().includes('servis')
                                                ).length} Kali
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={closeHistory} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 mb-6">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {getAssetHistory(historyAsset.id).length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                        <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <p className="text-sm text-gray-500">Belum ada riwayat aktivitas</p>
                                    </div>
                                ) : (
                                    getAssetHistory(historyAsset.id).map((h, i) => (
                                        <div key={i} className="bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "p-2 rounded-md",
                                                        h.type === 'MOVEMENT' ? 'bg-blue-50 text-blue-600' :
                                                            h.type === 'SYSTEM' ? 'bg-gray-100 text-gray-600' :
                                                                h.toValue === 'BAIK' ? 'bg-green-50 text-green-600' :
                                                                    h.toValue === 'RUSAK' ? 'bg-red-50 text-red-600' :
                                                                        'bg-gray-50 text-gray-600'
                                                    )}>
                                                        {h.type === 'MOVEMENT' && <MapPin className="w-4 h-4" />}
                                                        {h.type === 'STATUS' && h.toValue === 'BAIK' && <CheckCircle2 className="w-4 h-4" />}
                                                        {h.type === 'STATUS' && h.toValue !== 'BAIK' && <AlertTriangle className="w-4 h-4" />}
                                                        {h.type === 'SYSTEM' && <Tag className="w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{h.toValue.replace(/_/g, ' ')}</p>
                                                        <p className="text-xs text-gray-500">
                                                            {h.type === 'MOVEMENT' ? `Mutasi Lokasi` : h.type === 'STATUS' ? `Update Status` : 'Sistem'}
                                                            {h.fromValue && ` • Dari: ${h.fromValue}`}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-sm font-medium text-gray-900">{new Date(h.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                                    <p className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</p>
                                                </div>
                                            </div>
                                            {h.notes && (
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100 mb-3">
                                                    {h.notes}
                                                </div>
                                            )}
                                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                                <User className="w-3 h-3" /> Oleh: {h.operatorName}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
                                <button onClick={closeHistory} className="px-5 py-2.5 bg-[#303348] text-white rounded-lg text-sm font-medium hover:bg-[#404358] transition-colors">Tutup</button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete Confirmation Modal */}
            {
                isDeleteModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => !isVerifyingPassword && setIsDeleteModalOpen(false)}></div>
                        <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 border border-gray-100 animate-in fade-in zoom-in duration-200">
                            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-rose-100">
                                <AlertOctagon className="w-8 h-8 text-rose-600" />
                            </div>
                            <div className="text-center mb-8">
                                <h3 className="text-xl font-bold text-gray-900">Konfirmasi Penghapusan</h3>
                                <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                    Anda akan menghapus <span className="font-bold text-gray-900">{assetToDelete?.name}</span> secara permanen dari sistem.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Alasan Penghapusan</label>
                                    <textarea
                                        value={deleteReason}
                                        onChange={(e) => setDeleteReason(e.target.value)}
                                        placeholder="Wajib diisi (Misal: Rusak Total / Dijual)"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-sm h-24 resize-none shadow-sm"
                                        disabled={isVerifyingPassword}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Kata Sandi Verifikasi</label>
                                    <input
                                        type="password"
                                        value={deletePassword}
                                        onChange={(e) => setDeletePassword(e.target.value)}
                                        placeholder="Masukkan password login Anda"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10 outline-none transition-all text-sm shadow-sm"
                                        disabled={isVerifyingPassword}
                                    />
                                    {user?.isDemo && <p className="text-[9px] text-indigo-500 mt-1 italic font-medium">Demo Mode: Gunakan password "admin123"</p>}
                                </div>
                            </div>

                            <div className="mt-8 flex flex-col gap-2">
                                <button
                                    onClick={confirmDelete}
                                    disabled={isVerifyingPassword}
                                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
                                >
                                    {isVerifyingPassword ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Memverifikasi...
                                        </>
                                    ) : (
                                        "Ya, Hapus Aset"
                                    )}
                                </button>
                                <button
                                    onClick={() => setIsDeleteModalOpen(false)}
                                    disabled={isVerifyingPassword}
                                    className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-bold transition-all"
                                >
                                    Batalkan
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Category Management Modal */}
            {
                isCategoryModalOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsCategoryModalOpen(false)}></div>
                        <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Kelola Kategori</h2>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest mt-0.5">Daftar Resmi Sistem</p>
                                            <button
                                                onClick={async () => {
                                                    const allAssetCats = Array.from(new Set(rawAssets.map(a => a.category).filter(Boolean)));
                                                    const missing = allAssetCats.filter(c => !categories.some(pc => pc.toLowerCase() === c.toLowerCase()));
                                                    if (missing.length > 0) {
                                                        await bulkAddCategories(missing);
                                                        alert(`Berhasil mendaftarkan ${missing.length} kategori baru dari data aset!`);
                                                    } else {
                                                        alert("Semua kategori aset sudah terdaftar di sistem.");
                                                    }
                                                }}
                                                className="text-[9px] font-black text-white bg-indigo-500 hover:bg-indigo-600 px-1.5 py-0.5 rounded uppercase tracking-tighter transition-all"
                                                title="Sinkronisasi kategori dari data aset yang sudah ada"
                                            >
                                                Sinkronisasi
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setIsCategoryModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="mb-6">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="Tambah kategori baru..."
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                        onKeyDown={async (e) => {
                                            if (e.key === 'Enter') {
                                                const val = e.currentTarget.value.trim();
                                                if (val) {
                                                    await addCategory(val);
                                                    e.currentTarget.value = "";
                                                }
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={async (e) => {
                                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                                            const val = input.value.trim();
                                            if (val) {
                                                await addCategory(val);
                                                input.value = "";
                                            }
                                        }}
                                        className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
                                    >
                                        Tambah
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                <div className="grid grid-cols-1 gap-2">
                                    {categories.map((cat) => {
                                        const usageCount = rawAssets.filter(a => a.category === cat).length;
                                        const isUsed = usageCount > 0;

                                        return (
                                            <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-100 hover:bg-white transition-all shadow-sm">
                                                <div className="flex items-center gap-3">
                                                    <div className={clsx(
                                                        "w-2 h-2 rounded-full",
                                                        isUsed ? "bg-emerald-400" : "bg-gray-300"
                                                    )}></div>
                                                    <span className="text-sm font-bold text-gray-700 block leading-tight">{cat}</span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const msg = isUsed
                                                            ? `Peringatan: Kategori "${cat}" sedang digunakan oleh ${usageCount} aset. Jika Anda menghapus kategori ini, aset tersebut akan tetap ada tetapi kategorinya tidak akan terdaftar di pilihan sistem. Lanjutkan hapus?`
                                                            : `Hapus kategori "${cat}"?`;
                                                        if (confirm(msg)) {
                                                            deleteCategory(cat);
                                                        }
                                                    }}
                                                    className={clsx(
                                                        "p-2 rounded-xl transition-all",
                                                        isUsed
                                                            ? "text-gray-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100"
                                                            : "text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                                    )}
                                                    title={isUsed ? "Kategori Masih Digunakan" : "Hapus Kategori"}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                                <p className="text-[10px] text-gray-400 font-medium italic">
                                    * Kategori baru akan otomatis terdaftar saat Anda mengetik manual di form aset atau mengimpor file Excel.
                                </p>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}

export default function AssetsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
            <AssetsContent />
        </Suspense>
    );
}
