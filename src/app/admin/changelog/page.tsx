"use client";

import React, { useState, useEffect } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { History as HistoryIcon, Loader2 } from "lucide-react";

import clsx from "clsx";

import changelogsData from "@/data/changelogs.json";

interface ChangelogEntry {
    date: string;
    type: string;
    message: string;
    details?: string[];
}

export default function ChangelogPage() {
    const [commits, setCommits] = useState<ChangelogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Helper to process and set logs
        const processLogs = (firestoreLogs: (ChangelogEntry & { id: string })[]) => {
            const rawLogs = [...firestoreLogs, ...changelogsData];

            // Filter based on Rule 7 (Hide Super Admin, Github, Vercel, Cloudinary info)
            const filteredLogs = rawLogs.filter(log => {
                const forbiddenKeywords = ["super admin", "github", "vercel", "cloudinary"];
                const content = (log.message + (log.details?.join(" ") || "")).toLowerCase();
                if (log.type === "CORE") return false;
                if (forbiddenKeywords.some(key => content.includes(key))) return false;
                return true;
            });

            // Sort by Date, newest first. Handle invalid dates safely.
            const sortedLogs = filteredLogs.sort((a, b) => {
                const dateB = new Date(b.date).getTime() || 0;
                const dateA = new Date(a.date).getTime() || 0;
                return dateB - dateA;
            });

            setCommits(sortedLogs);
            setLoading(false);
        };

        // Try Firestore first, fallback to local JSON on error
        try {
            const q = query(collection(db, "central_changelogs"), orderBy("date", "desc"));
            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const firestoreLogs = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data()
                    })) as (ChangelogEntry & { id: string })[];
                    processLogs(firestoreLogs);
                },
                (_error) => {
                    // Firestore failed - fallback to local JSON only
                    processLogs([]);
                }
            );
            return () => unsubscribe();
        } catch (_e) {
            // Firestore not reachable at all - show local data
            processLogs([]);
        }
    }, []);



    if (loading) {
        return (
            <div className="p-12 font-mono text-[13px] text-gray-400">
                Loading data...
            </div>
        );
    }

    return (
        <div className="relative">
            {/* STICKY HEADER - HASIL NYATA BOS */}
            <div className="sticky top-16 lg:top-0 z-40 bg-gray-50/95 backdrop-blur-md border-b border-gray-200 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-5 transition-all duration-300">
                <div className="max-w-3xl mx-auto flex flex-col sm:flex-row sm:items-baseline gap-2 font-mono text-[11px] uppercase tracking-tighter">
                    <h1 className="font-bold text-[14px] whitespace-nowrap text-[#333]">System Updates:</h1>
                </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-0 pt-8 max-w-3xl mx-auto font-mono text-[11px] text-[#333] leading-normal uppercase">
                <div className="space-y-4 border-l border-gray-200 ml-1 pl-6 relative">
                    {commits.map((item, index) => {
                    const commitDate = new Date(item.date);
                    const day = commitDate.getDay();
                    const hour = commitDate.getHours();

                    // Working Hours: Mon-Fri (1-5), 09:00-18:00
                    const isOutsideWorkHours = day === 0 || day === 6 || hour < 9 || hour >= 18;

                    // rule 8: Hari Tanggal Jam tulis dalah bahasa Indonesia
                    const dayStr = commitDate.toLocaleDateString('id-ID', { weekday: 'long' });
                    const dateStr = `${commitDate.getDate()}/${commitDate.getMonth() + 1}/${commitDate.getFullYear()}`;
                    const timeStr = commitDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }).replace('.', ':');

                    return (
                        <div key={index} className="relative">
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

                            <div className="space-y-2">
                                {/* JUDUL: Baris mandiri, Tanpa Garis, Font Normal */}
                                <div className="text-gray-900 leading-tight">
                                    {item.message}
                                </div>

                                {/* DETAIL: Di bawah judul, tersusun ke bawah, dengan Garis */}
                                {item.details && item.details.length > 0 && (
                                    <div className="space-y-1 pl-1 opacity-80">
                                        {item.details.map((line, idx) => (
                                            <div key={idx} className="flex gap-3 items-start">
                                                <span className="shrink-0 text-gray-900 font-bold mt-0.5">-</span>
                                                <p className="flex-1 text-[9px] sm:text-[10px] lowercase leading-relaxed">
                                                    {line.trim()}
                                                </p>
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
        </div>
    );
}

