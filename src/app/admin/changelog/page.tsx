"use client";

import { useLocalDb, ChangelogEntry } from "@/context/LocalDbContext";
import { History as HistoryIcon, Rocket, Bug, Zap, Clock, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";

export default function ChangelogPage() {
    const { changelogs, addChangelog } = useLocalDb();

    // Helper to add initial data if empty (Automating the developer's work)
    useEffect(() => {
        if (changelogs.length === 0) {
            const initialLogs: Omit<ChangelogEntry, "id">[] = [
                {
                    version: "1.2.0",
                    date: new Date().toISOString(),
                    title: "Pembaruan Panel Manajemen & Dashboard",
                    description: "Peningkatan pada kolom informasi dan navigasi dashboard untuk admin.",
                    type: "FEAT",
                    changes: [
                        "Penambahan kolom 'Aset' di Manajemen Ruangan (menampilkan jumlah perangkat).",
                        "Penambahan kolom 'Status' di Manajemen Ruangan (Sedang Live, Standby, Tidak Bisa Live).",
                        "Kartu metrik di Dashboard Admin kini dapat diklik untuk navigasi cepat.",
                        "Label filter di Katalog Master diubah menjadi 'Status Aset' agar lebih konsisten."
                    ],
                    visibility: "PUBLIC"
                },
                {
                    version: "1.1.0",
                    date: "2026-02-25T10:00:00Z",
                    title: "Sistem Audit & Log",
                    description: "Implementasi pelacakan aktivitas untuk keamanan dan transparansi data.",
                    type: "IMPROVE",
                    visibility: "PUBLIC",
                    changes: [
                        "Penambahan 'Log Sistem' untuk memantau login/logout admin dan operasional.",
                        "Audit log otomatis saat status aset berubah atau barang berpindah ruangan.",
                        "Perbaikan tampilan tabel laporan agar lebih minimalis dan responsif."
                    ]
                },
                {
                    version: "1.0.0",
                    date: "2026-02-20T08:00:00Z",
                    title: "Peluncuran Perdana Studio Aset",
                    description: "Sistem manajemen aset digital untuk studio live streaming.",
                    type: "FEAT",
                    visibility: "PUBLIC",
                    changes: [
                        "Manajemen Lokasi Cabang dan Ruangan.",
                        "Katalog Master Aset dengan kategorisasi otomatis.",
                        "Sistem Checklist untuk operator setiap sebelum dan sesudah sesi live."
                    ]
                }
            ];

            initialLogs.forEach(log => addChangelog(log));
        }
    }, [changelogs, addChangelog]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-10">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <HistoryIcon className="w-6 h-6 text-indigo-600" />
                    Changelog Aplikasi
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Catatan pembaruan, perbaikan, dan fitur baru yang ditambahkan oleh pengembang.
                </p>
            </div>

            <div className="relative border-l-2 border-indigo-100 ml-3 pl-8 space-y-12">
                {changelogs.filter(log => log.visibility === "PUBLIC").map((log) => (
                    <div key={log.id} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-sm"></div>

                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-2">
                            <span className="text-lg font-bold text-gray-900">{log.version}</span>
                            <span className="text-xs font-medium text-gray-400">
                                {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                            <span className={clsx(
                                "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                                log.type === "FEAT" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                                    log.type === "FIX" ? "bg-rose-50 text-rose-700 border border-rose-100" :
                                        "bg-blue-50 text-blue-700 border border-blue-100"
                            )}>
                                {log.type === "FEAT" ? "Fitur Baru" : log.type === "FIX" ? "Perbaikan" : "Peningkatan"}
                            </span>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                            <h3 className="text-base font-bold text-gray-800 mb-2">{log.title}</h3>
                            <p className="text-sm text-gray-500 mb-4">{log.description}</p>

                            <ul className="space-y-2">
                                {log.changes.map((change, idx) => (
                                    <li key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                                        <ChevronRight className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
                                        <span>{change}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                ))}

                {changelogs.length === 0 && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">Memproses data changelog...</p>
                    </div>
                )}
            </div>

            <div className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                    &copy; 2026 Live Studio Aset Management • Versi Terbaru {changelogs[0]?.version || "1.0.0"}
                </p>
            </div>
        </div>
    );
}
