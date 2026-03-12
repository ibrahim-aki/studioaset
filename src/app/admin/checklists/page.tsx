"use client";

import React, { useState, useEffect } from "react";
import { useLocalDb, Checklist, ChecklistItem } from "@/context/LocalDbContext";
import { ClipboardList, Calendar, MapPin, User, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle, AlertOctagon, Zap, Ban, ClipboardCheck, Clock, Camera, History, LayoutGrid, Search, Filter, Flag } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export default function ChecklistHistoryPage() {
    const [checklists, setChecklists] = useState<Checklist[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const { checklists: rawChecklists, rooms: rawRooms, locations: rawLocations, markChecklistAsRead } = useLocalDb();

    useEffect(() => {
        const data = [...rawChecklists].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setChecklists(data);
        setLoading(false);
    }, [rawChecklists]);

    const handleExpand = (id: string, isRead?: boolean) => {
        const isCurrentlyExpanded = expandedId === id;
        setExpandedId(isCurrentlyExpanded ? null : id);

        if (!isCurrentlyExpanded && !isRead) {
            markChecklistAsRead(id);
        }
    };

    const formatDate = (timestampString: string) => {
        if (!timestampString) return "Waktu tidak diketahui";
        const date = new Date(timestampString);
        return new Intl.DateTimeFormat("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        }).format(date);
    };

    const getStatusSummary = (items: ChecklistItem[]) => {
        const total = items.length;
        const problems: Record<string, number> = {};
        let baikCount = 0;

        items.forEach(item => {
            if (item.status === "BAIK") {
                baikCount++;
            } else {
                // Kelompokkan jumlah berdasarkan statusnya
                problems[item.status] = (problems[item.status] || 0) + 1;
            }
        });

        if (total === baikCount) {
            return <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/20"><CheckCircle2 className="w-3.5 h-3.5" /> Semua Baik</span>;
        } else {
            // Susun label secara dinamis (Hanya yang ada jumlahnya yang muncul)
            const problemSummary = Object.entries(problems)
                .map(([status, count]) => {
                    let label = status;
                    if (status === "RUSAK") label = "Rusak";
                    else if (status === "MATI") label = "Mati";
                    else if (status === "HILANG") label = "Hilang";
                    else if (status === "SERVIS") label = "Servis";
                    else if (status === "JUAL") label = "Jual";

                    // Format: "1 Rusak" atau "2 Mati"
                    return `${count} ${label}`;
                })
                .join(", ");

            return <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10"><AlertOctagon className="w-3.5 h-3.5" /> {problemSummary}</span>;
        }
    };

    const StatusIcon = ({ status }: { status: string }) => {
        if (status === "BAIK") return <CheckCircle2 className="w-5 h-5 text-green-500" />;
        if (status === "SERVIS") return <Clock className="w-5 h-5 text-brand-blue" />;
        return <AlertOctagon className="w-5 h-5 text-rose-500" />;
    };

    const RoomStatusBadge = ({ status }: { status: string }) => {
        switch (status) {
            case "READY_FOR_LIVE":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-1 text-[10px] font-black text-amber-700 uppercase tracking-tighter">
                        <Zap className="w-3 h-3 fill-current" /> Ready For Live
                    </span>
                );
            case "LIVE_NOW":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-green-100 px-2 py-1 text-[10px] font-black text-green-700 uppercase tracking-tighter">
                        <Zap className="w-3 h-3 fill-current" /> Live Now
                    </span>
                );
            case "NOT_READY":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-700 uppercase tracking-tighter">
                        <Ban className="w-3 h-3" /> Not Ready
                    </span>
                );
            case "STANDBY":
            case "ROUTINE_CHECK":
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-[10px] font-black text-gray-500 uppercase tracking-tighter">
                        <ClipboardCheck className="w-3 h-3" /> Standby / Pengecekan
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                        {status.replace(/_/g, " ") || "SELESAI"}
                    </span>
                );
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto">
            <div className="sm:flex sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <ClipboardList className="w-6 h-6 text-brand-purple" />
                        Riwayat Inspeksi & Laporan
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Pantau hasil evaluasi dan checklist properti yang dikirimkan oleh operator studio.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-brand-blue" /></div>
            ) : checklists.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Belum Ada Laporan</h3>
                    <p className="text-gray-500 mt-1">Laporan dari operator akan muncul di sini.</p>
                </div>
            ) : (
                <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100">
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-left">Waktu</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-left">Gedung / Ruangan</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-left">Operator</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-left">Ringkasan Kondisi</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-left">Status Live</th>
                                    <th className="px-4 py-3 text-[10px] uppercase font-bold text-gray-500 tracking-tighter text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {checklists.map((report) => (
                                    <React.Fragment key={report.id}>
                                        <tr
                                            className={clsx(
                                                "group hover:bg-orange-50/10 transition-all duration-150 border-b border-gray-50 last:border-0",
                                                report.isRead === false && "bg-brand-purple/[0.02]"
                                            )}
                                        >
                                            <td className="px-4 py-3 whitespace-nowrap align-top">
                                                <div className="flex flex-col">
                                                    <span className="text-[11px] font-semibold text-gray-900 leading-tight">{formatDate(report.timestamp).split(',')[1]}</span>
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">{formatDate(report.timestamp).split(',')[0]}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-[11px] font-semibold text-gray-900 uppercase tracking-tighter">{report.roomName}</span>
                                                        {report.isRead === false && (
                                                            <span className="bg-brand-purple text-[8px] font-semibold px-1 py-0.5 rounded text-white uppercase tracking-widest">Baru</span>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-semibold text-gray-400 uppercase tracking-tighter flex items-center gap-1">
                                                        <MapPin className="w-2.5 h-2.5" /> {report.locationName}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-3 h-3 text-brand-purple/50" />
                                                    <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-tighter">{report.operatorName}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-2">
                                                    {getStatusSummary(report.items || [])}
                                                    {report.items?.some(item => !!item.photoUrl) && (
                                                        <Camera className="w-3 h-3 text-brand-purple fill-brand-purple/10" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <RoomStatusBadge status={report.roomStatus || ""} />
                                            </td>
                                            <td className="px-4 py-3 text-right align-top">
                                                <button
                                                    onClick={() => handleExpand(report.id, report.isRead)}
                                                    className={clsx(
                                                        "inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-tighter transition-all",
                                                        expandedId === report.id
                                                            ? "bg-brand-purple text-white shadow-md shadow-brand-purple/20"
                                                            : "bg-gray-100 text-gray-600 hover:bg-brand-purple/10 hover:text-brand-purple"
                                                    )}
                                                >
                                                    {expandedId === report.id ? "Tutup" : "Detail"}
                                                    {expandedId === report.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedId === report.id && (
                                            <tr className="bg-gray-50/80 border-b border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                <td colSpan={6} className="px-6 py-8">
                                                    <div className="max-w-5xl mx-auto">
                                                        <div className="flex items-center justify-between mb-6">
                                                            <h4 className="text-sm font-bold text-gray-900 uppercase tracking-widest flex items-center gap-2">
                                                                <ClipboardCheck className="w-4 h-4 text-brand-purple" />
                                                                Detail Laporan Kondisi Aset
                                                            </h4>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            {(report.items || []).map((item, idx) => (
                                                                <div key={idx} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow">
                                                                    <div className="flex items-start justify-between gap-4">
                                                                        <div className="flex-1">
                                                                            <div className="flex items-center gap-3 mb-2">
                                                                                <StatusIcon status={item.status} />
                                                                                <Link
                                                                                    href={`/admin/assets?search=${encodeURIComponent(item.assetName)}`}
                                                                                    className="font-bold text-[11px] text-gray-900 hover:text-brand-purple transition-colors uppercase tracking-tight"
                                                                                >
                                                                                    {item.assetName}
                                                                                </Link>
                                                                            </div>

                                                                            <div className="pl-8 relative">
                                                                                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-50 rounded-full"></div>
                                                                                <p className={clsx(
                                                                                    "text-[10px] font-medium leading-relaxed italic",
                                                                                    item.status === "BAIK" ? "text-gray-400" : "text-rose-600"
                                                                                )}>
                                                                                    {item.notes || (item.status === "BAIK" ? "Terverifikasi Baik ✅" : "Tidak ada rincian")}
                                                                                </p>

                                                                                {item.movedToRoomId && (
                                                                                    <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-50 text-[9px] font-bold text-brand-purple uppercase tracking-tight border border-purple-100">
                                                                                        <MapPin className="w-2.5 h-2.5" /> Pindah Ke: {item.movedToRoomId === "GL-WAREHOUSE" ? "GUDANG" : "RUANGAN LAIN"}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        </div>

                                                                        {item.photoUrl && (
                                                                            <button
                                                                                onClick={() => window.open(item.photoUrl, '_blank')}
                                                                                className="shrink-0 w-20 h-20 rounded-xl overflow-hidden border-2 border-brand-purple/20 hover:border-brand-purple transition-all relative group"
                                                                            >
                                                                                <img src={item.photoUrl} alt={item.assetName} className="w-full h-full object-cover" />
                                                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                                    <Camera className="w-5 h-5 text-white" />
                                                                                </div>
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {report.overallNotes && (
                                                            <div className="mt-6 p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm relative group overflow-hidden">
                                                                <div className="absolute top-0 right-0 p-3 opacity-5 rotate-12 group-hover:rotate-0 transition-transform">
                                                                    <Flag className="w-8 h-8 text-amber-900" />
                                                                </div>
                                                                <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest mb-1 flex items-center gap-2">
                                                                    <Flag className="w-3 h-3" /> Catatan Tambahan Operator:
                                                                </p>
                                                                <p className="text-[11px] text-amber-800 font-medium leading-relaxed italic z-10 relative">
                                                                    "{report.overallNotes}"
                                                                </p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
