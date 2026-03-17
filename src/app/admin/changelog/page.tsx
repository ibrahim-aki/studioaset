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
                // Fetch commit history from central repository
                const response = await fetch("https://api.github.com/repos/ibrahim-aki/studioaset/commits?per_page=100");
                if (!response.ok) throw new Error("Failed to load system history");

                const data: GithubCommit[] = await response.json();

                // Advanced Filtration: Strictly exclude Super Admin, GitHub, and Vercel related updates
                const filteredCommits = data.filter(item => {
                    const message = item.commit.message.toLowerCase();
                    const isExcluded =
                        message.includes("super admin") ||
                        message.includes("super-admin") ||
                        message.includes("superadmin") ||
                        message.includes("sa-update") ||
                        message.includes("fix sa") ||
                        message.includes("merge branch") ||
                        message.includes("github") ||
                        message.includes("vercel") ||
                        message.includes("sync");
                    return !isExcluded;
                });

                setCommits(filteredCommits);
            } catch (err: any) {
                console.error("Fetch Error:", err);
                setError("Failed to retrieve system updates.");
            } finally {
                setLoading(false);
            }
        };

        fetchCommits();
    }, []);

    if (loading) {
        return (
            <div className="p-12 font-mono text-[13px] text-gray-400">
                Loading data...
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-3xl mx-auto font-mono text-[11px] text-[#333] leading-normal uppercase">
            <h1 className="font-bold mb-4 text-[14px]">System Updates:</h1>

            {error && (
                <div className="mb-4 text-rose-600">
                    ERR: {error}
                </div>
            )}

            <div className="space-y-4 border-l border-gray-200 ml-1 pl-6 relative">
                {commits.map((item, index) => {
                    const commitDate = new Date(item.commit.author.date);
                    const day = commitDate.getDay();
                    const hour = commitDate.getHours();

                    // Working Hours: Mon-Fri (1-5), 09:00-18:00
                    const isOutsideWorkHours = day === 0 || day === 6 || hour < 9 || hour >= 18;

                    // rule 11: Hari Tanggal Jam tulis dalah bahasa Indonesia
                    const dayStr = commitDate.toLocaleDateString('id-ID', { weekday: 'long' });
                    const dateStr = `${commitDate.getDate()}/${commitDate.getMonth() + 1}/${commitDate.getFullYear()}`;
                    const timeStr = commitDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

                    return (
                        <div key={item.sha} className="relative">
                            {/* Dot on timeline */}
                            <div className={clsx(
                                "absolute -left-[27px] top-1.5 w-2 h-2 rounded-full border-2 border-white transition-all",
                                index === 0 ? "bg-brand-teal animate-pulse" : "bg-gray-300"
                            )} />

                            <div className={clsx(
                                "font-bold mb-1 flex items-center gap-2",
                                isOutsideWorkHours ? "text-rose-600" : "text-gray-900"
                            )}>
                                {dayStr}, {dateStr} {timeStr}
                            </div>

                            <div className="space-y-1">
                                <div className="flex gap-3">
                                    <span className="shrink-0 text-gray-300">-</span>
                                    {/* rule 11: deskripsi Cangelog tulis dalam bahasa inggris */}
                                    <p className="flex-1">
                                        {item.commit.message.split('\n')[0]
                                            .replace(/^(.*?)\d{1,2}[:.]\d{2}\s*-\s*/, '') // Remove timestamp prefixes like "Selasa, 17 Maret 2026 10:48 - "
                                            .replace(/^FITUR:/i, 'FEAT:') // Standardize FITUR to FEAT
                                            .trim()}
                                    </p>
                                </div>

                                {item.commit.message.split('\n').length > 1 && (
                                    <div className="space-y-1 opacity-80">
                                        {item.commit.message.split('\n').slice(1).filter(line => line.trim() !== '').map((line, idx) => (
                                            <div key={idx} className="flex gap-3">
                                                <span className="shrink-0 text-gray-300">-</span>
                                                <p className="flex-1">{line.trim()}</p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {commits.length === 0 && !loading && (
                    <div className="text-gray-400 italic">
                        No system records found.
                    </div>
                )}
            </div>

            <footer className="mt-20 pt-10 border-t border-gray-100 opacity-30">
                <p className="text-[10px]">End of system log</p>
            </footer>
        </div>
    );
}
