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
    ChevronDown, ChevronUp
} from "lucide-react";

function AssetsContent() {
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const initialLocation = searchParams.get("location") || "ALL";

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
    const [activeActionMenu, setActiveActionMenu] = useState<string | null>(null);

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
        deleteAsset
    } = useLocalDb();

    const { user } = useAuth();
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
    }, [rawAssets, locationFilter, categoryFilter, statusFilter, searchTerm]);

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
            let finalName = formData.name.trim();
            let assetCode = (formData as any).assetCode || "";

            if (!formData.id) {
                const smartInfo = getSmartAssetInfo(formData.name, formData.category, rawAssets);
                finalName = smartInfo.finalName;
                assetCode = smartInfo.assetCode;
            }

            const assetData = {
                locationId: formData.locationId,
                assetCode: assetCode,
                name: finalName,
                category: formData.category,
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
                setLastUsed({ locationId: formData.locationId, category: formData.category });
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

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus aset "${name}"?`)) {
            try {
                await deleteAsset(id);
            } catch (error) {
                console.error("Error deleting asset:", error);
                alert("Gagal menghapus aset.");
            }
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
                    "Cabang": assetLocation?.name || "-",
                    "Ruangan": currentRoom?.name || "-",
                    "Tanggal Masuk": asset.entryDate || "-",
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
                const bstr = event.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    alert("File Excel kosong atau tidak valid.");
                    return;
                }

                let importedCount = 0;
                let currentAssetsList = [...rawAssets];

                data.forEach((row: any) => {
                    const name = row["Nama Barang"] || row["Nama"] || row["name"];
                    const category = row["Kategori"] || row["category"];
                    const position = row["Posisi"] || row["position"] || "";

                    if (name && category) {
                        const { assetCode, finalName } = getSmartAssetInfo(String(name), String(category), currentAssetsList);

                        const newAsset = {
                            locationId: rawLocations[0]?.id || "",
                            assetCode: assetCode,
                            name: finalName,
                            category: String(category),
                            status: "BAIK",
                            conditionNotes: "",
                            description: row["Deskripsi"] || row["description"] || "",
                            entryDate: new Date().toISOString().split('T')[0],
                            position: String(position),
                            lastModifiedBy: adminName,
                            updatedAt: new Date().toISOString()
                        };

                        addAsset(newAsset);
                        const assetWithId = { ...newAsset, id: Math.random().toString(36).substr(2, 9) };
                        currentAssetsList.push(assetWithId as Asset);
                        importedCount++;
                    }
                });

                alert(`Berhasil mengimpor ${importedCount} aset baru!`);
            } catch (error) {
                console.error("Error importing data:", error);
                alert("Gagal mengimpor data. Pastikan format Excel benar.");
            }
            e.target.value = '';
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            {/* Header section */}
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Video className="w-6 h-6 text-indigo-600" />
                        Katalog Aset Master
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Manajemen inventaris untuk semua properti produksi dan studio.
                    </p>
                </div>

                <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
                    <div className="relative flex-1 min-w-[300px]">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
                            <Search className="h-4 w-4" />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari Nama, Kode, atau Posisi..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all outline-none"
                        />
                    </div>

                    <div className="relative">
                        <button
                            onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                            className={clsx(
                                "flex items-center justify-center p-2.5 border rounded-xl transition-all",
                                isFilterMenuOpen || locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL"
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                                    : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                            )}
                        >
                            <Filter className="w-5 h-5" />
                            {(locationFilter !== "ALL" || categoryFilter !== "ALL" || statusFilter !== "ALL") && (
                                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-indigo-600 text-white rounded-full">
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
                                            <button
                                                onClick={() => {
                                                    setLocationFilter("ALL");
                                                    setCategoryFilter("ALL");
                                                    setStatusFilter("ALL");
                                                }}
                                                className="flex-1 py-2 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-50 rounded-lg"
                                            >
                                                Reset
                                            </button>
                                            <button
                                                onClick={() => setIsFilterMenuOpen(false)}
                                                className="flex-1 py-2 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 shadow-sm transition-all"
                                            >
                                                Terapkan
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                        <button
                            onClick={() => openModal()}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-800 transition-all"
                            title="Tambah Aset Baru"
                        >
                            <Plus className="w-4 h-4" />
                            Tambah
                        </button>
                        <button
                            onClick={handleExport}
                            className="p-2 border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 rounded-xl transition-all"
                            title="Ekspor ke Excel"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <label className="p-2 border border-gray-200 bg-white text-gray-500 hover:text-indigo-600 rounded-xl transition-all cursor-pointer" title="Impor Data Excel">
                            <Upload className="w-5 h-5" />
                            <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
                        </label>
                    </div>
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
                        {/* Desktop Table */}
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2 px-4">
                                <thead>
                                    <tr className="text-gray-400">
                                        <th scope="col" className="py-3 px-4 text-center text-[10px] font-bold uppercase tracking-wider w-12">No</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Identitas Aset</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Kategori</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Cabang</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Ruangan</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Kondisi</th>
                                        <th scope="col" className="relative py-3 px-4 text-right text-[10px] font-bold uppercase tracking-wider w-16">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAssets.map((asset, index) => {
                                        const roomAsset = rawRoomAssets.find(ra => ra.assetId === asset.id);
                                        const currentRoom = rawRooms.find(r => r.id === roomAsset?.roomId);
                                        const assetLocation = rawLocations.find(l => l.id === asset.locationId);
                                        const cabangName = assetLocation?.name || "-";
                                        const ruanganName = roomAsset ? (currentRoom?.name || "-") : "-";

                                        return (
                                            <tr key={asset.id} className="group bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-100 rounded-lg">
                                                <td className="py-4 px-4 text-[11px] text-gray-400 text-center rounded-l-lg border-y border-l border-gray-100">
                                                    {index + 1}
                                                </td>
                                                <td className="py-4 px-4 border-y border-gray-100">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-gray-900">{asset.name}</span>
                                                        <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{asset.assetCode || "-"}</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-xs font-medium text-gray-500 border-y border-gray-100">
                                                    {asset.category}
                                                </td>
                                                <td className="py-4 px-4 text-xs text-gray-500 border-y border-gray-100">
                                                    {cabangName}
                                                </td>
                                                <td className="py-4 px-4 text-xs text-gray-500 border-y border-gray-100">
                                                    {ruanganName}
                                                </td>
                                                <td className="py-4 px-4 border-y border-gray-100">
                                                    <span className={clsx(
                                                        "inline-flex items-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tight",
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
                                                <td className="py-4 px-4 text-right rounded-r-lg border-y border-r border-gray-100">
                                                    <div className="flex items-center justify-end gap-1 relative z-40">
                                                        <div className={`flex items-center gap-1 overflow-hidden transition-all duration-200 ease-in-out ${activeActionMenu === asset.id ? 'max-w-[120px] opacity-100 mr-1' : 'max-w-0 opacity-0'}`}>
                                                            <button onClick={() => { openHistory(asset); setActiveActionMenu(null); }} className="p-1 px-1.5 rounded-md text-gray-400 hover:text-indigo-600 transition-colors" title="Riwayat"><History className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => { openModal(asset); setActiveActionMenu(null); }} className="p-1 px-1.5 rounded-md text-gray-400 hover:text-indigo-600 transition-colors" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                                                            <button onClick={() => { handleDelete(asset.id, asset.name); setActiveActionMenu(null); }} className="p-1 px-1.5 rounded-md text-gray-400 hover:text-rose-600 transition-colors" title="Hapus"><Trash2 className="w-3.5 h-3.5" /></button>
                                                        </div>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); setActiveActionMenu(activeActionMenu === asset.id ? null : asset.id); }}
                                                            className={`p-1 rounded-md transition-all ${activeActionMenu === asset.id ? 'bg-gray-100 text-gray-900' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'}`}
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
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
                                                <button onClick={() => openModal(asset)} className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-gray-50"><Edit2 className="w-5 h-5" /></button>
                                                <button onClick={() => handleDelete(asset.id, asset.name)} className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-50"><Trash2 className="w-5 h-5" /></button>
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
                                                    GUDANG
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
                )
                }
            </div >

            {/* Asset Form Modal */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <div className="fixed inset-0 bg-gray-900/40" onClick={closeModal}></div>
                        <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-8 overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-200">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">
                                        {formData.id ? "Edit Aset" : "Aset Baru"}
                                    </h2>
                                    <p className="text-sm text-gray-500 mt-1">
                                        {formData.id ? `Kode: ${formData.assetCode || 'Auto'}` : "Masukkan detail aset"}
                                    </p>
                                </div>
                                <button onClick={closeModal} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Cabang (Lokasi Asal)</label>
                                    <select
                                        required
                                        value={formData.locationId}
                                        onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    >
                                        <option value="" disabled>Pilih Lokasi Cabang</option>
                                        {rawLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-sm font-medium text-gray-700">Kategori Alat</label>
                                    <select
                                        required
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
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
                                                {(() => {
                                                    const start = new Date(historyAsset.entryDate || historyAsset.updatedAt || new Date());
                                                    const now = new Date();
                                                    const diffTime = Math.abs(now.getTime() - start.getTime());
                                                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                                    if (diffDays < 30) return `${diffDays} Hari`;
                                                    const diffMonths = Math.floor(diffDays / 30);
                                                    if (diffMonths < 12) return `${diffMonths} Bulan`;
                                                    const years = Math.floor(diffMonths / 12);
                                                    const months = diffMonths % 12;
                                                    return `${years} Tahun ${months} Bulan`;
                                                })()}
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
