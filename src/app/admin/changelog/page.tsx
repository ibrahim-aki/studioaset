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
                // Mengambil riwayat commit dari repository GitHub
                const response = await fetch("https://api.github.com/repos/ibrahim-aki/studioaset/commits?per_page=50");
                if (!response.ok) throw new Error("Gagal mengambil data dari GitHub");

                const data: GithubCommit[] = await response.json();

                // Filtrasi: Abaikan update yang berkaitan dengan "super admin"
                const filteredCommits = data.filter(item => {
                    const message = item.commit.message.toLowerCase();
                    const isSuperAdminUpdate = message.includes("super admin") ||
                        message.includes("super-admin") ||
                        message.includes("superadmin");
                    return !isSuperAdminUpdate;
                });

                setCommits(filteredCommits);
            } catch (err: any) {
                console.error("Github API Error:", err);
                setError("Gagal memuat riwayat update otomatis.");
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
                <p className="text-sm font-bold animate-pulse">Menyamakan riwayat dengan database GitHub...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
            <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Github className="w-6 h-6 text-gray-900" />
                        Changelog System
                    </h1>
                    <p className="mt-1 text-sm text-gray-500">
                        Riwayat pembaruan sistem yang ditarik otomatis dari repositori pusat.
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                    Live Sync Active
                </div>
            </div>

            {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-medium mb-8">
                    {error}
                </div>
            )}

            <div className="relative border-l-2 border-indigo-100 ml-3 pl-8 space-y-10">
                {commits.map((item) => (
                    <div key={item.sha} className="relative">
                        {/* Timeline dot */}
                        <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-600 shadow-sm"></div>

                        <div className="flex flex-col md:flex-row md:items-baseline gap-2 mb-2">
                            <span className="text-xs font-black text-indigo-600 font-mono tracking-tighter">
                                {item.sha.substring(0, 7)}
                            </span>
                            <span className="text-xs font-medium text-gray-400">
                                {new Date(item.commit.author.date).toLocaleDateString('id-ID', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </span>
                        </div>

                        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                        {item.commit.message.split('\n')[0]}
                                    </h3>
                                    {item.commit.message.split('\n').length > 1 && (
                                        <p className="text-xs text-gray-500 line-clamp-2">
                                            {item.commit.message.split('\n').slice(1).join(' ')}
                                        </p>
                                    )}
                                </div>
                                <a
                                    href={item.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="p-2 bg-gray-50 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0"
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </a>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-4">
                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400">
                                    <GitBranch className="w-3 h-3" />
                                    <span>MAIN BRANCH</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {commits.length === 0 && !loading && (
                    <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                        <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium tracking-tight">Tidak ada riwayat update untuk ditampilkan.</p>
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-10 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest italic">
                    GitHub Integration Active • Auto-Sync Frequency: On Demand
                </p>
            </footer>
        </div>
    );
}
