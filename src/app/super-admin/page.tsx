"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck, UserPlus, X, Lock, Eye, EyeOff, History, Clock, Tag, MapPin, KeyRound } from "lucide-react";
import { useLocalDb } from "@/context/LocalDbContext";
import { onSnapshot, collection, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import clsx from "clsx";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, inMemoryPersistence } from "firebase/auth";

// Komponen Modal Tambah User
function AddUserModal({ isOpen, onClose, onRefresh }: { isOpen: boolean; onClose: () => void; onRefresh: () => void }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"ADMIN" | "OPERATOR">("OPERATOR");
    const [locationId, setLocationId] = useState("HQ");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const { locations } = useLocalDb();

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

            // Pastikan koneksi bersih
            const existingApp = getApps().find(app => app.name === "Secondary");
            if (existingApp) await deleteApp(existingApp);

            const secondaryApp = initializeApp(firebaseConfig, "Secondary");
            const secondaryAuth = getAuth(secondaryApp);
            await setPersistence(secondaryAuth, inMemoryPersistence);

            const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
            const newUser = userCredential.user;

            const selectedLocation = locations.find(l => l.id === locationId);

            await setDoc(doc(db, "users", newUser.uid), {
                name,
                email,
                role,
                locationId,
                locationName: selectedLocation ? selectedLocation.name : (locationId === "HQ" ? "Kantor Pusat (HQ)" : "-"),
                uid: newUser.uid,
                createdAt: new Date().toISOString()
            });

            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);

            setEmail("");
            setPassword("");
            setName("");
            setLocationId("HQ");

            alert("User berhasil didaftarkan!");
            onClose();
            onRefresh();
        } catch (err: any) {
            console.error("DEBUG FIREBASE:", err);
            if (err.code === "auth/email-already-in-use") {
                setError("Email ini sudah terdaftar di Firebase (Authentication). Silakan hapus di Firebase Console jika ingin mendaftar ulang.");
            } else if (err.code === "auth/weak-password") {
                setError("Password terlalu lemah (min. 6 karakter).");
            } else {
                setError(`Gagal: ${err.code || "ERR"} - ${err.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
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
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
                                    placeholder="Min. 6 karakter"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 px-4 flex items-center text-gray-400"
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
                                        "py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all",
                                        role === "ADMIN" ? "bg-indigo-600 border-indigo-600 text-white shadow-lg" : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}
                                >
                                    ADMIN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setRole("OPERATOR")}
                                    className={clsx(
                                        "py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all",
                                        role === "OPERATOR" ? "bg-emerald-500 border-emerald-500 text-white shadow-lg" : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}
                                >
                                    OPERATOR
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Penempatan Cabang</label>
                            <select
                                required
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
                            >
                                <option value="HQ">Kantor Pusat (HQ)</option>
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="pt-4">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Daftarkan Pengguna"}
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
    locationName?: string;
    locationId?: string;
}

export default function UserManagementPage() {
    const [activeTab, setActiveTab] = useState<"users" | "reports" | "logs">("users");
    const [users, setUsers] = useState<UserData[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [trialMode, setTrialMode] = useState<boolean | null>(null);

    const { assetLogs, checklists: contextChecklists, locations } = useLocalDb();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const list: UserData[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
            const roleOrder = { "SUPER_ADMIN": 1, "ADMIN": 2, "OPERATOR": 3 };
            const sortedList = list.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
            setUsers(sortedList);
            setLoading(false);
        }, (err) => {
            console.warn("User listener error:", err);
            setLoading(false);
        });

        const unsubSettings = onSnapshot(doc(db, "settings", "system-config"), (snap) => {
            if (snap.exists()) setTrialMode(snap.data().trialModeEnabled);
        });

        return () => {
            unsub();
            unsubSettings();
        };
    }, []);

    useEffect(() => {
        setChecklists(contextChecklists);
    }, [contextChecklists]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            await updateDoc(doc(db, "users", userId), { role: newRole });
        } catch (error) {
            alert("Gagal mengubah role");
        }
    };

    const handleLocationChange = async (userId: string, newLocId: string) => {
        try {
            const selectedLoc = locations.find(l => l.id === newLocId);
            const locationName = selectedLoc ? selectedLoc.name : (newLocId === "HQ" ? "Kantor Pusat (HQ)" : "-");

            await updateDoc(doc(db, "users", userId), {
                locationId: newLocId,
                locationName: locationName
            });
        } catch (error) {
            alert("Gagal memindahkan cabang");
        }
    };

    const toggleTrialMode = async () => {
        if (trialMode === null) return;
        try {
            await updateDoc(doc(db, "settings", "system-config"), { trialModeEnabled: !trialMode });
        } catch (error) {
            alert("Gagal mengubah mode uji coba");
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Kirim reset password ke ${email}?`)) return;
        try {
            await sendPasswordResetEmail(getAuth(), email);
            alert("Email reset terkirim!");
        } catch (error) {
            alert("Gagal mengirim reset password");
        }
    };

    if (loading) {
        return (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                <Loader2 className="w-8 h-8 animate-spin" />
                <p>Memuat data...</p>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onRefresh={() => { }}
            />

            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Shield className="w-6 h-6 text-indigo-600" /> Pusat Kontrol Sistem
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola seluruh aspek keamanan dan audit aplikasi.</p>
                </div>

                <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                    {[
                        { id: "users", name: "Pengguna", icon: Users },
                        { id: "reports", name: "Audit", icon: ClipboardCheck },
                        { id: "logs", name: "Log", icon: ShieldAlert }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={clsx(
                                "px-4 py-2 text-xs font-bold rounded-xl transition-all uppercase flex items-center gap-2",
                                activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            <span className="hidden md:inline">{tab.name}</span>
                        </button>
                    ))}
                </div>
            </header>

            <div className="space-y-6">
                {activeTab === "users" && (
                    <>
                        <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                    <UserPlus className="w-6 h-6 text-indigo-300" /> Manajemen Akses
                                </h3>
                                <p className="text-sm text-indigo-100/80">Daftarkan Admin atau Operator baru dengan penugasan cabang yang spesifik.</p>
                            </div>
                            <button onClick={() => setIsAddUserOpen(true)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-xs hover:scale-105 transition-all">
                                + TAMBAH PENGGUNA
                            </button>
                        </div>

                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-50">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">User</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Cabang</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.map((u) => (
                                            <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400">
                                                            <User className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900 text-xs">{u.name}</p>
                                                            <p className="text-[10px] text-gray-400">{u.email}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                                                        u.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                            u.role === "ADMIN" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                    )}>
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {u.role === "SUPER_ADMIN" ? (
                                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Semua Cabang</span>
                                                    ) : (
                                                        <select
                                                            value={u.locationId || ""}
                                                            onChange={(e) => handleLocationChange(u.id, e.target.value)}
                                                            className="bg-transparent text-[10px] font-bold text-gray-600 outline-none focus:text-indigo-600 cursor-pointer"
                                                        >
                                                            <option value="">Belum Set</option>
                                                            <option value="HQ">Kantor Pusat (HQ)</option>
                                                            {locations.map(loc => (
                                                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                                                            ))}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {u.role !== "SUPER_ADMIN" && (
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button onClick={() => handleResetPassword(u.email)} className="p-2 text-gray-400 hover:text-amber-600"><KeyRound className="w-4 h-4" /></button>
                                                            <button onClick={async () => {
                                                                if (confirm("Hapus user?")) await deleteDoc(doc(db, "users", u.id));
                                                            }} className="p-2 text-gray-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "reports" && (
                    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-50 bg-gray-100/50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest">Audit Seluruh Laporan Checklist</h3>
                            <span className="text-[10px] font-bold text-indigo-600">Total: {checklists.length} Laporan</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Tanggal & Waktu</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Cabang / Ruangan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Operator</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Status Ruangan</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {checklists.map((report) => (
                                        <tr key={report.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-gray-900">{new Date(report.timestamp).toLocaleDateString('id-ID')}</p>
                                                <p className="text-[10px] text-gray-400 font-medium">{new Date(report.timestamp).toLocaleTimeString('id-ID')}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-xs font-bold text-gray-900">{report.locationName}</p>
                                                <p className="text-[10px] text-indigo-500 font-black uppercase tracking-tight">{report.roomName}</p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">
                                                        {report.operatorName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-xs font-medium text-gray-700">{report.operatorName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={clsx(
                                                    "px-2 py-0.5 rounded text-[9px] font-black uppercase border",
                                                    report.roomStatus === "LIVE_NOW" ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                        report.roomStatus === "READY_FOR_LIVE" ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                            report.roomStatus === "NOT_READY" ? "bg-rose-50 text-rose-600 border-rose-100" : "bg-gray-50 text-gray-600 border-gray-100"
                                                )}>
                                                    {report.roomStatus?.replace(/_/g, " ") || "SELESAI"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    onClick={async () => {
                                                        if (confirm("Hapus laporan audit ini secara permanen?")) {
                                                            await deleteDoc(doc(db, "checklists", report.id));
                                                        }
                                                    }}
                                                    className="p-2 text-gray-400 hover:text-rose-600 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {checklists.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400 font-medium text-sm">
                                                <ClipboardCheck className="w-12 h-12 mx-auto mb-4 opacity-10" />
                                                Belum ada laporan audit masuk.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === "logs" && (
                    <div className="bg-white border-2 border-gray-100 rounded-2xl overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Record Log Aktivitas</h3>
                            <button
                                onClick={async () => {
                                    if (confirm("PERINGATAN: Hapus seluruh log aktivitas sistem secara permanen?")) {
                                        try {
                                            const promises = assetLogs.map(log => deleteDoc(doc(db, "assetLogs", log.id)));
                                            await Promise.all(promises);
                                            alert("Log berhasil dikosongkan.");
                                        } catch (error) {
                                            alert("Gagal mengosongkan log.");
                                        }
                                    }
                                }}
                                className="flex items-center gap-2 px-3 py-1.5 text-rose-500 hover:text-rose-700 text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                                Kosongkan Data
                            </button>
                        </div>
                        <div className="overflow-x-auto max-h-[750px] custom-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-white sticky top-0 z-10 border-b border-gray-100 italic">
                                    <tr>
                                        <th className="px-4 py-2 text-[9px] uppercase font-medium text-gray-300 tracking-widest whitespace-nowrap">Waktu (WIB)</th>
                                        <th className="px-4 py-2 text-[9px] uppercase font-medium text-gray-300 tracking-widest">Aktivitas & Detail Data</th>
                                        <th className="px-4 py-2 text-[9px] uppercase font-medium text-gray-300 tracking-widest">Otoritas (Internal)</th>
                                        <th className="px-4 py-2 text-[9px] uppercase font-medium text-gray-300 tracking-widest">Catatan Sistem</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {assetLogs.map(log => (
                                        <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-4 py-1 whitespace-nowrap align-middle">
                                                <span className="text-[10px] text-gray-500 font-medium">
                                                    {new Date(log.timestamp).toLocaleDateString('id-ID')} · {new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap align-middle">
                                                <div className="flex items-center gap-1.5 overflow-hidden max-w-[400px]">
                                                    <span className={clsx(
                                                        "text-[9px] font-medium uppercase tracking-tighter shrink-0",
                                                        log.type === "MOVEMENT" ? "text-blue-600" :
                                                            log.type === "STATUS" ? "text-amber-600" :
                                                                log.type === "AUTH" ? "text-purple-600" : "text-gray-400"
                                                    )}>
                                                        [{log.type}]
                                                    </span>
                                                    <span className="text-[10px] font-medium text-gray-900 truncate">
                                                        {log.assetName || "SYS"}: {log.toValue}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap align-middle">
                                                <div className="flex items-center gap-1.5 italic">
                                                    <span className="text-[10px] font-medium text-gray-700">{log.operatorName}</span>
                                                    <span className={clsx(
                                                        "text-[8px] font-medium uppercase tracking-widest opacity-60",
                                                        log.operatorRole === "SUPER_ADMIN" ? "text-purple-500" :
                                                            log.operatorRole === "ADMIN" ? "text-indigo-500" : "text-emerald-500"
                                                    )}>
                                                        ({log.operatorRole || "SYS"})
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-1 whitespace-nowrap align-middle">
                                                <p className="text-[10px] text-gray-400 font-normal italic truncate max-w-[200px]" title={log.notes}>
                                                    {log.notes || "-"}
                                                </p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

            </div>

            <footer className="mt-12 pt-8 border-t border-gray-100 text-center text-[9px] text-gray-400 font-bold uppercase tracking-widest italic">
                Studio Management System v2.2 • Stable Edition
            </footer>
        </div >
    );
}
