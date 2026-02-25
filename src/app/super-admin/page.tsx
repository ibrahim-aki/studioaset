"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck, UserPlus, X, Lock, Eye, EyeOff, History, Clock, Tag, MapPin, KeyRound } from "lucide-react";
import { useLocalDb } from "@/context/LocalDbContext";
import { onSnapshot, collection, query, orderBy, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import clsx from "clsx";
import { initializeApp, getApps } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from "firebase/auth";

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
    const [trialMode, setTrialMode] = useState<boolean | null>(null);

    const { assetLogs, checklists: contextChecklists, locations, rooms } = useLocalDb();

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            const list: UserData[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));

            // Urutkan berdasarkan role: SUPER_ADMIN > ADMIN > OPERATOR
            const roleOrder = { "SUPER_ADMIN": 1, "ADMIN": 2, "OPERATOR": 3 };
            const sortedList = list.sort((a, b) => {
                const orderA = roleOrder[a.role] || 4;
                const orderB = roleOrder[b.role] || 4;
                return orderA - orderB;
            });

            setUsers(sortedList);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching users:", err);
            setLoading(false);
        });

        // Listen to system settings (Trial Mode)
        const unsubSettings = onSnapshot(doc(db, "settings", "system-config"), (snap) => {
            if (snap.exists()) {
                setTrialMode(snap.data().trialModeEnabled);
            } else {
                setTrialMode(false);
                setDoc(doc(db, "settings", "system-config"), { trialModeEnabled: false });
            }
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
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        } catch (error) {
            alert("Gagal mengubah role");
        }
    };

    const toggleTrialMode = async () => {
        const newVal = !trialMode;
        try {
            await updateDoc(doc(db, "settings", "system-config"), {
                trialModeEnabled: newVal
            });
            setTrialMode(newVal);
        } catch (error) {
            alert("Gagal mengubah mode uji coba");
        }
    };

    const handleResetPassword = async (email: string) => {
        if (!confirm(`Kirim instruksi reset password ke email: ${email}?`)) return;

        try {
            const auth = getAuth();
            await sendPasswordResetEmail(auth, email);
            alert(`Link reset password telah dikirim ke ${email}. Silakan minta user memeriksa folder Inbox atau Spam mereka.`);
        } catch (error: any) {
            console.error("Error sending reset email:", error);
            alert("Gagal mengirim email reset: " + (error.message || "Terjadi kesalahan internal."));
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
                onRefresh={() => { }}
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

                            {/* Control Card for Trial Mode */}
                            <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6 group hover:shadow-md transition-all">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                                        trialMode ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-400"
                                    )}>
                                        <Lock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-extrabold text-gray-900 flex items-center gap-2">
                                            Mode Uji Coba (Login)
                                            <span className={clsx(
                                                "px-2 py-0.5 text-[8px] font-black uppercase rounded-lg border",
                                                trialMode ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-gray-50 text-gray-400 border-gray-200"
                                            )}>
                                                {trialMode ? "AKTIF" : "NONAKTIF"}
                                            </span>
                                        </h4>
                                        <p className="text-[11px] text-gray-400 font-medium">Jika ON, tombol login demo akan muncul di halaman depan.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={toggleTrialMode}
                                    className={clsx(
                                        "px-6 py-3 rounded-2xl text-[10px] font-black tracking-widest transition-all border shrink-0",
                                        trialMode
                                            ? "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100"
                                            : "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700"
                                    )}
                                >
                                    {trialMode ? "MATIKAN MODE UJI COBA" : "NYALAKAN MODE UJI COBA"}
                                </button>
                            </div>

                            <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Daftar Pengguna Sistem</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total: {users.length} Akun</p>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="bg-gray-50/30">
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Informasi Pengguna</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Peran (Role)</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">UID Reference</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider text-right">Manajemen</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {users.map((userData) => (
                                                <tr key={userData.id} className="hover:bg-gray-50 transition-colors group">
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center gap-4">
                                                            <div className={clsx(
                                                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                                                                userData.role === "SUPER_ADMIN" ? "bg-purple-600 text-white" :
                                                                    userData.role === "ADMIN" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                                            )}>
                                                                {userData.role === "SUPER_ADMIN" ? (
                                                                    <Shield className="w-5 h-5" />
                                                                ) : <User className="w-5 h-5" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-2">
                                                                    <p className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors text-xs">{userData.name}</p>
                                                                    {userData.role === "SUPER_ADMIN" && (
                                                                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[8px] font-black uppercase rounded-md tracking-widest border border-purple-200">Owner</span>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                                    <Mail className="w-3 h-3 text-gray-300" />
                                                                    <p className="text-[10px] text-gray-400 font-medium">{userData.email}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className={clsx(
                                                            "px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border w-fit uppercase",
                                                            userData.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                                userData.role === "ADMIN" ? "bg-indigo-50 text-indigo-600 border-indigo-100" :
                                                                    "bg-emerald-50 text-emerald-600 border-emerald-100"
                                                        )}>
                                                            {userData.role === "SUPER_ADMIN" ? "Super Admin" : userData.role}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <code className="text-[9px] text-gray-300 bg-gray-50/50 px-2 py-1 rounded-md font-mono border border-gray-100">
                                                            {userData.id.substring(0, 16).toUpperCase()}...
                                                        </code>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center justify-end gap-3">
                                                            {userData.role !== "SUPER_ADMIN" ? (
                                                                <>
                                                                    <div className="flex bg-gray-100/50 p-1 rounded-xl border border-gray-200">
                                                                        <button
                                                                            onClick={() => handleRoleChange(userData.id, "ADMIN")}
                                                                            className={clsx(
                                                                                "px-3 py-1.5 text-[9px] font-black tracking-widest rounded-lg transition-all",
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
                                                                                "px-3 py-1.5 text-[9px] font-black tracking-widest rounded-lg transition-all",
                                                                                userData.role === "OPERATOR"
                                                                                    ? "bg-white text-emerald-600 shadow-sm"
                                                                                    : "text-gray-400 hover:text-gray-600"
                                                                            )}
                                                                        >
                                                                            OPS
                                                                        </button>
                                                                    </div>
                                                                    <button
                                                                        onClick={() => handleResetPassword(userData.email)}
                                                                        className="p-2.5 text-gray-300 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all border border-transparent hover:border-amber-100"
                                                                        title="Reset Password"
                                                                    >
                                                                        <KeyRound className="w-4 h-4" />
                                                                    </button>

                                                                    <button
                                                                        className="p-2.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100"
                                                                        title="Hapus Akun"
                                                                        onClick={async () => {
                                                                            if (confirm(`Hapus data ${userData.name}? \n\nCatatan: Anda juga harus menghapus email ini secara MANUAL di Firebase Console.`)) {
                                                                                try {
                                                                                    await deleteDoc(doc(db, "users", userData.id));
                                                                                    alert("Data user berhasil dihapus dari database.");
                                                                                } catch (err) {
                                                                                    alert("Gagal menghapus data.");
                                                                                }
                                                                            }
                                                                        }}
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <div className="px-4 py-2 bg-gray-50 text-gray-400 text-[9px] font-black rounded-xl border border-gray-100 flex items-center gap-2 tracking-widest uppercase">
                                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                                                    Protected Account
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
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
                                                    <p className="font-bold text-gray-700">{report.operatorName}</p>
                                                    <p className="text-[9px] text-gray-400 mt-0.5">ID: {report.operatorId.substring(0, 8)}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded w-fit">{report.roomName}</span>
                                                        <span className="text-[9px] text-gray-500 mt-1 flex items-center gap-1">
                                                            <MapPin className="w-2.5 h-2.5" />
                                                            {report.locationName}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col gap-1.5">
                                                        <span className={clsx(
                                                            "text-[9px] font-black px-2 py-1 rounded-sm uppercase w-fit",
                                                            report.roomStatus === "READY_FOR_LIVE" ? "bg-emerald-100 text-emerald-700" :
                                                                report.roomStatus === "NOT_READY" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                                                        )}>
                                                            {report.roomStatus.replace(/_/g, " ")}
                                                        </span>
                                                        {report.items.filter((i: any) => i.status !== "BAIK").length > 0 && (
                                                            <div className="space-y-0.5">
                                                                <p className="text-[9px] text-rose-600 font-bold">
                                                                    ⚠️ {report.items.filter((i: any) => i.status !== "BAIK").length} Aset Masalah
                                                                </p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {report.items.filter((i: any) => i.status !== "BAIK").map((item: any, idx: number) => (
                                                                        <span key={idx} className="text-[7px] bg-rose-50 text-rose-500 px-1 rounded border border-rose-100">
                                                                            {item.assetName}: {item.status}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {report.overallNotes && (
                                                            <p className="text-[9px] text-gray-500 italic border-l-2 border-gray-200 pl-2 mt-1">
                                                                "{report.overallNotes}"
                                                            </p>
                                                        )}
                                                    </div>
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
                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Log Aktivitas Sistem</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Real-time Monitoring</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/30">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Timestamp</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Aktivitas</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Target</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-wider">Operator</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {assetLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors group text-[11px]">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-gray-500 font-bold">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {new Date(log.timestamp).toLocaleString('id-ID')}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={clsx(
                                                        "text-[9px] font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter",
                                                        log.type === "MOVEMENT" ? "bg-amber-100 text-amber-700" :
                                                            log.type === "STATUS" ? "bg-blue-100 text-blue-700" :
                                                                log.type === "AUTH" ? "bg-purple-100 text-purple-700" : "bg-emerald-100 text-emerald-700"
                                                    )}>
                                                        {log.type}
                                                    </span>
                                                    <p className="mt-1 font-bold text-gray-900 leading-tight">{log.toValue}</p>
                                                    {log.notes && <p className="text-[9px] text-gray-400 mt-0.5 italic">{log.notes}</p>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {log.assetId ? (
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                                                                <Tag className="w-3 h-3 text-gray-400" />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-gray-700 line-clamp-1 truncate block max-w-[150px]">
                                                                    {log.assetName || "Nama Aset"}
                                                                </span>
                                                                <span className="text-[8px] text-gray-400 font-mono">
                                                                    ID: {log.assetId?.substring(0, 8).toUpperCase()}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2 text-gray-400 italic">
                                                            <Shield className="w-3.5 h-3.5" />
                                                            Sistem / Akun
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2 text-indigo-600 font-extrabold">
                                                        <div className="w-6 h-6 bg-indigo-50 rounded-full flex items-center justify-center border border-indigo-100 uppercase text-[9px]">
                                                            {log.operatorName.charAt(0)}
                                                        </div>
                                                        {log.operatorName}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {assetLogs.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-gray-400 font-medium text-sm">Belum ada aktivitas yang tercatat.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
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
