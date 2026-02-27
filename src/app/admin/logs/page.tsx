"use client";

import { useState, useEffect } from "react";
import { useLocalDb, AssetLog } from "@/context/LocalDbContext";
import {
    History, Search, Filter, Clock, User,
    Tag, Activity, ShieldCheck, LogIn, ExternalLink,
    AlertCircle, CheckCircle2, Info
} from "lucide-react";
import clsx from "clsx";

export default function AdminLogsPage() {
    const { assetLogs } = useLocalDb();
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [filteredLogs, setFilteredLogs] = useState<AssetLog[]>([]);

    useEffect(() => {
        // Hanya tampilkan log yang secara eksplisit memiliki role "ADMIN"
        // Tambahan: Sembunyikan jika isinya mengandung "Super Admin" (untuk membersihkan log lama yang salah label)
        let docs = assetLogs.filter(log => {
            const isRoleAdmin = log.operatorRole === "ADMIN";
            const isContentSuperAdmin = log.toValue?.toLowerCase().includes("super admin");
            return isRoleAdmin && !isContentSuperAdmin;
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-[1200px] mx-auto">
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

            {/* Logs List */}
            <div className="space-y-4">
                {filteredLogs.map((log) => (
                    <div
                        key={log.id}
                        className="group bg-white rounded-2xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-all border-l-4"
                        style={{
                            borderLeftColor:
                                log.type === 'AUTH' ? '#10b981' :
                                    log.type === 'SYSTEM' ? '#a855f7' :
                                        log.type === 'MOVEMENT' ? '#f59e0b' : '#3b82f6'
                        }}
                    >
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-start gap-4">
                                <div className={clsx(
                                    "p-2.5 rounded-xl border shrink-0",
                                    getLogBadge(log.type)
                                )}>
                                    {getLogIcon(log.type)}
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-sm font-bold text-gray-900">{log.toValue}</h3>
                                        <span className={clsx(
                                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border tracking-widest",
                                            getLogBadge(log.type)
                                        )}>
                                            {log.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-500 leading-relaxed">
                                        {log.notes || "Tidak ada catatan tambahan."}
                                    </p>
                                    {log.assetName && (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <Tag className="w-3 h-3 text-indigo-400" />
                                            <span className="text-[10px] font-bold text-indigo-600 uppercase">
                                                ASET: {log.assetName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="md:text-right border-t md:border-t-0 pt-3 md:pt-0 space-y-1">
                                <div className="flex md:justify-end items-center gap-1.5 text-gray-700">
                                    <User className="w-3.5 h-3.5" />
                                    <span className="text-xs font-bold uppercase tracking-tight">{log.operatorName}</span>
                                </div>
                                <div className="flex md:justify-end items-center gap-1.5 text-gray-400">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-medium">
                                        {new Date(log.timestamp).toLocaleDateString('id-ID', {
                                            day: 'numeric', month: 'short', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredLogs.length === 0 && (
                    <div className="py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                        <Activity className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Belum ada aktivitas yang tercatat untuk filter ini.</p>
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-8 border-t border-gray-100 flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                <span>System Audit v2.0</span>
                <span>Security Logging Enabled</span>
            </footer>
        </div>
    );
}
