"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalDb, Room } from "@/context/LocalDbContext";
import { Plus, Edit2, Trash2, DoorOpen, X, Loader2, Video, MapPin, ChevronDown, ChevronUp, Filter } from "lucide-react";
import Link from "next/link";

export default function RoomsPage() {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: "", locationId: "", name: "", description: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [locationFilter, setLocationFilter] = useState("ALL");
    const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
    const filterRef = useRef<HTMLDivElement>(null);

    const { rooms: rawRooms, locations: rawLocations, roomAssets, checklists, addRoom, updateRoom, deleteRoom } = useLocalDb();

    useEffect(() => {
        const roomsData = [...rawRooms];
        // Sort by Location name first, then by Room name
        roomsData.sort((a, b) => {
            const locA = rawLocations.find(l => l.id === a.locationId)?.name || "";
            const locB = rawLocations.find(l => l.id === b.locationId)?.name || "";

            if (locA !== locB) {
                return locA.localeCompare(locB);
            }
            return a.name.localeCompare(b.name);
        });
        setRooms(roomsData);
        setLoading(false);
    }, [rawRooms, rawLocations]);

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
                setFilterDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredRooms = rooms.filter(r => locationFilter === "ALL" || r.locationId === locationFilter);

    const openModal = (room?: Room) => {
        if (room) {
            setFormData(room);
        } else {
            setFormData({ id: "", locationId: rawLocations[0]?.id || "", name: "", description: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ id: "", locationId: rawLocations[0]?.id || "", name: "", description: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (formData.id) {
                await updateRoom(formData.id, {
                    locationId: formData.locationId,
                    name: formData.name,
                    description: formData.description
                });
            } else {
                // Add new
                await addRoom({
                    locationId: formData.locationId,
                    name: formData.name,
                    description: formData.description
                });
            }
            closeModal();
        } catch (error) {
            console.error("Error saving room:", error);
            alert("Gagal menyimpan data ruangan.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Apakah Anda yakin ingin menghapus ruangan "${name}"?`)) {
            try {
                await deleteRoom(id);
            } catch (error) {
                console.error("Error deleting room:", error);
                alert("Gagal menghapus ruangan.");
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <DoorOpen className="w-6 h-6 text-indigo-600" />
                        Manajemen Ruangan
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Pantau dan konfigurasi semua ruangan studio live streaming Anda di seluruh lokasi cabang.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 flex items-center gap-2">
                    {/* Filter Icon with Custom Dropdown */}
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setFilterDropdownOpen(prev => !prev)}
                            className={`p-2.5 rounded-lg border transition-all flex items-center justify-center ${locationFilter !== "ALL"
                                ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                                : "border-gray-300 bg-white text-gray-500 hover:border-gray-400 hover:text-gray-700"
                                }`}
                            title="Filter Lokasi"
                        >
                            <Filter className="w-5 h-5" />
                        </button>

                        {/* Dropdown Panel */}
                        {filterDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                                <button
                                    onClick={() => { setLocationFilter("ALL"); setFilterDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${locationFilter === "ALL"
                                        ? "bg-indigo-50 text-indigo-700 font-semibold"
                                        : "text-gray-700 hover:bg-gray-50"
                                        }`}
                                >
                                    <MapPin className="w-4 h-4 opacity-50" />
                                    Semua Lokasi
                                </button>
                                {rawLocations.map(loc => (
                                    <button
                                        key={loc.id}
                                        onClick={() => { setLocationFilter(loc.id); setFilterDropdownOpen(false); }}
                                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2 ${locationFilter === loc.id
                                            ? "bg-indigo-50 text-indigo-700 font-semibold"
                                            : "text-gray-700 hover:bg-gray-50"
                                            }`}
                                    >
                                        <MapPin className="w-4 h-4 opacity-50" />
                                        {loc.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Add Room Icon Button */}
                    <button
                        onClick={() => openModal()}
                        className="p-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-sm flex items-center justify-center"
                        title="Tambah Ruangan"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-sm font-medium text-gray-500">Memuat data ruangan...</span>
                    </div>
                ) : filteredRooms.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                            <DoorOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Tidak Ditemukan</h3>
                        <p className="text-gray-500 mt-1 mb-6">Belum ada data ruangan untuk kriteria yang Anda pilih.</p>
                        <button onClick={() => setLocationFilter("ALL")} className="text-blue-600 font-bold hover:underline text-sm uppercase tracking-widest">Tampilkan Semua</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2 px-4">
                                <thead>
                                    <tr className="text-gray-400">
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Informasi Ruangan</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Lokasi Cabang</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Status</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Aset</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Deskripsi</th>
                                        <th scope="col" className="py-3 px-4 text-right text-[10px] font-bold uppercase tracking-wider">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredRooms.map((room) => {
                                        const locName = rawLocations.find(l => l.id === room.locationId)?.name || "-";
                                        return (
                                            <tr key={room.id} className="group bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-100 rounded-lg">
                                                <td className="py-4 px-4 rounded-l-lg border-y border-l border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-semibold text-gray-900">{room.name}</span>
                                                            <span className="text-[10px] text-gray-400 uppercase tracking-tighter">#{room.id.substring(0, 8)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-gray-500 border-y border-gray-100">
                                                    {locName}
                                                </td>
                                                <td className="py-4 px-4 text-sm border-y border-gray-100">
                                                    {(() => {
                                                        const latestCheck = checklists.find(c => c.roomId === room.id);
                                                        const status = latestCheck?.roomStatus || "";

                                                        if (status === "LIVE_NOW") return (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700 ring-1 ring-green-600/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse"></span>
                                                                Sedang Live
                                                            </span>
                                                        );
                                                        if (status === "READY_FOR_LIVE" || status === "STANDBY" || status === "FINISHED_LIVE") return (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 ring-1 ring-blue-600/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mr-1.5"></span>
                                                                STANDBY
                                                            </span>
                                                        );
                                                        if (status === "NOT_READY") return (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 ring-1 ring-rose-600/20">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 mr-1.5"></span>
                                                                TIDAK BISA LIVE
                                                            </span>
                                                        );
                                                        return (
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500 ring-1 ring-gray-400/20">
                                                                Belum Dicek
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="py-4 px-4 text-sm border-y border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs ring-1 ring-indigo-200">
                                                            {roomAssets.filter(ra => ra.roomId === room.id).length}
                                                        </span>
                                                        <span className="text-gray-400 text-[10px] font-medium uppercase tracking-tight">Perangkat</span>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-4 text-sm text-gray-400 border-y border-gray-100 italic">
                                                    {room.description || "-"}
                                                </td>
                                                <td className="py-4 px-4 whitespace-nowrap text-right rounded-r-lg border-y border-r border-gray-100">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Link
                                                            href={`/admin/rooms/${room.id}`}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Aset Ruangan"
                                                        >
                                                            <Video className="w-4 h-4" />
                                                        </Link>
                                                        <button
                                                            onClick={() => openModal(room)}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(room.id, room.name)}
                                                            className="p-1.5 text-gray-400 hover:text-rose-600 transition-colors"
                                                            title="Hapus"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/40" onClick={closeModal}></div>
                    <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl p-8 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">
                                    {formData.id ? "Edit Ruangan" : "Ruangan Baru"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Tentukan nama dan lokasi spesifik ruangan ini.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Lokasi Cabang</label>
                                <select
                                    required
                                    value={formData.locationId}
                                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                >
                                    <option value="" disabled>Pilih Lokasi Cabang</option>
                                    {rawLocations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Nama Ruangan</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Studio Video A"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Deskripsi Ruangan</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    placeholder="Catatan tambahan tentang fasilitas ruangan..."
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm resize-none"
                                />
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
                                    ) : (formData.id ? "Simpan Perubahan" : "Simpan Ruangan")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
