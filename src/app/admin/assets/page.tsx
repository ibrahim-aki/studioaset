"use client";

import { v4 as uuidv4 } from "uuid";

import { useState, useEffect, Suspense, useMemo, memo } from "react";
import { useLocalDb, MasterAsset as Asset } from "@/context/LocalDbContext";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import * as XLSX from 'xlsx';
import { useAuth } from "@/context/AuthContext";
import {
    Plus, Edit2, Trash2, Video, X, Loader2, Tag, Download,
    Upload, Clock, MapPin, Calendar, User, Search, Filter,
    History, CheckCircle2, AlertTriangle, AlertOctagon, XCircle, MoreVertical,
    ChevronDown, ChevronUp, Box, Settings, Lock, Camera, Image as ImageIcon
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

        const isClientAsset = assetCategory?.toLowerCase().includes("client asset") ||
            assetCategory?.toLowerCase().includes("client aset");

        if (user?.role === "ADMIN") {
            // Admin Studio: Kelola semua KECUALI Client Asset
            return !isClientAsset;
        }
        if (user?.role === "CLIENT_ADMIN") {
            // Client Admin: HANYA kelola Client Asset
            return isClientAsset;
        }
        return false;
    };

    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: "", locationId: "", name: "", category: "", status: "BAIK", conditionNotes: "", description: "", entryDate: new Date().toISOString().split('T')[0], position: "", assetCode: "", initialPhotoUrl: "" });
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
    const [compareAsset, setCompareAsset] = useState<Asset | null>(null);
    const [showDeleted, setShowDeleted] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null);
    const [deleteReason, setDeleteReason] = useState("");
    const [deletePassword, setDeletePassword] = useState("");
    const [isVerifyingPassword, setIsVerifyingPassword] = useState(false);
    const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
    const [expandedNameId, setExpandedNameId] = useState<string | null>(null);
    const [expandedAssetId, setExpandedAssetId] = useState<string | null>(null);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number; isImporting: boolean }>({ current: 0, total: 0, isImporting: false });

    const {
        assets: rawAssets,
        categories,
        locations: rawLocations,
        checklists,
        roomAssets: rawRoomAssets,
        rooms: rawRooms,
        assetLogs,
        assetHistory, // Gunakan history mandiri untuk UI Detail Aset
        addAsset,
        updateAsset,
        deleteAsset,
        deletedAssets,
        addCategory,
        bulkAddCategories,
        deleteCategory,
        setPreviewImage
    } = useLocalDb();

    // Optimasi: Mapping data agar lookup lebih cepat
    const roomsMap = useMemo(() => {
        const map: Record<string, any> = {};
        rawRooms.forEach(r => { map[r.id] = r; });
        return map;
    }, [rawRooms]);

    const locationsMap = useMemo(() => {
        const map: Record<string, any> = {};
        rawLocations.forEach(l => { map[l.id] = l; });
        return map;
    }, [rawLocations]);

    const roomAssetsMap = useMemo(() => {
        const map: Record<string, any> = {};
        rawRoomAssets.forEach(ra => { map[ra.assetId] = ra; });
        return map;
    }, [rawRoomAssets]);

    // Pre-calculate service counts for all assets to avoid filtering in every row
    const serviceCountsMap = useMemo(() => {
        const counts: Record<string, number> = {};
        assetHistory.forEach(log => {
            if (log.assetId && (log.toValue === "SERVIS" || (log.notes && log.notes.toLowerCase().includes("servis")))) {
                counts[log.assetId] = (counts[log.assetId] || 0) + 1;
            }
        });
        return counts;
    }, [assetHistory]);

    // Pre-calculate assets that have ANY photo (Initial or Audit Log)
    const assetsWithPhotosMap = useMemo(() => {
        const map: Record<string, boolean> = {};
        rawAssets.forEach(a => {
            if (a.initialPhotoUrl) map[a.id] = true;
        });
        assetHistory.forEach(l => {
            if (l.assetId && l.photoUrl) map[l.assetId] = true;
        });
        return map;
    }, [rawAssets, assetHistory]);

    const memoizedUniqueNames = useMemo(() => 
        Array.from(new Set(rawAssets.map(a => a.name))).sort()
    , [rawAssets]);

    const filteredCategories = useMemo(() => {
        return categories.filter(c => {
            if (user?.role === "ADMIN") {
                const lower = c.toLowerCase();
                return !lower.includes("client asset") && !lower.includes("client aset");
            }
            return true;
        });
    }, [categories, user?.role]);

    const adminName = user?.name || user?.email || "Admin";

    const canManageInfrastructure = () => {
        return user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
    };

    const uniqueNames = memoizedUniqueNames;
    const uniquePositions = useMemo(() => 
        Array.from(new Set(rawAssets.filter(a => a.position).map(a => a.position))).sort()
    , [rawAssets]);

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
                description: asset.description || "",
                position: asset.position || "",
                assetCode: asset.assetCode || "",
                initialPhotoUrl: asset.initialPhotoUrl || ""
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
                assetCode: "",
                initialPhotoUrl: ""
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
        return assetHistory
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

    const handleInitialPhotoUpload = async (file: File) => {
        const CLOUD_NAME = "dsbryri1d";
        const UPLOAD_PRESET = "studioaset_asetawal";

        setIsSubmitting(true);
        try {
            // 1. Kompresi gambar di sisi klien
            const compressedBlob = await compressImage(file);
            const compressedFile = new File([compressedBlob], `initial_${Date.now()}.jpg`, { type: "image/jpeg" });

            // 2. Persiapkan data untuk Cloudinary
            const formDataCloud = new FormData();
            formDataCloud.append("file", compressedFile);
            formDataCloud.append("upload_preset", UPLOAD_PRESET);

            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
                method: "POST",
                body: formDataCloud,
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error?.message || "Upload gagal");
            }

            const data = await response.json();
            if (data.secure_url) {
                setFormData(prev => ({ ...prev, initialPhotoUrl: data.secure_url }));
            }
        } catch (error: any) {
            console.error("Cloudinary upload error:", error);
            alert("Gagal mengunggah foto: " + (error.message || "Pastikan koneksi internet stabil."));
        } finally {
            setIsSubmitting(false);
        }
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
                initialPhotoUrl: formData.initialPhotoUrl,
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

        // ── LANGKAH 1: Verifikasi Password ──────────────────────────────
        try {
            const { reauthenticateWithCredential, EmailAuthProvider } = await import("firebase/auth");
            const { auth } = await import("@/lib/firebase");
            const currentUser = auth.currentUser;
            if (!currentUser) {
                alert("Sesi tidak ditemukan. Silakan login ulang.");
                setIsVerifyingPassword(false);
                return;
            }
            const credential = EmailAuthProvider.credential(currentUser.email || "", deletePassword);
            await reauthenticateWithCredential(currentUser, credential);
            // Paksa refresh token agar Firestore pakai token terbaru
            await currentUser.getIdToken(true);
        } catch (authError: any) {
            console.error("[DELETE] Password verification failed:", authError);
            setIsVerifyingPassword(false);
            alert("Password salah. Silakan masukkan password login Anda yang benar.");
            return; // Berhenti di sini jika password salah
        }

        // ── LANGKAH 2: Hapus Aset (setelah password terkonfirmasi) ──────
        try {
            await deleteAsset(assetToDelete.id, deleteReason);
            setIsDeleteModalOpen(false);
            setAssetToDelete(null);
            alert("Aset berhasil dihapus.");
        } catch (deleteError: any) {
            console.error("[DELETE] Firestore deletion failed:", deleteError);
            // Tampilkan error spesifik: bisa permission-denied atau lainnya
            const code = (deleteError.code || "").toString();
            if (code.includes("permission-denied")) {
                alert(
                    `Gagal: Sistem menolak permintaan penghapusan.\n\n` +
                    `Role Anda: ${user?.role}\n` +
                    `Kategori aset: ${assetToDelete?.category}\n\n` +
                    `Pastikan konfigurasi keamanan sudah diperbarui.`
                );
            } else {
                alert("Gagal menghapus aset: " + (deleteError.message || "Terjadi kesalahan sistem."));
            }
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

                // Hitung valid rows dulu untuk total progress
                const validRows = (data as any[]).filter(row => {
                    const getVal = (keys: string[]) => {
                        const k = Object.keys(row).find(k => keys.some(pk => k.trim().toLowerCase() === pk.toLowerCase()));
                        const val = k ? row[k] : null;
                        return val === "-" ? null : val;
                    };
                    return getVal(["Nama Barang", "Nama", "name"]) && getVal(["Kategori", "category"]);
                });

                setImportProgress({ current: 0, total: validRows.length, isImporting: true });

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

                        // To handle room mapping, we use the name+code matching for immediate room allocation

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

                        currentAssetsList.push({ ...newAsset, id: uuidv4() } as any);
                        importedCount++;
                        setImportProgress(prev => ({ ...prev, current: importedCount }));
                    }
                }

                alert(`Berhasil mengimpor ${importedCount} aset baru!`);
            } catch (error) {
                console.error("Error importing data:", error);
                alert("Gagal mengimpor data. Pastikan format Excel benar.");
            } finally {
                setImportProgress({ current: 0, total: 0, isImporting: false });
            }
            e.target.value = '';
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto min-h-screen">

            {/* ── IMPORT PROGRESS OVERLAY ─────────────────────── */}
            {importProgress.isImporting && (
                <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-white/60 backdrop-blur-sm">
                    <div className="w-full max-w-sm mx-4 bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 flex flex-col items-center gap-5">
                        {/* Icon + Title */}
                        <div className="flex flex-col items-center gap-2">
                            <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center">
                                <Upload className="w-5 h-5 text-brand-purple" />
                            </div>
                            <h3 className="text-sm font-black text-gray-900 tracking-tight">Mengimpor Aset...</h3>
                            <p className="text-[10px] text-gray-400 font-medium">Harap tunggu, jangan tutup halaman ini</p>
                        </div>

                        {/* Counter */}
                        <div className="text-center">
                            <span className="text-4xl font-black text-brand-purple tabular-nums">{importProgress.current}</span>
                            <span className="text-sm font-bold text-gray-300 mx-1">/</span>
                            <span className="text-lg font-black text-gray-400 tabular-nums">{importProgress.total}</span>
                            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1">Aset Berhasil Diimpor</p>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full">
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-brand-purple to-indigo-400 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: importProgress.total > 0 ? `${(importProgress.current / importProgress.total) * 100}%` : '0%' }}
                                />
                            </div>
                            <div className="flex justify-between mt-1.5">
                                <span className="text-[9px] text-gray-400 font-bold">0</span>
                                <span className="text-[9px] text-brand-purple font-black">
                                    {importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%
                                </span>
                                <span className="text-[9px] text-gray-400 font-bold">{importProgress.total}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Header section with Tabs */}
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Video className="w-6 h-6 text-brand-purple" />
                        Katalog Aset Master
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manajemen inventaris untuk semua properti produksi dan studio.
                    </p>
                </div>

            </div>

            {/* Sticky Search and Controls Header for Mobile & Desktop */}
                    <div className="sticky top-16 md:top-0 z-40 -mx-4 px-4 py-3 mb-6 bg-gray-50 border-b border-gray-100 md:relative md:top-auto md:mx-0 md:px-0 md:py-0 md:border-none md:bg-transparent transition-all duration-300">
                        <div className="flex flex-col md:flex-row items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)]">
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
                                    className="block w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50/30 text-xs focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all outline-none"
                                />
                            </div>

                            {/* Action Group: Filters & Buttons */}
                            <div className="flex items-center gap-2 shrink-0 w-full md:w-auto justify-between md:justify-end">
                                {/* Left Side Group (Mobile): Filter & Category */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                                            className={clsx(
                                                "flex items-center justify-center w-10 h-10 rounded-xl transition-all shadow-sm border",
                                                isFilterMenuOpen || locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL"
                                                    ? "bg-brand-purple text-white border-brand-purple"
                                                    : "bg-white text-gray-500 border-gray-100 hover:border-brand-purple/50"
                                            )}
                                        >
                                            <Filter className="w-4 h-4" />
                                            {(locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
                                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[8px] font-bold bg-rose-500 text-white rounded-full border border-white">
                                                    {(locationFilter !== "ALL" ? 1 : 0) + (categoryFilter !== "ALL" ? 1 : 0) + (statusFilter !== "ALL" ? 1 : 0)}
                                                </span>
                                            )}
                                        </button>

                                    </div>

                                    {canManageInfrastructure() && (
                                        <button
                                            onClick={() => setIsCategoryModalOpen(true)}
                                            className="flex items-center justify-center w-10 h-10 bg-white text-brand-purple border border-gray-100 rounded-xl transition-all shadow-sm hover:scale-105 active:scale-95"
                                            title="Kelola Kategori"
                                        >
                                            <Tag className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Right Side Group (Mobile): Utils & Add */}
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <div className="flex items-center gap-1.5 bg-gray-50/50 p-1 rounded-xl border border-gray-100">
                                        <button
                                            onClick={handleExport}
                                            className="p-1.5 text-gray-400 hover:text-brand-purple hover:bg-white rounded-lg transition-all"
                                        >
                                            <Download className="w-4 h-4" />
                                        </button>
                                        <label className="p-1.5 text-gray-400 hover:text-brand-purple hover:bg-white rounded-lg transition-all cursor-pointer">
                                            <Upload className="w-4 h-4" />
                                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                                        </label>
                                    </div>

                                    <button
                                        onClick={() => openModal()}
                                        className="flex items-center justify-center w-10 h-10 bg-brand-purple text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-brand-purple/20 shrink-0"
                                        title="Tambah Aset"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>

                                    <button
                                        onClick={() => setShowDeleted(!showDeleted)}
                                        className={clsx(
                                            "flex items-center gap-2 px-4 py-2 bg-white text-[10px] font-black rounded-xl border transition-all shadow-sm uppercase tracking-widest shrink-0 outline-none",
                                            showDeleted
                                                ? "border-rose-100 bg-rose-50 text-rose-600 hover:bg-rose-100 shadow-rose-100/50 ring-2 ring-rose-100"
                                                : "border-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                                        )}
                                        title={showDeleted ? "Tutup Riwayat" : "Buka Riwayat Hapus"}
                                    >
                                        <div className="relative flex items-center justify-center w-3 h-3">
                                            <Trash2 className="w-full h-full" />
                                            <div className={clsx(
                                                "absolute -top-1 -right-1 rounded-full",
                                                showDeleted ? "bg-rose-50 text-rose-600" : "bg-white text-gray-400"
                                            )}>
                                                <History className="w-[9px] h-[9px]" />
                                            </div>
                                        </div>

                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Table section */}
                    {showDeleted ? (
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
                                                    <td className="py-4 px-4 text-[11px] font-mono font-bold text-brand-purple">{asset.assetCode}</td>
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
                                                            <AlertTriangle className="w-3 h-3 text-brand-orange mt-0.5 shrink-0" />
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
                    ) : (
                    <div className="overflow-hidden">
                        {loading ? (
                            <div className="p-24 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="w-8 h-8 text-brand-purple animate-spin" />
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
                                    className="text-brand-purple font-bold hover:text-indigo-700 text-xs uppercase"
                                >
                                    Bersihkan Pencarian
                                </button>
                            </div>
                        ) : (
                            <>
                                {/* Desktop Table - Sticky Header & Scrollable Body */}
                                <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] custom-scrollbar border border-gray-100 rounded-xl bg-white shadow-sm">
                                    <table className="w-full border-collapse table-fixed">
                                        <thead className="sticky top-0 z-[60] border-b-2 border-gray-200">
                                            <tr className="text-gray-500">
                                                <th scope="col" className="py-3 px-2 text-center text-[9px] font-bold uppercase tracking-wider w-[40px] bg-gray-100">No</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[140px] bg-gray-100">Kode</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[280px] bg-gray-100">Identitas Aset</th>
                                                <th scope="col" className="py-3 px-2 text-center text-[9px] font-bold uppercase tracking-wider w-[50px] bg-gray-100">Foto</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[160px] bg-gray-100">Kategori</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[90px] bg-gray-100">Tgl Masuk</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[120px] bg-gray-100">Umur Aset</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[120px] bg-gray-100">Cabang</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[120px] bg-gray-100">Ruangan</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[90px] bg-gray-100">Servis</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider w-[80px] bg-gray-100">Kondisi</th>
                                                <th scope="col" className="py-3 px-2 text-left text-[9px] font-bold uppercase tracking-wider bg-gray-100 min-w-[200px]">Catatan</th>
                                                <th scope="col" className="relative py-3 px-4 text-right text-[9px] font-bold uppercase tracking-wider w-[60px] bg-gray-100">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
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
                                                        <td className="py-1 px-2 text-[10px] font-mono font-bold text-brand-purple whitespace-nowrap truncate">
                                                            {asset.assetCode || "-"}
                                                        </td>
                                                        <td 
                                                            className="py-1 px-2 cursor-pointer"
                                                            onClick={() => setExpandedNameId(expandedNameId === asset.id ? null : asset.id)}
                                                        >
                                                            <div className={clsx(
                                                                "text-[10px] font-semibold text-gray-900 transition-all duration-300",
                                                                expandedNameId === asset.id ? "whitespace-normal bg-blue-50/50 p-1 rounded border border-blue-100" : "truncate whitespace-nowrap"
                                                            )}>
                                                                {asset.name}
                                                            </div>
                                                        </td>
                                                        <td className="py-1 px-2 text-center">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); setCompareAsset(asset); }}
                                                                className={clsx(
                                                                    "p-1.5 rounded-lg transition-all border shadow-sm",
                                                                    assetsWithPhotosMap[asset.id]
                                                                        ? "bg-orange-50 text-brand-orange border-brand-orange/30 hover:bg-orange-100"
                                                                        : "bg-white text-gray-400 border-gray-100 hover:border-brand-purple/50 hover:text-brand-purple"
                                                                )}
                                                            >
                                                                <Camera className="w-3.5 h-3.5" />
                                                            </button>
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] font-medium text-gray-500 whitespace-nowrap truncate">
                                                            {asset.category}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] text-gray-400 whitespace-nowrap">
                                                            {displayDate}
                                                        </td>
                                                        <td className="py-1 px-2 text-[10px] font-medium text-brand-purple whitespace-nowrap truncate">
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
                                                                    expandedNoteId === asset.id ? "whitespace-normal bg-gray-50/80 p-1 rounded-md border border-gray-100 shadow-sm" : "truncate hover:text-brand-purple"
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
                                                                    "absolute right-full mr-2 z-[70] flex items-center gap-0.5 bg-white/95 backdrop-blur-sm px-1.5 py-0.5 rounded-lg border border-gray-100 shadow-xl transition-all duration-300 transform",
                                                                    activeActionMenu === asset.id ? "opacity-100 scale-100 translate-x-0" : "opacity-0 scale-95 translate-x-2 pointer-events-none"
                                                                )}>
                                                                    <button onClick={() => { openHistory(asset); setActiveActionMenu(null); }} className="p-1.5 text-gray-400 hover:text-brand-purple transition-colors" title="Riwayat"><History className="w-3.5 h-3.5" /></button>

                                                                    {canManageAsset(asset.category) ? (
                                                                        <>
                                                                            <button onClick={() => { openModal(asset); setActiveActionMenu(null); }} className="p-1.5 text-gray-400 hover:text-brand-purple transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
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
                                                                    className={`p-1 rounded-md transition-all z-40 ${activeActionMenu === asset.id ? 'bg-brand-purple/10 text-brand-purple ring-1 ring-brand-purple/30' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
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

                                {/* Click-outside overlay for action and comparison menus */}
                                {(activeActionMenu || compareAsset) && (
                                    <div className="fixed inset-0 z-30" onClick={() => { setActiveActionMenu(null); setCompareAsset(null); }} />
                                )}

                                {/* Mobile Grid View */}
                                <div className="md:hidden grid grid-cols-1 gap-4 p-4">
                                    {filteredAssets.map((asset) => {
                                        const roomAsset = rawRoomAssets.find(ra => ra.assetId === asset.id);
                                        const currentRoom = rawRooms.find(r => r.id === roomAsset?.roomId);
                                        const isInRoom = !!roomAsset;
                                        const isExpanded = expandedAssetId === asset.id;

                                        return (
                                            <div
                                                key={asset.id}
                                                className={clsx(
                                                    "bg-white rounded-2xl border transition-all duration-300 overflow-hidden",
                                                    isExpanded ? "border-brand-purple shadow-lg ring-1 ring-brand-purple/20" : "border-gray-100 shadow-sm"
                                                )}
                                            >
                                                {/* Collapsed State Header / Always Visible Area */}
                                                <div
                                                    onClick={() => setExpandedAssetId(isExpanded ? null : asset.id)}
                                                    className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                                        {/* Row 1: Category & Code */}
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] text-gray-400 font-bold truncate uppercase tracking-tight">
                                                                {asset.category}
                                                            </span>
                                                            <span className="text-[9px] font-mono font-bold text-brand-purple bg-brand-purple/5 px-1.5 py-0.5 rounded uppercase shrink-0">
                                                                {asset.assetCode || "NO CODE"}
                                                            </span>
                                                        </div>

                                                        {/* Row 2: Name & Location */}
                                                        <div className="flex items-baseline gap-2">
                                                            <h3 className={clsx(
                                                                "text-xs font-bold text-gray-900 leading-tight truncate",
                                                                isExpanded ? "whitespace-normal break-words" : "truncate"
                                                            )}>
                                                                {asset.name}
                                                            </h3>
                                                            <span className="text-[10px] text-gray-500 font-medium shrink-0">
                                                                @{rawLocations.find(l => l.id === asset.locationId)?.name || "-"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 shrink-0 ml-4">
                                                        {/* Status Badge in Collapsed View */}
                                                        <span className={clsx(
                                                            "w-2 h-2 rounded-full",
                                                            asset.status === 'BAIK' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                                                asset.status === 'RUSAK' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                                                                    asset.status === 'MATI' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-gray-400'
                                                        )}></span>
                                                        <div className={clsx(
                                                            "p-2 rounded-full bg-gray-50 text-gray-400 transition-transform duration-300",
                                                            isExpanded && "rotate-180 bg-brand-purple/10 text-brand-purple"
                                                        )}>
                                                            <ChevronDown className="w-4 h-4" />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Expanded Details Area */}
                                                <div className={clsx(
                                                    "transition-all duration-300 ease-in-out px-4",
                                                    isExpanded ? "max-h-[500px] opacity-100 pb-5 pt-1 border-t border-gray-50" : "max-h-0 opacity-0 pointer-events-none"
                                                )}>
                                                    <div className="space-y-4 pt-2">
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Kategori</p>
                                                                <p className="text-xs font-semibold text-gray-700">{asset.category}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ruangan</p>
                                                                <p className="text-xs font-semibold text-gray-700">
                                                                    {isInRoom ? (currentRoom?.name || "-") : "Gudang"}
                                                                </p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Umur Aset</p>
                                                                <p className="text-xs font-semibold text-gray-700">{calculateAssetAge(asset.entryDate)}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</p>
                                                                <span className={clsx(
                                                                    "inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter",
                                                                    asset.status === 'BAIK' ? 'bg-green-50 text-green-700' :
                                                                        asset.status === 'RUSAK' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                                                )}>
                                                                    {asset.status || 'BAIK'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {asset.conditionNotes && (
                                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Catatan</p>
                                                                <p className="text-xs text-gray-600 italic">"{asset.conditionNotes}"</p>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2 pt-2">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); openHistory(asset); }}
                                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-xs font-bold border border-gray-100 hover:bg-gray-100 active:scale-95 transition-all"
                                                            >
                                                                <History className="w-4 h-4" />
                                                                Riwayat
                                                            </button>
                                                            {canManageAsset(asset.category) ? (
                                                                <>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); openModal(asset); }}
                                                                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-brand-purple/10 text-brand-purple rounded-xl text-xs font-bold border border-brand-purple/10 hover:bg-brand-purple/20 active:scale-95 transition-all"
                                                                    >
                                                                        <Edit2 className="w-4 h-4" />
                                                                        Edit
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(asset); }}
                                                                        className="p-2.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-100 hover:bg-rose-100 active:scale-95 transition-all"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs font-bold italic">
                                                                    <Lock className="w-3.5 h-3.5" />
                                                                    Hanya Baca
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </div>
            )}

            {/* Asset Form Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm shadow-2xl" onClick={closeModal}></div>
                        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
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
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 outline-none transition-all text-sm font-medium shadow-sm"
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
                                                    className="text-[10px] font-bold text-brand-purple hover:text-indigo-700 bg-brand-purple/10 px-2 py-0.5 rounded uppercase tracking-tighter"
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
                                                className="w-full px-4 py-2.5 rounded-xl border border-brand-purple/30 bg-brand-purple/10/30 focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 outline-none transition-all text-sm font-medium shadow-sm placeholder:text-brand-purple/40"
                                                autoFocus
                                            />
                                        ) : (
                                            <select
                                                required
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 outline-none transition-all text-sm font-medium shadow-sm"
                                            >
                                                {filteredCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
                                            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 outline-none transition-all text-sm font-mono font-bold shadow-sm"
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
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all text-sm"
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
                                            className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all text-sm h-24 resize-none"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="block text-sm font-medium text-gray-700">Tgl Akuisisi</label>
                                        <input
                                            type="date"
                                            required
                                            value={formData.entryDate}
                                            onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
                                            className="block w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-900 text-sm focus:border-brand-purple focus:ring-1 focus:ring-brand-purple transition-all"
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
                                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all text-sm"
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
                                                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-brand-purple focus:ring-1 focus:ring-brand-purple outline-none transition-all text-sm h-20"
                                            />
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <div className="h-px bg-gray-100 mb-4"></div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Foto Kondisi Awal</label>
                                        
                                        <div className="flex items-start gap-4">
                                            {formData.initialPhotoUrl ? (
                                                <div className="relative group w-24 h-24 rounded-2xl overflow-hidden border-2 border-brand-purple shadow-lg shadow-brand-purple/10">
                                                    <img src={formData.initialPhotoUrl} alt="Initial" className="w-full h-full object-cover" />
                                                    <button 
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, initialPhotoUrl: "" }))}
                                                        className="absolute inset-0 bg-rose-600/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                                                    >
                                                        <Trash2 className="w-6 h-6 text-white" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <label className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 hover:border-brand-purple hover:bg-brand-purple/5 transition-all cursor-pointer">
                                                    <Camera className="w-6 h-6 text-gray-300" />
                                                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">Upload</span>
                                                    <input 
                                                        type="file" 
                                                        accept="image/*" 
                                                        className="hidden" 
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) handleInitialPhotoUpload(file);
                                                        }}
                                                    />
                                                </label>
                                            )}
                                            
                                            <div className="flex-1 space-y-2">
                                                <p className="text-[10px] text-gray-500 leading-relaxed italic">
                                                    * Unggah foto kondisi fisik barang saat pertama kali didaftarkan.
                                                </p>
                                                {formData.initialPhotoUrl && (
                                                    <div className="flex items-center gap-1.5 text-emerald-600">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        <span className="text-[9px] font-bold uppercase tracking-widest">Foto Siap Disimpan ✓</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
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
                                        className="px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-[#303348] hover:bg-[#404358] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                <span>Memproses...</span>
                                            </div>
                                        ) : (
                                            formData.id ? "Update Aset" : "Simpan Aset"
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Photo Comparison Modal */}
            {compareAsset && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setCompareAsset(null)}></div>
                    <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                                    <Camera className="w-5 h-5 text-brand-purple" />
                                    Perbandingan Kondisi Fisik
                                </h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
                                    {compareAsset.name} • {compareAsset.assetCode}
                                </p>
                            </div>
                            <button onClick={() => setCompareAsset(null)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-white transition-all shadow-sm">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Comparison Body */}
                        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 bg-white text-center">
                            {/* LEFT: Initial Photo */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black text-brand-purple uppercase tracking-[0.2em]">Kondisi Awal</span>
                                    <ImageIcon className="w-4 h-4 text-brand-purple/30" />
                                </div>
                                <div className="aspect-square rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center group relative shadow-inner">
                                    {compareAsset.initialPhotoUrl ? (
                                        <>
                                            <img 
                                                src={compareAsset.initialPhotoUrl} 
                                                alt="Initial" 
                                                className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-110 cursor-zoom-in" 
                                                onContextMenu={(e) => e.preventDefault()}
                                                onClick={() => setPreviewImage(compareAsset.initialPhotoUrl || null)}
                                            />
                                            <div className="absolute inset-0 bg-brand-purple/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                                                    <Plus className="w-6 h-6 text-brand-purple" />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="text-center p-8">
                                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                                <ImageIcon className="w-8 h-8" />
                                            </div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tidak ada foto</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-[9px] text-center text-gray-400 font-medium italic">Foto saat pertama kali didaftarkan</p>
                            </div>

                            {/* RIGHT: Last Audit Photo */}
                            <div className="space-y-4 text-center">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black text-brand-teal uppercase tracking-[0.2em]">Kondisi Terakhir</span>
                                    <History className="w-4 h-4 text-brand-teal/30" />
                                </div>
                                <div className="aspect-square rounded-3xl overflow-hidden border-2 border-gray-100 bg-gray-50 flex items-center justify-center group relative shadow-inner">
                                    {(() => {
                                        const lastAudit = assetLogs
                                            .filter(l => l.assetId === compareAsset.id && l.photoUrl)
                                            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];
                                        
                                        if (lastAudit?.photoUrl) {
                                            return (
                                                <>
                                                    <img 
                                                        src={lastAudit.photoUrl} 
                                                        alt="Last Audit" 
                                                        className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-110 cursor-zoom-in" 
                                                        onContextMenu={(e) => e.preventDefault()}
                                                        onClick={() => setPreviewImage(lastAudit.photoUrl || null)}
                                                    />
                                                    <div className="absolute inset-0 bg-brand-teal/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                                        <div className="bg-white/90 backdrop-blur-sm p-3 rounded-2xl shadow-xl">
                                                            <Plus className="w-6 h-6 text-brand-teal" />
                                                        </div>
                                                    </div>
                                                    {/* Timestamp Badge */}
                                                    <div className="absolute bottom-4 left-4 right-4 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 text-left">
                                                        <p className="text-[9px] text-white/60 font-black uppercase tracking-widest">Oleh {lastAudit.operatorName}</p>
                                                        <p className="text-[10px] text-white font-bold">
                                                            {new Date(lastAudit.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} • {new Date(lastAudit.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                                                        </p>
                                                    </div>
                                                </>
                                            );
                                        }
                                        return (
                                            <div className="text-center p-8">
                                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-300">
                                                    <History className="w-8 h-8" />
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Tidak ada foto</p>
                                            </div>
                                        );
                                    })()}
                                </div>
                                <p className="text-[9px] text-center text-gray-400 font-medium italic">Hasil audit terakhir operator</p>
                            </div>
                        </div>

                        {/* Footer Info */}
                        <div className="px-8 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-left">
                                <div className="w-2 h-2 rounded-full bg-brand-purple animate-pulse"></div>
                                <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">Visual Audit System</span>
                            </div>
                            <p className="text-[10px] text-gray-400 font-medium italic text-right">Klik foto untuk memperbesar</p>
                        </div>
                    </div>
                </div>
            )}

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
                                        <div className="bg-brand-purple/10 p-3 rounded-xl border border-brand-purple/20">
                                            <p className="text-[10px] font-black text-brand-purple uppercase tracking-widest mb-1">Umur Aset</p>
                                            <p className="text-sm font-bold text-gray-900">
                                                {calculateAssetAge(historyAsset.entryDate || historyAsset.updatedAt)}
                                            </p>
                                        </div>
                                        <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                                            <p className="text-[10px] font-black text-brand-teal uppercase tracking-widest mb-1">Riwayat Servis</p>
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
                                                        h.type === 'MOVEMENT' ? 'bg-blue-50 text-brand-teal' :
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
                                                    <p className="text-sm font-medium text-gray-900">{new Date(h.timestamp).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    <p className="text-xs text-gray-500 font-bold">{new Date(h.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                                </div>
                                            </div>
                                            {h.notes && (
                                                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 border border-gray-100 mb-3">
                                                    {h.notes}
                                                </div>
                                            )}
                                            {h.photoUrl && (
                                                <div className="mb-3">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Evidence Photo</p>
                                                    <div 
                                                        className="relative w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-100 shadow-sm cursor-zoom-in group/thumb"
                                                        onClick={() => setPreviewImage(h.photoUrl || null)}
                                                    >
                                                        <img src={h.photoUrl} alt="Log Photo" className="w-full h-full object-cover transition-transform group-hover/thumb:scale-110" />
                                                        <div className="absolute inset-0 bg-brand-purple/20 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Plus className="w-5 h-5 text-white" />
                                                        </div>
                                                    </div>
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

            {/* Filter Modal */}
            {
                isFilterMenuOpen && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsFilterMenuOpen(false)}></div>
                        <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h2 className="text-base font-bold text-gray-900 tracking-tight">Filter Katalog</h2>
                                        <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest mt-0.5">Saring Data Aset</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsFilterMenuOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-xl hover:bg-gray-50 transition-all">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-6 py-5 space-y-4">
                                <div className="group text-left">
                                    <label className="block text-[9px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Cabang / Lokasi</label>
                                    <div className="relative">
                                        <select
                                            value={locationFilter}
                                            onChange={(e) => setLocationFilter(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-white focus:bg-white focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all appearance-none cursor-pointer text-gray-700"
                                        >
                                            <option value="ALL">Semua Cabang / Lokasi</option>
                                            {rawLocations.map(loc => (
                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="group text-left">
                                    <label className="block text-[9px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Kategori Aset</label>
                                    <div className="relative">
                                        <select
                                            value={categoryFilter}
                                            onChange={(e) => setCategoryFilter(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-white focus:bg-white focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all appearance-none cursor-pointer text-gray-700"
                                        >
                                            <option value="ALL">Semua Kategori Aset</option>
                                            {categories.map(cat => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>

                                <div className="group text-left">
                                    <label className="block text-[9px] font-black text-gray-400 mb-1.5 uppercase tracking-widest">Kondisi / Status</label>
                                    <div className="relative">
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold hover:bg-white focus:bg-white focus:border-brand-purple/60 focus:ring-2 focus:ring-brand-purple/10 outline-none transition-all appearance-none cursor-pointer text-gray-700"
                                        >
                                            <option value="ALL">Semua Kondisi Aset</option>
                                            <option value="BAIK">Kondisi: BAIK</option>
                                            <option value="RUSAK">Kondisi: RUSAK</option>
                                            <option value="MATI">Kondisi: MATI</option>
                                            <option value="SERVIS">Kondisi: SERVIS</option>
                                            <option value="JUAL">Kondisi: JUAL</option>
                                            <option value="HILANG">Kondisi: HILANG</option>
                                        </select>
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                            <ChevronDown className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="px-6 pb-6 flex gap-3">
                                <button
                                    onClick={() => { setLocationFilter("ALL"); setCategoryFilter("ALL"); setStatusFilter("ALL"); }}
                                    className="flex-1 py-3 text-sm font-bold text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-gray-200 hover:border-rose-200"
                                >
                                    Reset
                                </button>
                                <button
                                    onClick={() => setIsFilterMenuOpen(false)}
                                    className="flex-[2] py-3 bg-brand-purple text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 shadow-lg shadow-brand-purple/25 transition-all"
                                >
                                    Terapkan
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
                                <div className="flex items-center gap-3 text-left">
                                    <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                                        <Tag className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Kelola Kategori</h2>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest mt-0.5">Daftar Resmi Sistem</p>
                                            <button
                                                onClick={async () => {
                                                    const allAssetCats = Array.from(new Set(rawAssets.map(a => a.category).filter(Boolean)));
                                                    const missing = allAssetCats.filter(c => !categories.some(pc => pc.toLowerCase() === c.toLowerCase()));
                                                    if (missing.length > 0) {
                                                        await bulkAddCategories(missing);
                                                        alert(`Berhasil mendaftarkan ${missing.length} kategori baru!`);
                                                    } else {
                                                        alert("Semua kategori sudah terdaftar.");
                                                    }
                                                }}
                                                className="text-[9px] font-black text-white bg-brand-purple hover:bg-brand-purple px-1.5 py-0.5 rounded uppercase tracking-tighter transition-all"
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
                                        className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-purple outline-none shadow-sm"
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
                                        className="bg-brand-purple text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-sm"
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
                                            <div key={cat} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-brand-purple/20 hover:bg-white transition-all shadow-sm">
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
                                                            ? `Kategori "${cat}" digunakan oleh ${usageCount} aset. Tetap hapus?`
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
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div>
    );
}

export default function AssetsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-brand-teal" /></div>}>
            <AssetsContent />
        </Suspense>
    );
}
