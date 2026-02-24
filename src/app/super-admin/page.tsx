"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc } from "firebase/firestore";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck } from "lucide-react";
import clsx from "clsx";

interface UserData {
    id: string;
    uid: string;
    email: string;
    role: "ADMIN" | "OPERATOR" | "SUPER_ADMIN";
    name: string;
}

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<"users" | "reports" | "logs">("users");
    const [users, setUsers] = useState<UserData[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (activeTab === "users") fetchUsers();
        if (activeTab === "reports") fetchChecklists();
    }, [activeTab]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const usersList: UserData[] = [];
            querySnapshot.forEach((doc) => {
                usersList.push({ id: doc.id, ...doc.data() } as UserData);
            });
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "checklists"));
            const querySnapshot = await getDocs(q);
            const list: any[] = [];
            querySnapshot.forEach((doc) => {
                list.push({ id: doc.id, ...doc.data() });
            });
            setChecklists(list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        } catch (error) {
            console.error("Error fetching checklists:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        } catch (error) {
            alert("Gagal mengubah role");
        }
    };

    const deleteReport = async (reportId: string) => {
        if (!confirm("Hapus laporan ini secara permanen?")) return;
        try {
            await deleteDoc(doc(db, "checklists", reportId));
            setChecklists(checklists.filter(c => c.id !== reportId));
        } catch (error) {
            alert("Gagal menghapus laporan");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-indigo-600" />
                        Pusat Kontrol Sistem
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola seluruh aspek keamanan dan audit aplikasi.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    <button
                        onClick={() => setActiveTab("users")}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            activeTab === "users" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <Users className="w-4 h-4" />
                        PENGGUNA
                    </button>
                    <button
                        onClick={() => setActiveTab("reports")}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            activeTab === "reports" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <ClipboardCheck className="w-4 h-4" />
                        AUDIT LAPORAN
                    </button>
                    <button
                        onClick={() => setActiveTab("logs")}
                        className={clsx(
                            "px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2",
                            activeTab === "logs" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                        )}
                    >
                        <ShieldAlert className="w-4 h-4" />
                        LOG SISTEM
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">Memuat data...</p>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {activeTab === "users" && (
                        <div className="grid gap-4">
                            <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex items-start gap-3 mb-2">
                                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    <span className="font-bold uppercase block mb-1 text-[10px]">Pendaftaran Account Baru:</span>
                                    Buat akun baru di <b>Authentication</b> console terlebih dahulu. Salin UID akun tersebut dan buat dokumen baru di koleksi <code className="bg-amber-100 px-1 rounded font-bold">users</code> dengan ID dokumen tersebut.
                                </p>
                            </div>

                            {users.map((userData) => (
                                <div key={userData.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className={clsx(
                                                "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                                userData.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-600" :
                                                    userData.role === "ADMIN" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                            )}>
                                                {userData.role === "SUPER_ADMIN" ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    {userData.name}
                                                    {userData.role === "SUPER_ADMIN" && (
                                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded">Pemilik</span>
                                                    )}
                                                </h3>
                                                <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-4 mt-1">
                                                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                        <Mail className="w-3.5 h-3.5" />
                                                        {userData.email}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-mono italic">
                                                        UID: {userData.id.substring(0, 12)}...
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {userData.role !== "SUPER_ADMIN" && (
                                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                                    <button
                                                        onClick={() => handleRoleChange(userData.id, "ADMIN")}
                                                        className={clsx(
                                                            "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                            userData.role === "ADMIN"
                                                                ? "bg-white text-indigo-600 shadow-sm"
                                                                : "text-gray-400 hover:text-gray-600"
                                                        )}
                                                    >
                                                        ADMIN
                                                    </button>
                                                    <button
                                                        onClick={() => handleRoleChange(userData.id, "OPERATOR")}
                                                        className={clsx(
                                                            "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                            userData.role === "OPERATOR"
                                                                ? "bg-white text-emerald-600 shadow-sm"
                                                                : "text-gray-400 hover:text-gray-600"
                                                        )}
                                                    >
                                                        OPERATOR
                                                    </button>
                                                </div>
                                            )}

                                            {userData.role !== "SUPER_ADMIN" && (
                                                <button
                                                    className="p-2.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                                    onClick={() => {
                                                        if (confirm(`Hapus akses untuk ${userData.name}? User tidak akan bisa login lagi.`)) {
                                                            deleteDoc(doc(db, "users", userData.id)).then(() => fetchUsers());
                                                        }
                                                    }}
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}

                                            {userData.role === "SUPER_ADMIN" && (
                                                <div className="px-4 py-2 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-xl border border-purple-100 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    AKSES PENUH
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === "reports" && (
                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Audit Seluruh Laporan</h3>
                                <p className="text-[10px] font-bold text-gray-400">TOTAL: {checklists.length}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/30">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Waktu</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Operator</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Ruangan</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Kondisi</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {checklists.map((report) => (
                                            <tr key={report.id} className="hover:bg-gray-50 transition-colors group text-[11px]">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-gray-900">{new Date(report.timestamp).toLocaleDateString('id-ID')}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5 font-mono italic">{new Date(report.timestamp).toLocaleTimeString('id-ID')}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-700">{report.operatorName}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded">{report.roomName}</span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "text-[9px] font-black px-2 py-1 rounded-sm uppercase",
                                                        report.roomStatus === "READY_FOR_LIVE" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                                                    )}>
                                                        {report.roomStatus.replace(/_/g, " ")}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        onClick={() => deleteReport(report.id)}
                                                        className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                                        title="Hapus Laporan"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === "logs" && (
                        <div className="bg-indigo-950 rounded-3xl p-8 text-indigo-200 border border-indigo-900 shadow-xl">
                            <div className="flex flex-col items-center justify-center text-center py-10">
                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <ShieldAlert className="w-8 h-8 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Monitor Log Aktivitas</h3>
                                <p className="text-sm opacity-60 max-w-sm">Fitur log sedang disiapkan untuk melacak setiap perubahan data dan riwayat keamanan sistem secara transparan.</p>
                                <div className="mt-8 flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-75"></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-150"></div>
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce delay-300"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Studio Management System v2.1 • SUPER ADMIN CONSOLE</p>
            </footer>
        </div>
    );
}
