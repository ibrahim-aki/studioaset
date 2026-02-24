"use client";

import { useState, useEffect } from "react";
import { useLocalDb, Location } from "@/context/LocalDbContext";
import { Plus, Edit2, Trash2, MapPin, X, Loader2 } from "lucide-react";

export default function LocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ id: "", name: "", address: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { locations: rawLocations, addLocation, updateLocation, deleteLocation, rooms } = useLocalDb();

    useEffect(() => {
        const locationsData = [...rawLocations];
        // Sort alphabetically
        locationsData.sort((a, b) => a.name.localeCompare(b.name));
        setLocations(locationsData);
        setLoading(false);
    }, [rawLocations]);

    const openModal = (location?: Location) => {
        if (location) {
            setFormData(location);
        } else {
            setFormData({ id: "", name: "", address: "" });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setFormData({ id: "", name: "", address: "" });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (formData.id) {
                updateLocation(formData.id, {
                    name: formData.name,
                    address: formData.address
                });
            } else {
                // Add new
                addLocation({
                    name: formData.name,
                    address: formData.address
                });
            }
            closeModal();
        } catch (error) {
            console.error("Error saving location:", error);
            alert("Gagal menyimpan data lokasi.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        const hasRooms = rooms.some(r => r.locationId === id);
        if (hasRooms) {
            alert(`Tidak dapat menghapus lokasi "${name}" karena masih ada ruangan yang terdaftar di lokasi ini. Hapus atau pindahkan ruangan tersebut terlebih dahulu.`);
            return;
        }

        if (confirm(`Apakah Anda yakin ingin menghapus lokasi cabang "${name}"?`)) {
            try {
                await deleteLocation(id);
            } catch (error) {
                console.error("Error deleting location:", error);
                alert("Gagal menghapus lokasi.");
            }
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <MapPin className="w-6 h-6 text-indigo-600" />
                        Lokasi Cabang Studio
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Kelola data master kota dan cabang fisik studio Anda dengan efisiensi tinggi.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <button
                        onClick={() => openModal()}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-all"
                    >
                        <Plus className="w-4 h-4" />
                        Tambah Lokasi Baru
                    </button>
                </div>
            </div>

            {/* Table / List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-20 flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                        <span className="text-sm font-medium text-gray-500">Memuat data lokasi...</span>
                    </div>
                ) : locations.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                            <MapPin className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Data Kosong</h3>
                        <p className="text-gray-500 mt-1 mb-6">Belum ada data lokasi studio cabang yang terdaftar.</p>
                        <button onClick={() => openModal()} className="text-purple-600 font-bold hover:underline text-sm uppercase tracking-widest">Tambah Sekarang</button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-separate border-spacing-y-2 px-4">
                                <thead>
                                    <tr className="text-gray-400">
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Nama Cabang</th>
                                        <th scope="col" className="py-3 px-4 text-left text-[10px] font-bold uppercase tracking-wider">Alamat Lengkap</th>
                                        <th scope="col" className="py-3 px-4 text-center text-[10px] font-bold uppercase tracking-wider">Ruangan</th>
                                        <th scope="col" className="relative py-3 px-4 text-right">
                                            <span className="sr-only">Status</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {locations.map((loc) => {
                                        const roomCount = rooms.filter(r => r.locationId === loc.id).length;

                                        return (
                                            <tr key={loc.id} className="group bg-white hover:bg-gray-50 transition-all duration-200 shadow-sm border border-gray-100 rounded-lg">
                                                <td className="whitespace-nowrap py-4 px-4 text-sm font-semibold text-gray-900 rounded-l-lg border-y border-l border-gray-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                        {loc.name}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 text-sm text-gray-500 border-y border-gray-100">
                                                    {loc.address || <span className="text-gray-300 italic">Belum diatur</span>}
                                                </td>
                                                <td className="whitespace-nowrap px-4 py-4 text-sm text-center border-y border-gray-100">
                                                    <span className="text-gray-600 font-medium">
                                                        {roomCount} Unit
                                                    </span>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 px-4 text-right text-sm rounded-r-lg border-y border-r border-gray-100">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => openModal(loc)}
                                                            className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="Edit"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(loc.id, loc.name)}
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
                                    {formData.id ? "Edit Lokasi" : "Lokasi Baru"}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Lengkapi rincian cabang fisik studio Anda.</p>
                            </div>
                            <button onClick={closeModal} className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Nama Cabang</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Contoh: Jakarta Selatan"
                                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="block text-sm font-medium text-gray-700">Alamat Kantor/Studio</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={4}
                                    placeholder="Jl. Nama Jalan No. 123, Kota..."
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
                                    ) : (formData.id ? "Simpan Perubahan" : "Simpan Data")}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
