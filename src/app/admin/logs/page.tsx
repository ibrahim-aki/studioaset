"use client";

import { useState, useEffect } from "react";
import { useLocalDb, AssetLog } from "@/context/LocalDbContext";
import {
    History, Search, Filter, Clock, User,
    Tag, Activity, ShieldCheck, LogIn, ExternalLink,
    AlertCircle, CheckCircle2, Info, Box
} from "lucide-react";
import clsx from "clsx";

export default function AdminLogsPage() {
    const { assetLogs } = useLocalDb();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [filteredLogs, setFilteredLogs] = useState<AssetLog[]>([]);
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    useEffect(() => {
        let docs = assetLogs.filter(log => {
            return log.operatorRole !== "SUPER_ADMIN";
        });

        if (typeFilter !== "ALL") {
            docs = docs.filter(log => log.type === typeFilter);
        }

        if (searchTerm.trim() !== "") {
            const query = searchTerm.toLowerCase();
            docs = docs.filter(log =>
                log.operatorName.toLowerCase().includes(query) ||
                log.toValue.toLowerCase().includes(query) ||
                (log.assetName && log.assetName.toLowerCase().includes(query)) ||
                (log.notes && log.notes.toLowerCase().includes(query))
            );
        }

        setFilteredLogs(docs);
    }, [assetLogs, searchTerm, typeFilter]);

    return (
        <div className="p-4 sm:p-6 lg:p-4 max-w-full mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 tracking-tighter uppercase">
                        <History className="w-5 h-5 text-brand-purple" />
                        Log Aktivitas Admin
                    </h1>

                </div>
                <div className="flex items-center gap-2 px-2 py-1 bg-emerald-50 text-brand-teal rounded-lg border border-emerald-100 text-[9px] font-bold uppercase tracking-tighter">
                    <span className="w-1.5 h-1.5 bg-brand-teal rounded-full animate-ping" />
                    Real-time Audit Active
                </div>
            </div>

            {/* Filter & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6">
                <div className="md:col-span-3 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari admin, kejadian, atau keterangan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-[9px] font-bold tracking-tighter focus:ring-1 focus:ring-brand-purple outline-none transition-all shadow-sm uppercase"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-bold tracking-tighter focus:ring-1 focus:ring-brand-purple outline-none transition-all shadow-sm appearance-none uppercase text-gray-600"
                    >
                        <option value="ALL">Semua Tipe Aktivitas</option>
                        <option value="SYSTEM">Sistem & Master</option>
                        <option value="MOVEMENT">Perpindahan Barang</option>
                        <option value="STATUS">Perubahan Status</option>
                        <option value="AUTH">Akses & Login</option>
                    </select>
                </div>
            </div>

            {/* Logs List */}
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto max-h-[750px] custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20 shadow-sm">
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-2 py-2 bg-gray-50 text-[9px] uppercase font-bold text-gray-500 tracking-tighter text-left w-[110px]">Waktu Log</th>
                                <th className="px-2 py-2 bg-gray-50 text-[9px] uppercase font-bold text-gray-500 tracking-tighter text-left w-[140px]">Admin / Operator</th>
                                <th className="px-2 py-2 bg-gray-50 text-[9px] uppercase font-bold text-gray-500 tracking-tighter text-left">Jenis & Kejadian</th>
                                <th className="px-2 py-2 bg-gray-50 text-[9px] uppercase font-bold text-gray-500 tracking-tighter text-left">Detail Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-20 text-center">
                                        <Activity className="w-8 h-8 text-gray-100 mx-auto mb-2" />
                                        <p className="text-[9px] font-bold text-gray-300 uppercase tracking-tighter italic">Belum ada aktivitas tercatat</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, index) => {
                                    const logDate = new Date(log.timestamp);
                                    const logTime = logDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                    const logDay = logDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                                    
                                    let showTime = true;
                                    if (index > 0) {
                                        const prevLog = filteredLogs[index - 1];
                                        const prevDate = new Date(prevLog.timestamp);
                                        const prevTime = prevDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                                        const prevDay = prevDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                                        if (logTime === prevTime && logDay === prevDay && log.operatorName === prevLog.operatorName) {
                                            showTime = false;
                                        }
                                    }

                                    return (
                                        <tr key={log.id} className="group hover:bg-orange-50/50 transition-all duration-150 border-b border-gray-50 last:border-0 text-[10px]">
                                            <td className="px-2 py-1.5 whitespace-nowrap align-top tracking-tighter font-bold">
                                                {showTime ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-gray-900">{logTime}</span>
                                                        <span className="text-gray-400 font-medium">{logDay}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 opacity-20 py-1">
                                                        <div className="w-1 h-1 rounded-full bg-gray-400" />
                                                        <div className="h-[1px] w-2 bg-gray-300" />
                                                    </div>
                                                )}
                                            </td>

                                            <td className="px-2 py-1.5 whitespace-nowrap tracking-tighter align-top">
                                                <div className="flex items-center gap-1.5">
                                                    <User className="w-2.5 h-2.5 text-gray-400" />
                                                    <span className="font-bold text-gray-600 uppercase">
                                                        {log.operatorName.split(' ')[0]}
                                                        <span className="ml-1 text-gray-400 font-medium whitespace-nowrap">({log.operatorRole})</span>
                                                    </span>
                                                </div>
                                            </td>

                                            {/* KOLOM JENIS & KEJADIAN - NO WRAP, NO AUTO-WIDTH LIMIT */}
                                            <td 
                                                className="px-2 py-1.5 tracking-tighter align-top cursor-pointer"
                                                onClick={() => setExpandedEventId(expandedEventId === log.id ? null : log.id)}
                                            >
                                                <div className={clsx(
                                                    "flex items-center gap-1.5 transition-all duration-300",
                                                    expandedEventId === log.id ? "flex-wrap whitespace-normal bg-blue-50/30 p-1 rounded" : "flex-nowrap whitespace-nowrap truncate max-w-[600px]"
                                                )}>
                                                    <span className={clsx(
                                                        "text-[9px] font-bold leading-none shrink-0 tracking-tighter",
                                                        log.type === "MOVEMENT" ? "text-brand-orange" :
                                                            log.type === "STATUS" ? "text-brand-teal" :
                                                                log.type === "AUTH" ? "text-brand-teal" :
                                                                    log.type === "SYSTEM" ? "text-brand-purple" : "text-gray-400"
                                                    )}>
                                                        [{log.type}]
                                                    </span>
                                                    <span className="font-bold text-gray-700 uppercase">
                                                        {log.toValue}
                                                    </span>
                                                    {log.assetName && (
                                                        <span className="text-brand-purple/60 font-bold uppercase italic flex items-center gap-1">
                                                            • {log.assetName}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* KOLOM DETAIL CATATAN - USE REMAINING SPACE */}
                                            <td className="px-2 py-1.5 tracking-tighter align-top min-w-[200px]">
                                                <div
                                                    onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                    className={clsx(
                                                        "text-gray-500 italic leading-tight cursor-pointer transition-all duration-200",
                                                        expandedLogId === log.id 
                                                            ? "whitespace-normal bg-orange-50/30 p-1.5 rounded-lg border border-orange-100 shadow-sm text-gray-700 font-bold non-italic" 
                                                            : "line-clamp-1 hover:text-brand-purple font-medium"
                                                    )}
                                                >
                                                    {log.notes || "-"}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="mt-8 pt-4 border-t border-gray-100 flex justify-end items-center text-[9px] text-gray-300 font-bold uppercase tracking-tighter">
                <span>Logging Enabled - {filteredLogs.length} Entries</span>
            </footer>
        </div>
    );
}
