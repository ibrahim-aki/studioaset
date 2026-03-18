"use client";

import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { DoorOpen, Clock, MapPin, X, Loader2, ClipboardCheck } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";

export default function OperatorPage() {
    const { user } = useAuth();
    const { locations, addShift, endShift, operatorShifts } = useLocalDb();
    const router = useRouter();

    const activeShift = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [stHour, setStHour] = useState("");
    const [stMin, setStMin] = useState("");
    const [edHour, setEdHour] = useState("");
    const [edMin, setEdMin] = useState("00");
    const [locationId, setLocationId] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);

    // Update start time to current device time when modal opens
    useEffect(() => {
        if (isModalOpen) {
            const now = new Date();
            setStHour(now.getHours().toString().padStart(2, '0'));
            setStMin(now.getMinutes().toString().padStart(2, '0'));
        }
    }, [isModalOpen]);

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
            const msg = error instanceof Error ? error.message : "Gagal memulai tugas.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    if (user?.role === "CLIENT_OPERATOR") {
        return (
            <div className="space-y-4">
                <div className="bg-gradient-to-br from-[#1A0D3C] to-brand-purple rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10">
                        <h1 className="text-xl font-bold tracking-tight">Halo, {user?.name || "Client Operator"}</h1>
                        <p className="opacity-80 mt-1 text-xs font-medium italic">Panel Khusus Pengecekan Barang Client</p>
                    </div>
                </div>

                <div className="space-y-3">
                    <h2 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest ml-4">Pilih Cabang</h2>
                    <div className="grid grid-cols-1 gap-2.5">
                        {locations.map(loc => (
                            <button
                                key={loc.id}
                                onClick={() => router.push(`/operator/rooms?locationId=${loc.id}`)}
                                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center justify-between hover:border-brand-purple/30 hover:shadow-md transition-all group"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-brand-purple/5 rounded-xl text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                                        <MapPin className="w-5 h-5" />
                                    </div>
                                    <span className="font-bold text-gray-900 text-base">{loc.name}</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:text-brand-purple group-hover:bg-brand-purple/5 transition-all">
                                    <DoorOpen className="w-4 h-4" />
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="bg-gradient-to-br from-brand-purple to-brand-purple rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <h1 className="text-xl font-bold tracking-tight">Halo, {user?.name || "Operator"}</h1>
                    <p className="opacity-80 mt-1 text-xs font-medium italic">Siap untuk pengecekan aset hari ini?</p>
                </div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
            </div>

            {!activeShift ? (
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full text-left bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-brand-purple transition-all active:scale-[0.99] transform group"
                >
                    <div className="flex items-center space-x-5">
                        <div className="bg-brand-purple/5 p-4 rounded-xl text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                            <DoorOpen className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Mulai Checklist</h2>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Inisiasi Tugas Lapangan</p>
                        </div>
                    </div>
                </button>
            ) : (
                <div className="space-y-3">
                    <div className="bg-white border-2 border-brand-purple/20 rounded-2xl p-6 shadow-md relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3">
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-brand-teal/5 text-brand-teal text-[9px] font-bold uppercase rounded-full border border-brand-teal/10 animate-pulse">
                                <span className="w-1 h-1 rounded-full bg-brand-teal"></span>
                                Aktif
                            </span>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-purple/10 p-4 rounded-xl text-brand-purple">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-gray-900 uppercase tracking-tight">Sesi Aktif</h2>
                                    <p className="text-xs text-brand-purple font-bold uppercase tracking-widest mt-0.5">{activeShift.locationName}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                                <div>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Shift</p>
                                    <p className="text-xs font-bold text-gray-700">{activeShift.startTime} - {activeShift.endTime}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Dimulai</p>
                                    <p className="text-xs font-bold text-gray-700">{new Date(activeShift.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB</p>
                                </div>
                            </div>

                            <div className="flex gap-2.5">
                                <button
                                    onClick={() => router.push(`/operator/rooms?locationId=${activeShift.locationId}`)}
                                    className="flex-1 py-3 bg-brand-purple hover:bg-brand-purple/90 text-white font-bold rounded-xl transition-all shadow-md shadow-brand-purple/20 text-xs uppercase tracking-widest"
                                >
                                    Lanjut Checklist
                                </button>
                                <button
                                    onClick={async () => {
                                        if (confirm("Apakah Anda yakin ingin mengakhiri tugas hari ini?")) {
                                            setLoading(true);
                                            await endShift(activeShift.id);
                                            setLoading(false);
                                        }
                                    }}
                                    disabled={loading}
                                    className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl transition-all text-xs uppercase tracking-widest border border-rose-100/50"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Akhiri"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}


            {/* Modal Shift */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-purple/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                                    <ClipboardCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 tracking-tight">Inisiasi Tugas</h3>
                                    <p className="text-[10px] text-brand-purple font-bold uppercase tracking-widest">Detail Shift</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3" /> Jam Mulai
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            disabled
                                            value={stHour}
                                            className="flex-1 px-3 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-sm outline-none font-semibold appearance-none text-center text-gray-400"
                                        >
                                            <option value="">HH</option>
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className="font-black text-gray-300">:</span>
                                        <select
                                            disabled
                                            value={stMin}
                                            className="flex-1 px-3 py-3 bg-gray-100 border border-gray-100 rounded-2xl text-sm outline-none font-bold appearance-none text-center text-gray-400"
                                        >
                                            {Array.from({ length: 60 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 ml-1 flex items-center gap-1.5">
                                        <Clock className="w-3 h-3 text-rose-400" /> Jam Selesai
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            required
                                            value={edHour}
                                            onChange={(e) => setEdHour(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple font-semibold appearance-none text-center"
                                        >
                                            <option value="">HH</option>
                                            {Array.from({ length: 24 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                        <span className="font-bold text-gray-300">:</span>
                                        <select
                                            required
                                            value={edMin}
                                            onChange={(e) => setEdMin(e.target.value)}
                                            className="flex-1 px-3 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple font-semibold appearance-none text-center"
                                        >
                                            {Array.from({ length: 60 }).map((_, i) => (
                                                <option key={i} value={i.toString().padStart(2, '0')}>{i.toString().padStart(2, '0')}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1 flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3" /> Lokasi Penugasan
                                </label>
                                <select
                                    required
                                    value={locationId}
                                    onChange={(e) => setLocationId(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple font-semibold appearance-none"
                                >
                                    <option value="">-- Pilih Cabang --</option>
                                    {locations.map(loc => (
                                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Keterangan Tambahan (Opsional)</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple min-h-[100px]"
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
