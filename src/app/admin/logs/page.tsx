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

    useEffect(() => {
        // Tampilkan semua log untuk perusahaan ini (sudah difilter di context)
        // PENTING: Sembunyikan semua kegiatan Super Admin demi privasi & keamanan sistem utama
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

    const getLogIcon = (type: string) => {
        switch (type) {
            case "AUTH": return <LogIn className="w-4 h-4 text-emerald-500" />;
            case "MOVEMENT": return <Activity className="w-4 h-4 text-amber-500" />;
            case "STATUS": return <ShieldCheck className="w-4 h-4 text-blue-500" />;
            case "SYSTEM": return <Tag className="w-4 h-4 text-purple-500" />;
            default: return <Info className="w-4 h-4 text-gray-500" />;
        }
    };

    const getLogBadge = (type: string) => {
        switch (type) {
            case "AUTH": return "bg-emerald-50 text-emerald-700 border-emerald-100";
            case "MOVEMENT": return "bg-amber-50 text-amber-700 border-amber-100";
            case "STATUS": return "bg-blue-50 text-blue-700 border-blue-100";
            case "SYSTEM": return "bg-purple-50 text-purple-700 border-purple-100";
            default: return "bg-gray-50 text-gray-700 border-gray-100";
        }
    };

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-full mx-auto min-h-screen">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <History className="w-6 h-6 text-indigo-600" />
                        Log Aktivitas Admin
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Audit trail seluruh aktivitas manajemen sistem dan inventaris.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Real-time Audit Active
                </div>
            </div>

            {/* Filter & Search */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="md:col-span-2 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Cari admin, kejadian, atau keterangan..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                    />
                </div>
                <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm appearance-none"
                    >
                        <option value="ALL">Semua Tipe Aktivitas</option>
                        <option value="SYSTEM">Sistem & Master</option>
                        <option value="MOVEMENT">Perpindahan Barang</option>
                        <option value="STATUS">Perubahan Status</option>
                        <option value="AUTH">Akses & Login</option>
                    </select>
                </div>
            </div>

            {/* Logs List - COMPACT TABLE STYLE (Inspired by Super Admin) */}
            {/* Logs List - COMPACT TABLE STYLE (Minimalist List Style) */}
            <div className="bg-transparent overflow-hidden">
                <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr className="text-gray-400">
                                <th className="px-2 py-2 text-[9px] uppercase font-bold text-gray-400 tracking-wider text-left w-[140px]">Waktu Log</th>
                                <th className="px-2 py-2 text-[9px] uppercase font-bold text-gray-400 tracking-wider text-left w-[350px]">Jenis & Kejadian</th>
                                <th className="px-2 py-2 text-[9px] uppercase font-bold text-gray-400 tracking-wider text-center w-[150px]">Admin / Operator</th>
                                <th className="px-2 py-2 text-[9px] uppercase font-bold text-gray-400 tracking-wider text-left">Detail Catatan</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-24 text-center">
                                        <Activity className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                                        <p className="text-[10px] font-bold text-gray-300 uppercase tracking-widest italic">Belum ada aktivitas tercatat</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="group hover:bg-orange-100/70 transition-all duration-200 border-b border-gray-100 last:border-0 text-[10px]">
                                        <td className="px-2 py-1 whitespace-nowrap">
                                            <span className="font-bold text-gray-900 mr-2">
                                                {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                            <span className="text-gray-400 font-medium tracking-tighter">
                                                {new Date(log.timestamp).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </span>
                                        </td>
                                        <td className="px-2 py-1">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className={clsx(
                                                    "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded border leading-none shrink-0 tracking-tighter",
                                                    log.type === "MOVEMENT" ? "text-amber-600 border-amber-100 bg-amber-50" :
                                                        log.type === "STATUS" ? "text-blue-600 border-blue-100 bg-blue-50" :
                                                            log.type === "AUTH" ? "text-emerald-600 border-emerald-100 bg-emerald-50" :
                                                                log.type === "SYSTEM" ? "text-purple-600 border-purple-100 bg-purple-50" : "text-gray-400 border-gray-100 bg-gray-50"
                                                )}>
                                                    {log.type}
                                                </span>
                                                <div className="flex items-center gap-2 truncate group-hover:whitespace-normal transition-all duration-300">
                                                    <span className="font-bold text-gray-700 truncate group-hover:text-indigo-600 transition-colors" title={log.toValue}>{log.toValue}</span>
                                                    {log.assetName && (
                                                        <span className="text-indigo-400/70 font-bold uppercase flex items-center gap-1 shrink-0 italic">
                                                            • {log.assetName}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1 text-center whitespace-nowrap">
                                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100 group-hover:bg-white group-hover:border-indigo-100 transition-all">
                                                <User className="w-2.5 h-2.5 text-gray-400" />
                                                <span className="font-bold text-gray-600 uppercase tracking-tighter">
                                                    {log.operatorName.split(' ')[0]}
                                                    <span className="ml-1 text-gray-400 font-medium font-bold">({log.operatorRole || 'USER'})</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-1 min-w-[200px]">
                                            <div
                                                onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                                className={clsx(
                                                    "text-gray-500 italic leading-relaxed cursor-pointer transition-all duration-300",
                                                    expandedLogId === log.id ? "whitespace-normal bg-gray-50/80 p-1 rounded-md border border-gray-100 shadow-sm" : "truncate hover:text-indigo-600"
                                                )}
                                                title={expandedLogId === log.id ? "Klik untuk memperkecil" : (log.notes ? "Klik untuk melihat catatan lengkap" : "")}
                                            >
                                                {log.notes || "-"}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>System Audit v2.0</span>
                <span>Security Logging Enabled</span>
            </footer>
        </div>
    );
}
