"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck, UserPlus, X, Lock, Eye, EyeOff, History, Clock, Tag, MapPin, KeyRound, Building2, Plus, ArrowLeft, MoreVertical, LayoutGrid, ListChecks, Settings2, LayoutDashboard, Box, Search, Pencil, Cloud, Activity, Gauge, Zap, Info, AlertTriangle, Database } from "lucide-react";
import { useLocalDb } from "@/context/LocalDbContext";
import { onSnapshot, collection, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import clsx from "clsx";
import { initializeApp, getApps, deleteApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, setPersistence, inMemoryPersistence } from "firebase/auth";
import { UserRole } from "@/context/AuthContext";

// Komponen Modal Tambah User
function AddUserModal({ isOpen, onClose, onRefresh, companyId, companyName }: { isOpen: boolean; onClose: () => void; onRefresh: () => void; companyId?: string; companyName?: string }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<"SUPER_ADMIN" | "ADMIN" | "OPERATOR" | "CLIENT_ADMIN" | "CLIENT_OPERATOR">("OPERATOR");
    const [locationId, setLocationId] = useState("HQ");
    const [phone, setPhone] = useState("");
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

            // Validasi Kritis: Pastikan Perusahaan Terpilih
            if (role !== "SUPER_ADMIN" && !companyId) {
                setError("Pilih perusahaan terlebih dahulu melalui menu Kelola Perusahaan sebelum menambah Admin/Operator.");
                setLoading(false);
                return;
            }

            await setDoc(doc(db, "users", newUser.uid), {
                name,
                email,
                role,
                companyId: companyId || "",
                companyName: companyName || "",
                locationId,
                locationName: selectedLocation ? selectedLocation.name : (locationId === "HQ" ? "Kantor Pusat (HQ)" : "-"),
                phone,
                uid: newUser.uid,
                createdAt: new Date().toISOString()
            });

            await signOut(secondaryAuth);
            await deleteApp(secondaryApp);

            setEmail("");
            setPassword("");
            setName("");
            setPhone("");
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
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-purple/10/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                            <UserPlus className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 tracking-tight">Tambah Pengguna</h3>
                            <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Akses Baru</p>
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                                placeholder="email@perusahaan.id"
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                                placeholder="0812xxxx"
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
                                    className="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
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
                                {[
                                    { id: "ADMIN", label: "ADMIN", color: "indigo" },
                                    { id: "OPERATOR", label: "OPERATOR", color: "emerald" },
                                    { id: "CLIENT_ADMIN", label: "CLIENT ADMIN", color: "amber" },
                                    { id: "CLIENT_OPERATOR", label: "CLIENT OP", color: "rose" }
                                ].map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRole(r.id as any)}
                                        className={clsx(
                                            "py-3 rounded-2xl text-[10px] font-black tracking-widest border transition-all",
                                            role === r.id
                                                ? `bg-${r.color === 'indigo' ? 'brand-purple' : r.color === 'emerald' ? 'brand-teal' : r.color === 'amber' ? 'brand-orange' : 'rose-500'} border-transparent text-white shadow-lg`
                                                : "bg-gray-50 border-gray-100 text-gray-400"
                                        )}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Penempatan Cabang</label>
                            <select
                                required
                                value={locationId}
                                onChange={(e) => setLocationId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
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
    role: "ADMIN" | "OPERATOR" | "SUPER_ADMIN" | "CLIENT_ADMIN" | "CLIENT_OPERATOR";
    name: string;
    companyId?: string;
    companyName?: string;
    locationName?: string;
    locationId?: string;
    phone?: string;
}

// Komponen Modal Edit User
function EditUserModal({ isOpen, onClose, onRefresh, user }: { isOpen: boolean; onClose: () => void; onRefresh: () => void; user: UserData | null }) {
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");
    const [role, setRole] = useState<UserRole>("OPERATOR");
    const [locationId, setLocationId] = useState("HQ");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { locations } = useLocalDb();

    useEffect(() => {
        if (user) {
            setName(user.name || "");
            setPhone(user.phone || "");
            setRole(user.role as UserRole);
            setLocationId(user.locationId || "HQ");
        }
    }, [user]);

    if (!isOpen || !user) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const selectedLoc = locations.find(l => l.id === locationId);
            const locationName = selectedLoc ? selectedLoc.name : (locationId === "HQ" ? "Kantor Pusat (HQ)" : "-");

            await updateDoc(doc(db, "users", user.id), {
                name,
                phone,
                role,
                locationId,
                locationName,
                updatedAt: new Date().toISOString()
            });

            alert("Data user diperbarui!");
            onClose();
            onRefresh();
        } catch (err: any) {
            setError(`Gagal memperbarui: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-purple/10/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-orange rounded-xl flex items-center justify-center text-white">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 leading-none">Edit Profil User</h3>
                            <p className="text-[10px] text-brand-orange font-bold uppercase tracking-widest mt-1">ID: {user.id.slice(0, 8)}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-xs font-bold">{error}</div>}

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Lengkap</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Hak Akses (Role)</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: "ADMIN", label: "ADMIN", color: "indigo" },
                                { id: "OPERATOR", label: "OPERATOR", color: "emerald" },
                                { id: "CLIENT_ADMIN", label: "CLIENT ADMIN", color: "amber" },
                                { id: "CLIENT_OPERATOR", label: "CLIENT OP", color: "rose" }
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => setRole(r.id as any)}
                                    className={clsx(
                                        "py-2.5 rounded-xl text-[9px] font-black tracking-widest border transition-all",
                                        role === r.id
                                            ? `bg-${r.color === 'indigo' ? 'brand-purple' : r.color === 'emerald' ? 'brand-teal' : r.color === 'amber' ? 'brand-orange' : 'rose-500'} border-transparent text-white shadow-lg`
                                            : "bg-gray-50 border-gray-100 text-gray-400"
                                    )}
                                >
                                    {r.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Penempatan Cabang</label>
                        <select
                            required
                            value={locationId}
                            onChange={(e) => setLocationId(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple appearance-none font-bold"
                        >
                            <option value="HQ">Kantor Pusat (HQ)</option>
                            {locations.map(loc => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full mt-4 py-4 bg-brand-orange hover:bg-brand-orange text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-brand-orange/10"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PERUBAHAN"}
                    </button>
                </form>
            </div>
        </div>
    );
}

function AddCompanyModal({ isOpen, onClose, onAdd }: { isOpen: boolean; onClose: () => void; onAdd: (data: any) => void }) {
    const [name, setName] = useState("");
    const [desc, setDesc] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onAdd({ name, description: desc, phone, email });
            onClose();
            setName("");
            setDesc("");
            setPhone("");
            setEmail("");
        } catch (err: any) {
            console.error("DEBUG FIREBASE:", err);
            alert("Gagal membuat perusahaan. Pastikan koneksi internet stabil dan Firestore Rules mengizinkan akses ke koleksi 'companies'.\n\nError: " + err.message);
        } finally {
            setLoading(false); // Ensure loading is set to false even on error
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-brand-purple/10/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 tracking-tight">Daftarkan Perusahaan</h3>
                            <p className="text-[10px] text-brand-purple font-black uppercase tracking-widest">Klien Baru</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nama Perusahaan</label>
                        <input
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                            placeholder="Contoh: PT. Studio Kreatif Jaya"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomer Telepon</label>
                            <input
                                required
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                                placeholder="0812xxxx"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email (Opsional)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple"
                                placeholder="kantor@pt.id"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Deskripsi Singkat</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple min-h-[80px]"
                            placeholder="Keterangan perusahaan..."
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-4 bg-gray-900 hover:bg-black text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buat Perusahaan"}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default function UserManagementPage() {
    const [view, setView] = useState<"companies" | "management">("companies");
    const [selectedCompany, setSelectedCompany] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<"users" | "logs" | "settings" | "dashboard" | "cloud">("dashboard");
    const [users, setUsers] = useState<UserData[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [loginTitle, setLoginTitle] = useState("Welcome Back!");
    const [loginDesc, setLoginDesc] = useState("Hubungkan kembali koneksi Anda untuk mengelola aset dengan cerdas.");
    const [savingSettings, setSavingSettings] = useState(false);
    const [cloudStats, setCloudStats] = useState({ users: 0, companies: 0, assets: 0, logs: 0 });
    const [statsLoading, setStatsLoading] = useState(false);
    const [usageMetrics, setUsageMetrics] = useState({ dailyWrites: 0, monthlyActiveUsers: 0, dailyReadsEstimate: 0 });

    const { assetLogs, checklists: contextChecklists, locations, companies, addCompany, deleteCompany, rooms, assets } = useLocalDb();

    useEffect(() => {
        // Only load users if we are in management view for a specific company
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            let list: UserData[] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));

            // If a company is selected, filter by it
            if (selectedCompany) {
                list = list.filter(u => u.companyId === selectedCompany.id);
            }

            const roleOrder = { "SUPER_ADMIN": 1, "ADMIN": 2, "OPERATOR": 3, "CLIENT_ADMIN": 4, "CLIENT_OPERATOR": 5 };
            const sortedList = list.sort((a, b) => (roleOrder[a.role] || 4) - (roleOrder[b.role] || 4));
            setUsers(sortedList);
            setLoading(false);
        }, (err) => {
            console.warn("User listener error:", err);
            setLoading(false);
        });

        return () => {
            unsub();
        };
    }, [selectedCompany?.id]);

    useEffect(() => {
        // Load Global Login Config
        const unsub = onSnapshot(doc(db, "settings", "login-config"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLoginTitle(data.welcomeTitle || "Welcome Back!");
                setLoginDesc(data.welcomeDescription || "Hubungkan kembali koneksi Anda untuk mengelola aset dengan cerdas.");
            }
        }, (err) => {
            console.error("SETTINGS SNAPSHOT ERROR:", err);
            if (err.message.includes("permission-denied")) {
                alert("Peringatan: Akses ke koleksi 'settings' ditolak oleh Firebase Rules. Pastikan Anda sudah mengatur rules untuk koleksi 'settings'.");
            }
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        setChecklists(contextChecklists);
    }, [contextChecklists]);

    useEffect(() => {
        // Global Cloud Health Listener (when no specific company selected)
        if (!selectedCompany) {
            setStatsLoading(true);
            const unsubs = [
                onSnapshot(collection(db, "users"), snap => setCloudStats(prev => ({ ...prev, users: snap.size }))),
                onSnapshot(collection(db, "companies"), snap => setCloudStats(prev => ({ ...prev, companies: snap.size }))),
                onSnapshot(collection(db, "assets"), snap => setCloudStats(prev => ({ ...prev, assets: snap.size }))),
                onSnapshot(collection(db, "assetLogs"), snap => {
                    setCloudStats(prev => ({ ...prev, logs: snap.size }));

                    // Calculate Usage Analytics
                    const now = new Date();
                    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

                    const allLogs = snap.docs.map(doc => doc.data());
                    const todayLogs = allLogs.filter(log => log.timestamp && new Date(log.timestamp).getTime() >= startOfToday);
                    const monthLogs = allLogs.filter(log => log.timestamp && new Date(log.timestamp).getTime() >= startOfMonth);

                    // Unique users this month (MAU Estimate)
                    const uniqueUsersThisMonth = new Set(monthLogs.map(log => log.operatorName)).size;

                    setUsageMetrics({
                        dailyWrites: todayLogs.length,
                        monthlyActiveUsers: uniqueUsersThisMonth,
                        dailyReadsEstimate: todayLogs.length * 5 // Rough estimate: each write usually triggers several reads for lists/syncs
                    });

                    setStatsLoading(false);
                })
            ];
            return () => unsubs.forEach(unsub => unsub());
        }
    }, [selectedCompany?.id]);

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


    const handleResetPassword = async (email: string) => {
        if (!confirm(`Kirim reset password ke ${email}?`)) return;
        try {
            await sendPasswordResetEmail(getAuth(), email);
            alert("Email reset terkirim!");
        } catch (error) {
            alert("Gagal mengirim reset password");
        }
    };

    const handleSaveLoginConfig = async () => {
        setSavingSettings(true);
        try {
            await setDoc(doc(db, "settings", "login-config"), {
                welcomeTitle: loginTitle,
                welcomeDescription: loginDesc,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert("Konfigurasi Login berhasil diperbarui!");
        } catch (err: any) {
            console.error("SAVE ERROR:", err);
            alert(`Gagal menyimpan konfigurasi: ${err.message || 'Error tidak diketahui'}`);
        } finally {
            setSavingSettings(false);
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

    // --- VIEW: DAFTAR PERUSAHAAN ---
    if (view === "companies") {
        const filteredCompanies = companies.filter(c =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.id.toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
                <AddCompanyModal
                    isOpen={isAddCompanyOpen}
                    onClose={() => setIsAddCompanyOpen(false)}
                    onAdd={(data) => addCompany(data)}
                />

                <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                            <Shield className="w-6 h-6 text-brand-purple" /> Super Admin Portal
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Global management and company orchestration.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/search:text-brand-purple transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari klien..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs outline-none focus:border-brand-purple focus:ring-4 focus:ring-brand-purple/10 transition-all w-40 sm:w-64"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setView("management");
                                setActiveTab("cloud");
                                setSelectedCompany(null);
                            }}
                            className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2 whitespace-nowrap uppercase tracking-widest"
                        >
                            <Settings2 className="w-4 h-4" /> SYSTEM
                        </button>
                        <button
                            onClick={() => setIsAddCompanyOpen(true)}
                            className="bg-brand-purple text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-brand-purple transition-all flex items-center gap-2 shadow-lg shadow-brand-purple/20 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> TAMBAH KLIEN
                        </button>
                    </div>
                </header>

                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                    {companies.length === 0 ? (
                        <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                            <Building2 className="w-12 h-12 mb-4 opacity-20" />
                            <p className="font-bold">Belum ada perusahaan terdaftar</p>
                            <p className="text-xs">Klik Tambah Klien untuk memulai.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 border-b border-gray-100">
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] w-12 text-center">No</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Perusahaan</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Kontak</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Umur</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Tgl Daftar</th>
                                        <th className="px-6 py-4 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] text-center">Akses</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredCompanies.map((company, index) => {
                                        // Hitung umur perusahaan
                                        const start = new Date(company.createdAt);
                                        const now = new Date();
                                        const diffTime = Math.abs(now.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                                        let ageStr = `${diffDays} hari`;
                                        if (diffDays > 365) {
                                            const years = Math.floor(diffDays / 365);
                                            const months = Math.floor((diffDays % 365) / 30);
                                            ageStr = `${years} thn ${months} bln`;
                                        } else if (diffDays > 30) {
                                            const months = Math.floor(diffDays / 30);
                                            const days = diffDays % 30;
                                            ageStr = `${months} bln ${days} hari`;
                                        }

                                        return (
                                            <tr
                                                key={company.id}
                                                onClick={() => {
                                                    setSelectedCompany(company);
                                                    setView("management");
                                                    setActiveTab("dashboard");
                                                }}
                                                className="hover:bg-brand-purple/10/30 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 text-[10px] font-bold text-gray-400 text-center">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-brand-purple/10 rounded-lg flex items-center justify-center text-brand-purple group-hover:bg-brand-purple group-hover:text-white transition-all">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-brand-purple transition-colors">
                                                                {company.name}
                                                            </p>
                                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">
                                                                ID: {company.id.slice(0, 8)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="space-y-1">
                                                        {company.phone && (
                                                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold uppercase">
                                                                <Tag className="w-2.5 h-2.5 text-brand-purple/50" /> {company.phone}
                                                            </div>
                                                        )}
                                                        {company.email && (
                                                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold lowercase">
                                                                <Mail className="w-2.5 h-2.5 text-brand-purple/50" /> {company.email}
                                                            </div>
                                                        )}
                                                        {!company.phone && !company.email && (
                                                            <span className="text-[9px] text-gray-300 italic">No contact</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-brand-purple uppercase tracking-tighter">{ageStr}</span>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Berlangganan</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-bold text-gray-600">
                                                        {new Date(company.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1 text-[9px] font-black text-brand-purple uppercase tracking-widest border border-brand-purple/20 bg-brand-purple/10/50 px-3 py-1.5 rounded-full group-hover:bg-brand-purple group-hover:text-white transition-all">
                                                        Kelola
                                                        <ArrowLeft className="w-2.5 h-2.5 rotate-180" />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // --- VIEW: MANAGEMENT PERUSAHAAN (DRILL-DOWN) ---
    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <AddUserModal
                isOpen={isAddUserOpen}
                onClose={() => setIsAddUserOpen(false)}
                onRefresh={() => { }}
                companyId={selectedCompany?.id}
                companyName={selectedCompany?.name}
            />

            <header className="mb-8 space-y-4">
                <button
                    onClick={() => {
                        setView("companies");
                        setSelectedCompany(null);
                    }}
                    className="flex items-center gap-2 text-[10px] font-black text-brand-purple uppercase tracking-widest hover:gap-3 transition-all"
                >
                    <ArrowLeft className="w-3 h-3" /> Kembali ke Portal
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-brand-purple/20 rounded-2xl flex items-center justify-center text-brand-purple">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 uppercase tracking-tight">
                                {selectedCompany?.name || "Global System"}
                            </h2>
                            <p className="text-xs text-gray-500 mt-1">{selectedCompany ? "Pengelolaan data internal perusahaan." : "Konfigurasi sistem pusat."}</p>
                        </div>
                    </div>

                    <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-inner">
                        {[
                            { id: "dashboard", name: "Monitor Dashboard", icon: LayoutDashboard, show: !!selectedCompany },
                            { id: "users", name: "Tim & Akses", icon: Users, show: !!selectedCompany },
                            { id: "logs", name: "Audit Log", icon: History, show: !!selectedCompany },
                            { id: "cloud", name: "Cloud Health", icon: Cloud, show: !selectedCompany },
                            { id: "settings", name: "System", icon: Settings2, show: true }
                        ].filter(t => t.show).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase flex items-center gap-2 tracking-widest",
                                    activeTab === tab.id ? "bg-white text-brand-purple shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">{tab.name}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </header>

            <div className="space-y-6">
                {activeTab === "dashboard" && selectedCompany && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Metrics for Company */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Total Unit Studio",
                                    value: rooms.filter(r => r.companyId === selectedCompany.id).length,
                                    icon: Building2,
                                    color: "bg-brand-purple/10 text-brand-purple"
                                },
                                {
                                    label: "Total Inventaris",
                                    value: assets.filter(a => a.companyId === selectedCompany.id).length,
                                    icon: Box,
                                    color: "bg-purple-50 text-brand-purple"
                                },
                                {
                                    label: "Aktivitas Terkini",
                                    value: assetLogs.filter(l => l.companyId === selectedCompany.id).length,
                                    icon: History,
                                    color: "bg-blue-50 text-brand-teal"
                                },
                                {
                                    label: "Tim Terdaftar",
                                    value: users.length, // already filtered by company in effect
                                    icon: Users,
                                    color: "bg-emerald-50 text-brand-teal"
                                }
                            ].map((m, i) => (
                                <div key={i} className="bg-white border border-gray-100 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                                    <div className={clsx("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", m.color)}>
                                        <m.icon className="w-5 h-5" />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{m.label}</p>
                                    <h4 className="text-2xl font-black text-gray-900">{m.value}</h4>
                                </div>
                            ))}
                        </div>

                        {/* Visual Breakdown */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Distribusi Aset Klien</h3>
                                <div className="space-y-4">
                                    {[
                                        { label: "Kondisi Baik", color: "bg-brand-teal", key: "BAIK" },
                                        { label: "Dalam Perbaikan", color: "bg-brand-orange", key: "RUSAK" },
                                        { label: "Rusak Total", color: "bg-rose-500", key: "MATI" }
                                    ].map((cat, i) => {
                                        const companyAssets = assets.filter(a => a.companyId === selectedCompany.id);
                                        const count = companyAssets.filter(a => a.status === cat.key).length;
                                        const percent = companyAssets.length > 0 ? (count / companyAssets.length) * 100 : 0;
                                        return (
                                            <div key={i} className="space-y-2">
                                                <div className="flex items-center justify-between text-[10px] font-bold">
                                                    <span className="text-gray-500">{cat.label}</span>
                                                    <span className="text-gray-900">{count} Unit</span>
                                                </div>
                                                <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                                    <div className={clsx("h-full", cat.color)} style={{ width: `${percent}%` }}></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-brand-purple rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-black mb-4">Integrasi Multi-Tenant</h3>
                                    <p className="text-xs text-brand-purple/20 leading-relaxed opacity-80 mb-6">
                                        Data perusahaan ini diisolasi secara digital. Admin dan Operator yang terdaftar hanya dapat mengakses inventaris di atas. Seluruh perubahan tercatat dalam sistem audit log perusahaan ini.
                                    </p>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Secure Encryption Active
                                    </div>
                                </div>
                                <LayoutDashboard className="absolute -bottom-4 -right-4 w-32 h-32 text-white/5" />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "users" && (
                    <>
                        <div className="bg-brand-purple rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                    <UserPlus className="w-6 h-6 text-brand-purple/40" /> Akses Karyawan
                                </h3>
                                <p className="text-sm text-brand-purple/20/80">Kelola Admin dan Operator untuk {selectedCompany?.name || 'perusahaan terpilih'}.</p>
                            </div>
                            <button onClick={() => setIsAddUserOpen(true)} className="bg-white text-brand-purple px-8 py-4 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl">
                                + TAMBAH USER
                            </button>
                        </div>

                        <EditUserModal
                            isOpen={isEditUserOpen}
                            onClose={() => {
                                setIsEditUserOpen(false);
                                setSelectedUser(null);
                            }}
                            onRefresh={() => { }}
                            user={selectedUser}
                        />

                        <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-50">
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Informasi User</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / Role</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Cabang</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {users.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-20 text-center text-gray-400 text-xs italic">Belum ada user di perusahaan ini.</td>
                                            </tr>
                                        ) : (
                                            users.map((u) => (
                                                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                                                                <User className="w-5 h-5" />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900 text-sm leading-tight">{u.name}</p>
                                                                <div className="flex flex-col mt-0.5">
                                                                    <span className="text-[10px] text-gray-400 font-medium">{u.email}</span>
                                                                    {u.phone && (
                                                                        <span className="text-[10px] text-brand-purple font-bold flex items-center gap-1">
                                                                            <Tag className="w-2.5 h-2.5" /> {u.phone}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={clsx(
                                                            "px-3 py-1 rounded-lg text-[10px] font-black uppercase border tracking-tighter",
                                                            u.role === "SUPER_ADMIN" ? "bg-purple-50 text-brand-purple border-purple-100" :
                                                                u.role === "ADMIN" ? "bg-brand-purple/10 text-brand-purple border-brand-purple/20" : "bg-emerald-50 text-brand-teal border-emerald-100"
                                                        )}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {u.role === "SUPER_ADMIN" ? (
                                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest opacity-50">Pusat</span>
                                                        ) : (
                                                            <select
                                                                value={u.locationId || ""}
                                                                onChange={(e) => handleLocationChange(u.id, e.target.value)}
                                                                className="bg-transparent text-[10px] font-bold text-gray-600 outline-none focus:text-brand-purple cursor-pointer border-b border-dashed border-gray-200 pb-0.5"
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
                                                                <button
                                                                    onClick={() => {
                                                                        setSelectedUser(u);
                                                                        setIsEditUserOpen(true);
                                                                    }}
                                                                    className="p-2.5 text-gray-400 hover:text-brand-purple hover:bg-brand-purple/10 rounded-xl transition-all"
                                                                    title="Edit Profil"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleResetPassword(u.email)} className="p-2.5 text-gray-400 hover:text-brand-orange hover:bg-amber-50 rounded-xl transition-all" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
                                                                <button onClick={async () => {
                                                                    if (confirm("Hapus user?")) await deleteDoc(doc(db, "users", u.id));
                                                                }} className="p-2.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Hapus Akun"><Trash2 className="w-4 h-4" /></button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "logs" && (
                    <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-gray-50 bg-gray-50 flex items-center justify-between">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <History className="w-3.5 h-3.5" /> Aktivitas {selectedCompany?.name || 'Sistem'}
                            </h3>
                        </div>
                        <div className="overflow-x-auto max-h-[600px] custom-scrollbar">
                            <table className="w-full text-left">
                                <thead className="bg-white sticky top-0 z-10 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[9px] uppercase font-black text-gray-300 tracking-widest">Log Time</th>
                                        <th className="px-6 py-4 text-[9px] uppercase font-black text-gray-300 tracking-widest">Event</th>
                                        <th className="px-6 py-4 text-[9px] uppercase font-black text-gray-300 tracking-widest">Operator</th>
                                        <th className="px-6 py-4 text-[9px] uppercase font-black text-gray-300 tracking-widest">Notes</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {[
                                        ...assetLogs.map(l => ({ ...l, unifiedType: 'LOG' })),
                                        ...contextChecklists.map(c => ({
                                            id: c.id,
                                            companyId: c.companyId,
                                            timestamp: c.timestamp,
                                            type: 'ROOM',
                                            assetName: c.roomName,
                                            toValue: c.roomStatus || 'SELESAI',
                                            operatorName: c.operatorName,
                                            operatorRole: 'OPERATOR',
                                            notes: c.overallNotes,
                                            unifiedType: 'LOG'
                                        }))
                                    ]
                                        .filter(log => log.companyId === selectedCompany?.id)
                                        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                                        .map((log: any) => (
                                            <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-900">{new Date(log.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                                        <span className="text-[9px] text-gray-400">{new Date(log.timestamp).toLocaleDateString('id-ID')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <span className={clsx(
                                                            "text-[9px] font-black uppercase px-1.5 py-0.5 rounded border leading-none shrink-0",
                                                            log.type === "MOVEMENT" ? "text-brand-teal border-blue-100 bg-blue-50" :
                                                                log.type === "STATUS" ? "text-brand-orange border-amber-100 bg-amber-50" :
                                                                    log.type === "AUTH" ? "text-brand-purple border-purple-100 bg-purple-50" :
                                                                        log.type === "ROOM" ? "text-brand-teal border-emerald-100 bg-emerald-50" : "text-gray-400 border-gray-100 bg-gray-50"
                                                        )}>
                                                            {log.type}
                                                        </span>
                                                        <div className="text-[11px] font-bold text-gray-700 truncate max-w-[200px]">
                                                            {log.assetName || "SYSTEM"}: <span className="text-gray-400 font-normal">{log.toValue?.replace(/_/g, " ")}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase">{log.operatorName}</span>
                                                        <span className="text-[8px] font-black text-gray-300 uppercase tracking-tighter">{log.operatorRole}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <p className="text-[10px] text-gray-400 italic truncate max-w-[200px]" title={log.notes}>
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

                {activeTab === "cloud" && !selectedCompany && (
                    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                        {/* Summary Header */}
                        <div className="bg-brand-purple rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl border border-white/5">
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                                <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-blue/20 rounded-full border border-brand-blue/30 text-[9px] font-black uppercase tracking-[0.2em] text-blue-300 mb-6">
                                        <Activity className="w-3 h-3 animate-pulse" /> Global System Infrastructure
                                    </div>
                                    <h3 className="text-4xl font-black mb-4 tracking-tighter leading-none">Cloud Resource <br /><span className="text-brand-blue">Inventory Monitoring</span></h3>
                                    <p className="text-sm text-brand-purple/30/70 leading-relaxed max-w-md">
                                        Memantau konsumsi database secara real-time. Firebase Spark Plan memiliki batas limit, pastikan data seperti log tetap terjaga.
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                                        <p className="text-[10px] font-black text-brand-purple/40 uppercase tracking-widest mb-1">Total Users</p>
                                        <p className="text-3xl font-black">{cloudStats.users}</p>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                                        <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1">Total Klien</p>
                                        <p className="text-3xl font-black">{cloudStats.companies}</p>
                                    </div>
                                    <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 lg:col-span-2">
                                        <div className="flex items-center justify-between mb-2">
                                            <p className="text-[10px] font-black text-amber-300 uppercase tracking-widest leading-none">Aset & Logs Terdata</p>
                                            <span className="text-[9px] font-bold text-gray-400">{cloudStats.assets + cloudStats.logs} Docs</span>
                                        </div>
                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full bg-gradient-to-r from-brand-blue to-brand-purple" style={{ width: `${Math.min(((cloudStats.assets + cloudStats.logs) / 50000) * 100, 100)}%` }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <Cloud className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 pointer-events-none" />
                        </div>

                        {/* Quota Banners */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Read Quota Card */}
                            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform">
                                    <Gauge className="w-16 h-16 text-brand-purple" />
                                </div>
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Zap className="w-3 h-3 text-brand-orange" /> Read Threshold
                                </h4>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-black text-gray-900">50,000</span>
                                    <span className="text-xs font-bold text-gray-400">/ Day</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Batas pembacaan dokumen harian versi Gratis. Disarankan optimasi snapshot listener.
                                </p>
                            </div>

                            {/* Storage Warning Card */}
                            <div className={clsx(
                                "border rounded-3xl p-8 shadow-sm relative group transition-all",
                                cloudStats.logs > 10000
                                    ? "bg-rose-50 border-rose-100 animate-pulse"
                                    : "bg-white border-gray-100"
                            )}>
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className={clsx(
                                        "text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2",
                                        cloudStats.logs > 10000 ? "text-rose-600" : "text-gray-400"
                                    )}>
                                        <ShieldAlert className="w-3 h-3" /> System Logs Safety
                                    </h4>
                                    {cloudStats.logs > 10000 && (
                                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[8px] font-black rounded-full animate-bounce">WARNING</span>
                                    )}
                                </div>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className={clsx("text-3xl font-black", cloudStats.logs > 10000 ? "text-rose-700" : "text-gray-900")}>
                                        {cloudStats.logs.toLocaleString()}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400">Entries</span>
                                </div>
                                <p className={clsx("text-[11px] leading-relaxed", cloudStats.logs > 10000 ? "text-rose-600 font-medium" : "text-gray-500")}>
                                    {cloudStats.logs > 10000
                                        ? "⚠️ Jumlah log melebihi batas aman (10k). Disarankan segera lakukan pembersihan log lama agar performa tidak menurun."
                                        : "Status Log saat ini dalam kondisi optimal dan di bawah ambang batas pembersihan."
                                    }
                                </p>
                            </div>

                            {/* Database Size Card */}
                            <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <Box className="w-3 h-3 text-brand-purple" /> Database Cap
                                </h4>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-3xl font-black text-gray-900">1.0</span>
                                    <span className="text-xs font-bold text-gray-400">GB</span>
                                </div>
                                <p className="text-[11px] text-gray-500 leading-relaxed">
                                    Total kapasitas penyimpanan Spark Plan. Includes all metadata and indices.
                                </p>
                            </div>
                        </div>

                        {/* Action Banner */}
                        {cloudStats.logs > 10000 && (
                            <div className="bg-white border-2 border-dashed border-rose-200 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-rose-100/50">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
                                        <AlertTriangle className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h5 className="text-lg font-black text-gray-900 leading-none mb-2">Optimization Required</h5>
                                        <p className="text-xs text-gray-500 max-w-xl leading-relaxed">
                                            Aplikasi mendeteksi bahwa koleksi <span className="font-bold text-gray-900">assetLogs</span> sudah mulai membengkak. Pada Firebase Free Tier, disarankan untuk melakukan "Log Trimming" (hapus log &gt; 30 hari) untuk menghindari biaya tak terduga jika berpindah plan atau lambatnya query audit.
                                        </p>
                                    </div>
                                </div>
                                <a
                                    href={`https://console.firebase.google.com/project/${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}/firestore/usage`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-8 py-4 bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-rose-200"
                                >
                                    Buka Firebase Console
                                </a>
                            </div>
                        )}

                        {!statsLoading && cloudStats.logs <= 10000 && (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-[2.5rem] p-8 flex items-center gap-6">
                                <div className="w-12 h-12 bg-brand-teal rounded-2xl flex items-center justify-center text-white shrink-0">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-black text-emerald-900 uppercase tracking-widest leading-none mb-1">System is healthy</h5>
                                    <p className="text-[10px] text-brand-teal font-medium">Resources are being used efficiently within the Free Tier limits.</p>
                                </div>
                            </div>
                        )}

                        {/* Quota Reference Firebase */}
                        <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="w-10 h-10 bg-brand-purple rounded-xl flex items-center justify-center text-white">
                                    <Info className="w-5 h-5" />
                                </div>
                                <div>
                                    <h5 className="text-sm font-black text-gray-900 uppercase tracking-widest leading-none mb-1">Cloud Quota Reference</h5>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Panduan Batas Penggunaan Firebase Spark & Vercel Hobby Plan</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-8">
                                {/* Firestore Details */}
                                <div className="space-y-4">
                                    <h6 className="text-[10px] font-black text-brand-purple uppercase tracking-widest flex items-center gap-2">
                                        <Database className="w-3 h-3" /> Firestore DB
                                    </h6>
                                    <div className="space-y-4">
                                        {[
                                            { label: "Reads", val: usageMetrics.dailyReadsEstimate, limit: 50000, type: "Daily" },
                                            { label: "Writes", val: usageMetrics.dailyWrites, limit: 20000, type: "Daily" }
                                        ].map((item, i) => {
                                            const percent = (item.val / item.limit) * 100;
                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                                        <span className="text-gray-400">{item.label}</span>
                                                        <span className="text-gray-900">{item.val.toLocaleString()} / {item.limit / 1000}k</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx(
                                                                "h-full transition-all duration-500",
                                                                percent >= 80 ? "bg-brand-orange" : percent >= 95 ? "bg-rose-600" : "bg-brand-purple"
                                                            )}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Resets: Midnight</p>
                                                </div>
                                            );
                                        })}
                                        <div className="pt-2 border-t border-gray-50">
                                            <div className="flex items-center justify-between text-[9px] mb-1">
                                                <span className="text-gray-400 font-bold">DELETES</span>
                                                <span className="text-gray-900 font-bold">20k / day</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px]">
                                                <span className="text-gray-400 font-bold">STORAGE</span>
                                                <span className="text-gray-900 font-bold">1 GB</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Auth Details */}
                                <div className="space-y-4">
                                    <h6 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Authentication
                                    </h6>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between text-[10px] font-bold">
                                                <span className="text-gray-400">Monthly Active (MAU)</span>
                                                <span className="text-gray-900">{usageMetrics.monthlyActiveUsers} / 50k</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                                <div
                                                    className={clsx(
                                                        "h-full transition-all duration-500",
                                                        (usageMetrics.monthlyActiveUsers / 50000) * 100 >= 80 ? "bg-brand-orange" : "bg-brand-teal"
                                                    )}
                                                    style={{ width: `${Math.min((usageMetrics.monthlyActiveUsers / 50000) * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                            <p className="text-[8px] text-gray-400 font-bold uppercase tracking-tighter">Resets: 1st of Month</p>
                                        </div>
                                        <div className="pt-2 border-t border-gray-50 space-y-2">
                                            <div className="flex items-center justify-between text-[9px]">
                                                <span className="text-gray-400 font-bold">PHONE AUTH</span>
                                                <span className="text-gray-900 font-bold">10k / Mo</span>
                                            </div>
                                            <div className="flex items-center justify-between text-[9px]">
                                                <span className="text-gray-400 font-bold">PASSWORD</span>
                                                <span className="text-gray-900 font-bold">Unlimited</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Storage Details */}
                                <div className="space-y-4">
                                    <h6 className="text-[10px] font-black text-brand-teal uppercase tracking-widest flex items-center gap-2">
                                        <Cloud className="w-3 h-3" /> Cloud Storage
                                    </h6>
                                    <div className="space-y-2">
                                        {[
                                            { label: "Total Storage", val: "5 GB" },
                                            { label: "Download", val: "1 GB / day" },
                                            { label: "Upload Opt", val: "20k / day" },
                                            { label: "Download Opt", val: "50k / day" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-1.5">
                                                <span className="text-gray-400 font-medium">{item.label}</span>
                                                <span className="text-gray-900 font-bold">{item.val}</span>
                                            </div>
                                        ))}
                                        <p className="text-[8px] text-gray-300 italic mt-2">*Usage based on file uploads</p>
                                    </div>
                                </div>

                                {/* Hosting Details */}
                                <div className="space-y-4">
                                    <h6 className="text-[10px] font-black text-brand-orange uppercase tracking-widest flex items-center gap-2">
                                        <LayoutGrid className="w-3 h-3" /> Hosting
                                    </h6>
                                    <div className="space-y-2">
                                        {[
                                            { label: "Storage", val: "10 GB" },
                                            { label: "Data Transfer", val: "360 MB / day" },
                                            { label: "Custom Domain", val: "Free SSL" },
                                            { label: "Preview URLs", val: "Disabled" }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between text-[11px] border-b border-gray-50 pb-1.5">
                                                <span className="text-gray-400 font-medium">{item.label}</span>
                                                <span className="text-gray-900 font-bold">{item.val}</span>
                                            </div>
                                        ))}
                                        <p className="text-[8px] text-gray-300 italic mt-2">*Updated daily by Firebase</p>
                                    </div>
                                </div>

                                {/* Vercel Hobby Plan */}
                                <div className="space-y-4">
                                    <h6 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                        <Zap className="w-3 h-3" /> Vercel Hobby
                                    </h6>
                                    <div className="space-y-4">
                                        {[
                                            { 
                                                label: "Bandwidth", 
                                                val: (usageMetrics.monthlyActiveUsers * 0.05).toFixed(2), 
                                                limit: 100, 
                                                unit: "GB", 
                                                reset: "Monthly" 
                                            },
                                            { 
                                                label: "Function Inv.", 
                                                val: usageMetrics.dailyWrites * 5, 
                                                limit: 100000, 
                                                unit: "Inv", 
                                                reset: "Monthly" 
                                            },
                                            { 
                                                label: "Execution", 
                                                val: (usageMetrics.dailyWrites * 0.001).toFixed(3), 
                                                limit: 100, 
                                                unit: "Hrs", 
                                                reset: "Monthly" 
                                            },
                                            { 
                                                label: "Image Opt.", 
                                                val: cloudStats.assets, 
                                                limit: 1000, 
                                                unit: "Doc", 
                                                reset: "Monthly" 
                                            }
                                        ].map((item, i) => {
                                            const valNum = Number(item.val);
                                            const percent = (valNum / item.limit) * 100;
                                            return (
                                                <div key={i} className="space-y-2">
                                                    <div className="flex items-center justify-between text-[10px] font-bold">
                                                        <span className="text-gray-400">{item.label}</span>
                                                        <span className="text-gray-900">{item.val} / {item.limit >= 1000 ? (item.limit / 1000) + 'k' : item.limit} {item.unit}</span>
                                                    </div>
                                                    <div className="h-1.5 w-full bg-gray-50 rounded-full overflow-hidden">
                                                        <div
                                                            className={clsx(
                                                                "h-full transition-all duration-500",
                                                                percent >= 90 ? "bg-rose-600" : percent >= 70 ? "bg-amber-500" : "bg-rose-500"
                                                            )}
                                                            style={{ width: `${Math.min(percent, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        <p className="text-[8px] text-gray-300 italic mt-2">*Usage estimated by app activity</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === "settings" && (
                    <div id="super-admin-settings-content" className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Global Configuration */}
                            {!selectedCompany && (
                                <div className="space-y-8">
                                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                                            <Shield className="w-4 h-4 text-brand-purple" />
                                            Konfigurasi Sistem Global
                                        </h3>
                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                                            Seluruh data sistem dikelola sepenuhnya melalui Firebase Firestore secara real-time. Tidak ada mode penyimpanan lokal yang aktif.
                                        </p>
                                    </div>

                                    {/* Login Page Customization */}
                                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                                            <LayoutDashboard className="w-4 h-4 text-brand-purple" />
                                            Login Page Customization
                                        </h3>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Welcome Title</label>
                                                <input
                                                    value={loginTitle}
                                                    onChange={(e) => setLoginTitle(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple font-bold"
                                                    placeholder="Welcome Back!"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Welcome Description</label>
                                                <textarea
                                                    value={loginDesc}
                                                    onChange={(e) => setLoginDesc(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-brand-purple min-h-[100px] leading-relaxed"
                                                    placeholder="Deskripsi di bawah title..."
                                                />
                                            </div>

                                            <button
                                                onClick={handleSaveLoginConfig}
                                                disabled={savingSettings}
                                                className="w-full py-4 bg-brand-purple hover:bg-brand-purple text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-brand-purple/20"
                                            >
                                                {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : "SIMPAN PERUBAHAN LOGIN"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Danger Zone & Maintenance */}
                            <div className="space-y-6">
                                {selectedCompany && (
                                    <div className="bg-rose-50 border border-rose-100 rounded-3xl p-8 shadow-sm">
                                        <h3 className="text-sm font-black text-rose-600 uppercase tracking-widest mb-4">Hapus Perusahaan</h3>
                                        <p className="text-[10px] text-rose-500 font-bold mb-6 italic">Seluruh data milik {selectedCompany.name} akan dihapus secara permanen.</p>
                                        <button
                                            onClick={() => deleteCompany(selectedCompany.id)}
                                            className="w-full py-4 px-4 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-rose-600/20"
                                        >
                                            Hapus {selectedCompany.name}
                                        </button>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                )}
            </div>

            <footer className="mt-12 pt-8 border-t border-gray-50 text-center text-[9px] text-gray-300 font-bold uppercase tracking-widest">
                Tenant Orchestrator v3.0 • Cloud Ready
            </footer>
        </div>
    );
}
