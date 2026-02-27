"use client";

import { useState, useEffect } from "react";
import { useLocalDb, Checklist, ChecklistItem } from "@/context/LocalDbContext";
import { ClipboardList, Calendar, MapPin, User, ChevronDown, ChevronUp, Loader2, CheckCircle2, AlertTriangle, AlertOctagon, Zap, Ban, ClipboardCheck, Clock } from "lucide-react";
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
        if (status === "SERVIS") return <Clock className="w-5 h-5 text-blue-500" />;
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
                        <ClipboardList className="w-6 h-6 text-indigo-600" />
                        Riwayat Inspeksi & Laporan
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Pantau hasil evaluasi dan checklist properti yang dikirimkan oleh operator studio.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
            ) : checklists.length === 0 ? (
                <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
                    <ClipboardList className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-bold text-gray-900">Belum Ada Laporan</h3>
                    <p className="text-gray-500 mt-1">Laporan dari operator akan muncul di sini.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {checklists.map((report) => (
                        <div key={report.id} className={clsx(
                            "bg-white rounded-lg shadow-sm border transition-all hover:border-gray-300 overflow-hidden",
                            report.isRead === false ? "border-indigo-100 ring-1 ring-indigo-50" : "border-gray-100"
                        )}>
                            {/* Header Card (Clickable) */}
                            <div
                                className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none"
                                onClick={() => handleExpand(report.id, report.isRead)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm",
                                        report.isRead === false ? "bg-indigo-600 text-white shadow-md shadow-indigo-200" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"
                                    )}>
                                        {report.roomName.charAt(0)}
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <h3 className="text-sm font-bold text-gray-900 leading-tight">
                                                {report.roomName}
                                            </h3>
                                            {report.isRead === false && (
                                                <span className="bg-indigo-600 text-[8px] font-black px-1.5 py-0.5 rounded text-white uppercase tracking-widest">Baru</span>
                                            )}
                                            {getStatusSummary(report.items || [])}
                                            <RoomStatusBadge status={report.roomStatus || ""} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1 text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                            <span className="flex items-center gap-1 leading-none"><Calendar className="w-2.5 h-2.5" /> {formatDate(report.timestamp)}</span>
                                            <span className="flex items-center gap-1 leading-none text-indigo-400"><User className="w-2.5 h-2.5" /> {report.operatorName}</span>
                                            {report.locationName && (
                                                <span className="flex items-center gap-1 leading-none text-gray-300"><MapPin className="w-2.5 h-2.5" /> {report.locationName}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="text-gray-300">
                                        {expandedId === report.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                    </div>
                                </div>
                            </div>

                            {/* Expansion Detail */}
                            {expandedId === report.id && (
                                <div className="bg-gray-50 border-t border-gray-100 p-5 px-5 sm:px-8">
                                    <h4 className="font-semibold text-gray-900 text-sm mb-4">Detail Kondisi Aset</h4>

                                    <ul className="space-y-3">
                                        {(report.items || []).map((item, idx) => (
                                            <li key={idx} className="bg-white border text-sm border-gray-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <div className="flex items-center gap-3">
                                                        <StatusIcon status={item.status} />
                                                        <Link
                                                            href={`/admin/assets?search=${encodeURIComponent(item.assetName)}&location=${report.locationId}`}
                                                            className="font-bold text-gray-900 hover:text-blue-600 hover:underline transition-colors decoration-blue-400 decoration-2 underline-offset-4"
                                                        >
                                                            {item.assetName}
                                                        </Link>
                                                    </div>
                                                    {item.movedToRoomId && item.movedToRoomId !== "" && (() => {
                                                        const isWarehouse = item.movedToRoomId === "GL-WAREHOUSE";
                                                        const targetRoom = isWarehouse ? null : rawRooms.find(r => r.id === item.movedToRoomId);
                                                        const targetLoc = targetRoom ? rawLocations.find(l => l.id === targetRoom.locationId) : null;

                                                        return (
                                                            <span className="inline-flex items-center gap-1 mt-1 ml-8 rounded-md bg-purple-50 px-2 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                                                                <MapPin className="w-3 h-3" /> Dipindah ke: {isWarehouse ? "Gudang" : (targetRoom?.name || "Ruangan Lain")} {targetLoc ? `(${targetLoc.name})` : ""}
                                                            </span>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="flex-1 sm:text-right text-gray-600 text-sm font-medium">
                                                    {item.status === "BAIK" ? (
                                                        <span className="text-green-600">Terverifikasi Baik ✅</span>
                                                    ) : (
                                                        <span className="text-rose-600 italic">"{item.notes || "Tidak ada rincian"}"</span>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>

                                    {report.overallNotes && (
                                        <div className="mt-5 bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm">
                                            <p className="font-bold text-yellow-800 mb-1">Catatan Tambahan Operator:</p>
                                            <p className="text-yellow-700">"{report.overallNotes}"</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
