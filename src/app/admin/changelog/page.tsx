"use client";

import { useEffect, useState } from "react";
import { History as HistoryIcon, Clock, ChevronRight, GitBranch, Github, Loader2 } from "lucide-react";
import clsx from "clsx";

interface GithubCommit {
    sha: string;
    commit: {
        message: string;
        author: {
            name: string;
            date: string;
        };
    };
    html_url: string;
}

export default function ChangelogPage() {
    const [commits, setCommits] = useState<GithubCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const fetchCommits = async () => {
            try {
                // Mengambil riwayat commit dari repository pusat (Limit 100 untuk detail lebih banyak)
                const response = await fetch("https://api.github.com/repos/ibrahim-aki/studioaset/commits?per_page=100");
                if (!response.ok) throw new Error("Gagal mengambil data riwayat sistem");

                const data: GithubCommit[] = await response.json();

                // Filtrasi ketat: Abaikan update yang berkaitan dengan "super admin"
                const filteredCommits = data.filter(item => {
                    const message = item.commit.message.toLowerCase();
                    const isSuperAdminRelated =
                        message.includes("super admin") ||
                        message.includes("super-admin") ||
                        message.includes("superadmin") ||
                        message.includes("sa-update") ||
                        message.includes("fix sa");
                    return !isSuperAdminRelated;
                });

                setCommits(filteredCommits);
            } catch (err: any) {
                console.error("Fetch Error:", err);
                setError("Gagal memuat riwayat pembaruan sistem.");
            } finally {
                setLoading(false);
            }
        };

        fetchCommits();
    }, []);

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-sm font-bold animate-pulse">Menyamakan riwayat dengan sistem pusat...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <HistoryIcon className="w-6 h-6 text-indigo-600" />
                        Riwayat Pembaruan Sistem
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Detail lengkap log perubahan dan peningkatan fitur aplikasi.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    System Synchronized
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium mb-8">
                    {error}
                </div>
            )}

            <div className="relative border-l-2 border-indigo-100 ml-3 pl-8 space-y-12">
                {commits.map((item) => (
                    <div key={item.sha} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-indigo-600 shadow-lg shadow-indigo-200"></div>

                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-3">
                            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                                {new Date(item.commit.author.date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </span>
                            <span className="text-[10px] font-bold text-indigo-400">
                                {new Date(item.commit.author.date).toLocaleTimeString('id-ID', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })} WIB
                            </span>
                        </div>

                        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 group">
                            <div className="space-y-3">
                                <h3 className="text-base font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                    {item.commit.message.split('\n')[0]}
                                </h3>

                                {item.commit.message.split('\n').length > 1 && (
                                    <div className="space-y-2 pt-2 border-t border-gray-50">
                                        {item.commit.message.split('\n').slice(1).filter(line => line.trim() !== '').map((line, idx) => (
                                            <div key={idx} className="flex gap-2 text-xs text-gray-500 leading-relaxed">
                                                <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                <p>{line.trim()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}

                {commits.length === 0 && !loading && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium tracking-tight">Belum ada riwayat publik yang tersedia.</p>
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">
                    System Update Log • Last Sync: {new Date().toLocaleTimeString()}
                </p>
            </footer>
        </div>
    );
}
