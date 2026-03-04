"use client";

import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { DoorOpen, Clock, MapPin, X, Loader2, ClipboardCheck } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function OperatorPage() {
    const { user } = useAuth();
    const { locations, addShift } = useLocalDb();
    const router = useRouter();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stHour, setStHour] = useState("");
    const [stMin, setStMin] = useState("00");
    const [edHour, setEdHour] = useState("");
    const [edMin, setEdMin] = useState("00");
    const [locationId, setLocationId] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!locationId) return alert("Pilih lokasi cabang tempat Anda bertugas.");
        if (!stHour || !edHour) return alert("Pilih jam mulai dan jam selesai.");

        const startTime = `${stHour}:${stMin}`;
        const endTime = `${edHour}:${edMin}`;

        setLoading(true);
        try {
            const selectedLoc = locations.find(l => l.id === locationId);
            await addShift({
                startTime,
                endTime,
                locationId,
                locationName: selectedLoc ? selectedLoc.name : "Unknown",
                notes
            });

            router.push(`/operator/rooms?locationId=${locationId}`);
        } catch (error) {
            console.error(error);
            alert("Gagal memulai tugas.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-800 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-2xl font-black tracking-tight">Halo, {user?.name || "Operator"}</h1>
                    <p className="opacity-80 mt-2 text-sm font-medium">Siap untuk melakukan pengecekan aset hari ini?</p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
            </div>

            <button
                onClick={() => setIsModalOpen(true)}
                className="w-full text-left bg-white border border-gray-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all active:scale-[0.98] transform group"
            >
                <div className="flex items-center space-x-6">
                    <div className="bg-indigo-50 p-6 rounded-2xl text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-inner">
                        <DoorOpen className="w-10 h-10" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">Mulai Checklist</h2>
                        <p className="text-sm text-gray-400 font-bold uppercase tracking-widest mt-1">Inisiasi Tugas Lapangan</p>
                    </div>
                </div>
            </button>

            {/* Modal Shift */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 tracking-tight">Inisiasi Tugas</h3>
                                    <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Detail Shift</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> Jam Mulai
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            required
                                            value={stHour}
                                            onChange={(e) => setStHour(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 font-bold appearance-none text-center"
                                        >
                                            <option value="">HH</option>
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className="font-black text-gray-300">:</span>
                                        <select
                                            required
                                            value={stMin}
                                            onChange={(e) => setStMin(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 font-bold appearance-none text-center"
                                        >
                                            {Array.from({ length: 60 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-rose-400" /> Jam Selesai
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            required
                                            value={edHour}
                                            onChange={(e) => setEdHour(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 font-bold appearance-none text-center"
                                        >
                                            <option value="">HH</option>
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className="font-black text-gray-300">:</span>
                                        <select
                                            required
                                            value={edMin}
                                            onChange={(e) => setEdMin(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 font-bold appearance-none text-center"
                                        >
                                            {Array.from({ length: 60 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" /> Lokasi Penugasan
                                </label>
                                <select
                                    required
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 font-bold appearance-none"
                                >
                                    <option value="">-- Pilih Cabang --</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan Tambahan (Opsional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 min-h-[100px]"
                                    placeholder="Contoh: Bertugas menggantikan shift pagi..."
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-gray-200"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "MASUK KE RUANGAN"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
