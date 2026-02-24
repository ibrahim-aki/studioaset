"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck, UserPlus, X, Lock, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut } from "firebase/auth";

// Komponen Modal Tambah User
function AddUserModal({ isOpen, onClose, onRefresh }: { isOpen: boolean; onClose: () => void; onRefresh: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const firebaseConfig = {
                apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
            };

            const secondaryApp = getApps().find(app => app.name === "Secondary") || initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUser = userCredential.user;

            await setDoc(doc(db, "users", newUser.uid), {
                name,
                email,
                role,
                uid: newUser.uid,
                createdAt: new Date().toISOString()
            });

            await signOut(secondaryAuth);

            alert("User berhasil didaftarkan!");
            onRefresh();
            onClose();
            setEmail("");
            setPassword("");
            setName("");
        } catch (err: any) {
            console.error(err);
            if (err.code === "auth/email-already-in-use") setError("Email sudah terdaftar.");
            else if (err.code === "auth/weak-password") setError("Password terlalu lemah (min. 6 karakter).");
            else setError("Gagal membuat user: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 tracking-tight">Tambah Pengguna</h3>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Akses Baru</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4" /> {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                            <input
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                placeholder="Contoh: Budi Santoso"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                placeholder="email@perusahaan.id"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm focus:bg-white focus:border-indigo-500 outline-none transition-all placeholder:text-gray-300"
                                    placeholder="Min. 6 karakter"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400 hover:text-indigo-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Pilih Peran (Role)</label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setRole("ADMIN")}
                                    className={clsx(
                                        "py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border",
                                        role === "ADMIN" ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}
                                >
                                    ADMIN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("OPERATOR")}
                                    className={clsx(
                                        "py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border",
                                        role === "OPERATOR" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}
                                >
                                    OPERATOR
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gray-900 hover:bg-indigo-600 text-white font-bold rounded-2xl shadow-xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Daftarkan Pengguna</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

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
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);

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
            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onRefresh={fetchUsers}
            />

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
                        <div className="space-y-6">
                            <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 group-hover:scale-110 transition-transform duration-700"></div>
                                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                                    <div className="max-w-md">
                                        <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                            <UserPlus className="w-6 h-6 text-indigo-300" />
                                            Manajemen Akses Anggota
                                        </h3>
                                        <p className="text-sm text-indigo-100/80 leading-relaxed font-medium">
                                            Sekarang Anda bisa mendaftarkan Admin atau Operator baru langsung dari sini tanpa perlu membuka Firebase Console secara manual.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setIsAddUserOpen(true)}
                                        className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all shadow-xl"
                                    >
                                        + TAMBAH PENGGUNA BARU
                                    </button>
                                </div>
                            </div>

                            <div className="grid gap-4">
                                {users.map((userData) => (
                                    <div key={userData.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-6">
                                                <div className={clsx(
                                                    "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
                                                    userData.role === "SUPER_ADMIN" ? "bg-purple-600 text-white overflow-hidden" :
                                                        userData.role === "ADMIN" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                                )}>
                                                    {userData.role === "SUPER_ADMIN" ? (
                                                        <div className="relative w-full h-full flex items-center justify-center">
                                                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-800 to-indigo-500 opacity-50"></div>
                                                            <Shield className="w-7 h-7 relative z-10" />
                                                        </div>
                                                    ) : <User className="w-7 h-7" />}
                                                </div>
                                                <div>
                                                    <h3 className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors flex items-center gap-2">
                                                        {userData.name}
                                                        {userData.role === "SUPER_ADMIN" && (
                                                            <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase rounded-lg tracking-widest border border-purple-200">Owner</span>
                                                        )}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                                                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                                            <Mail className="w-3.5 h-3.5" />
                                                            {userData.email}
                                                        </div>
                                                        <div className="text-[10px] text-gray-300 font-mono tracking-tighter">
                                                            UID: {userData.id.substring(0, 16).toUpperCase()}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                {userData.role !== "SUPER_ADMIN" && (
                                                    <div className="flex bg-gray-50/80 p-1.5 rounded-2xl border border-gray-100 self-center">
                                                        <button
                                                            onClick={() => handleRoleChange(userData.id, "ADMIN")}
                                                            className={clsx(
                                                                "px-4 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all",
                                                                userData.role === "ADMIN"
                                                                    ? "bg-white text-indigo-600 shadow-md"
                                                                    : "text-gray-400 hover:text-gray-600"
                                                            )}
                                                        >
                                                            ADMIN
                                                        </button>
                                                        <button
                                                            onClick={() => handleRoleChange(userData.id, "OPERATOR")}
                                                            className={clsx(
                                                                "px-4 py-2 text-[10px] font-black tracking-widest rounded-xl transition-all",
                                                                userData.role === "OPERATOR"
                                                                    ? "bg-white text-emerald-600 shadow-md"
                                                                    : "text-gray-400 hover:text-gray-600"
                                                            )}
                                                        >
                                                            OPS
                                                        </button>
                                                    </div>
                                                )}

                                                {userData.role !== "SUPER_ADMIN" && (
                                                    <button
                                                        className="p-3 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"
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
                                                    <div className="px-5 py-2.5 bg-gray-50 text-gray-400 text-[10px] font-black rounded-2xl border border-gray-100 flex items-center gap-2 tracking-widest uppercase">
                                                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        Protected
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
