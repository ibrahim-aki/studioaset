"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2, ClipboardCheck, UserPlus, X, Lock, Eye, EyeOff, History, Clock, Tag, MapPin, KeyRound, Building2, Plus, ArrowLeft, MoreVertical, LayoutGrid, ListChecks, Settings2, LayoutDashboard, Box, Search, Pencil } from "lucide-react";
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
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                            <input
                                type="tel"
                                required
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
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
                                                ? `bg-${r.color === 'indigo' ? 'indigo-600' : r.color === 'emerald' ? 'emerald-500' : r.color === 'amber' ? 'amber-500' : 'rose-500'} border-transparent text-white shadow-lg`
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
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center text-white">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-gray-900 leading-none">Edit Profil User</h3>
                            <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mt-1">ID: {user.id.slice(0, 8)}</p>
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                        <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
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
                                            ? `bg-${r.color === 'indigo' ? 'indigo-600' : r.color === 'emerald' ? 'emerald-500' : r.color === 'amber' ? 'amber-500' : 'rose-500'} border-transparent text-white shadow-lg`
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 appearance-none font-bold"
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
                        className="w-full mt-4 py-4 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl shadow-amber-100"
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
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-extrabold text-gray-900 tracking-tight">Daftarkan Perusahaan</h3>
                            <p className="text-[10px] text-indigo-600 font-black uppercase tracking-widest">Klien Baru</p>
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
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
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
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
                                placeholder="0812xxxx"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Email (Opsional)</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500"
                                placeholder="kantor@pt.id"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Deskripsi Singkat</label>
                        <textarea
                            value={desc}
                            onChange={(e) => setDesc(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm outline-none focus:border-indigo-500 min-h-[80px]"
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
    const [activeTab, setActiveTab] = useState<"users" | "logs" | "settings" | "dashboard">("dashboard");
    const [users, setUsers] = useState<UserData[]>([]);
    const [checklists, setChecklists] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddUserOpen, setIsAddUserOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
    const [isAddCompanyOpen, setIsAddCompanyOpen] = useState(false);
    const [trialMode, setTrialMode] = useState<boolean | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

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

        const unsubSettings = onSnapshot(doc(db, "settings", "system-config"), (snap) => {
            if (snap.exists()) {
                setTrialMode(snap.data().trialModeEnabled);
            } else {
                setTrialMode(false);
            }
        });

        return () => {
            unsub();
            unsubSettings();
        };
    }, [selectedCompany?.id]);

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

    const resetTrialData = () => {
        if (!confirm("Hapus semua data dalam Mode Uji Coba (Local Storage)?\nTindakan ini tidak bisa dibatalkan.")) return;

        const keys = [
            "studioaset_locations", "studioaset_rooms", "studioaset_assets",
            "studioaset_room_assets", "studioaset_checklists", "studioaset_asset_logs",
            "studioaset_categories", "studioaset_changelogs", "studioaset_companies"
        ];

        keys.forEach(key => localStorage.removeItem(key));
        alert("Data Mode Uji Coba telah dibersihkan.");
        window.location.reload();
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
                            <Shield className="w-6 h-6 text-indigo-600" /> Super Admin Portal
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Global management and company orchestration.</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative group/search">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/search:text-indigo-600 transition-colors" />
                            <input
                                type="text"
                                placeholder="Cari klien..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-2xl text-xs outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-50 transition-all w-40 sm:w-64"
                            />
                        </div>
                        <button
                            onClick={() => {
                                setView("management");
                                setActiveTab("settings");
                                setSelectedCompany(null);
                            }}
                            className="p-3 bg-white border border-gray-200 rounded-2xl text-gray-500 hover:text-indigo-600 transition-all shadow-sm flex items-center justify-center"
                            title="Konfigurasi Global"
                        >
                            <ShieldAlert className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsAddCompanyOpen(true)}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> TAMBAH KLIEN
                        </button>
                    </div>
                </header>

                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
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
                                                className="hover:bg-indigo-50/30 transition-colors cursor-pointer group"
                                            >
                                                <td className="px-6 py-4 text-[10px] font-bold text-gray-400 text-center">
                                                    {index + 1}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                                            <Building2 className="w-4 h-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black text-gray-900 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">
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
                                                                <Tag className="w-2.5 h-2.5 text-indigo-400" /> {company.phone}
                                                            </div>
                                                        )}
                                                        {company.email && (
                                                            <div className="flex items-center gap-1.5 text-[9px] text-gray-500 font-bold lowercase">
                                                                <Mail className="w-2.5 h-2.5 text-indigo-400" /> {company.email}
                                                            </div>
                                                        )}
                                                        {!company.phone && !company.email && (
                                                            <span className="text-[9px] text-gray-300 italic">No contact</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">{ageStr}</span>
                                                        <span className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Berlangganan</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="text-[10px] font-bold text-gray-600">
                                                        {new Date(company.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest border border-indigo-100 bg-indigo-50/50 px-3 py-1.5 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all">
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
                    className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:gap-3 transition-all"
                >
                    <ArrowLeft className="w-3 h-3" /> Kembali ke Portal
                </button>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
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
                            { id: "settings", name: "System", icon: Settings2, show: true }
                        ].filter(t => t.show).map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={clsx(
                                    "px-4 py-2 text-[10px] font-black rounded-xl transition-all uppercase flex items-center gap-2 tracking-widest",
                                    activeTab === tab.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-400 hover:text-gray-600"
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
                                    color: "bg-indigo-50 text-indigo-600"
                                },
                                {
                                    label: "Total Inventaris",
                                    value: assets.filter(a => a.companyId === selectedCompany.id).length,
                                    icon: Box,
                                    color: "bg-purple-50 text-purple-600"
                                },
                                {
                                    label: "Aktivitas Terkini",
                                    value: assetLogs.filter(l => l.companyId === selectedCompany.id).length,
                                    icon: History,
                                    color: "bg-blue-50 text-blue-600"
                                },
                                {
                                    label: "Tim Terdaftar",
                                    value: users.length, // already filtered by company in effect
                                    icon: Users,
                                    color: "bg-emerald-50 text-emerald-600"
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
                                        { label: "Kondisi Baik", color: "bg-emerald-500", key: "BAIK" },
                                        { label: "Dalam Perbaikan", color: "bg-amber-500", key: "RUSAK" },
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

                            <div className="bg-indigo-900 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                                <div className="relative z-10">
                                    <h3 className="text-lg font-black mb-4">Integrasi Multi-Tenant</h3>
                                    <p className="text-xs text-indigo-100 leading-relaxed opacity-80 mb-6">
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
                        <div className="bg-indigo-900 rounded-3xl p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                            <div>
                                <h3 className="text-xl font-black mb-2 flex items-center gap-2">
                                    <UserPlus className="w-6 h-6 text-indigo-300" /> Akses Karyawan
                                </h3>
                                <p className="text-sm text-indigo-100/80">Kelola Admin dan Operator untuk {selectedCompany?.name || 'perusahaan terpilih'}.</p>
                            </div>
                            <button onClick={() => setIsAddUserOpen(true)} className="bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black text-xs hover:scale-105 transition-all shadow-xl">
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
                                                                        <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1">
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
                                                            u.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-600 border-purple-100" :
                                                                u.role === "ADMIN" ? "bg-indigo-50 text-indigo-600 border-indigo-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
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
                                                                className="bg-transparent text-[10px] font-bold text-gray-600 outline-none focus:text-indigo-600 cursor-pointer border-b border-dashed border-gray-200 pb-0.5"
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
                                                                    className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                                    title="Edit Profil"
                                                                >
                                                                    <Pencil className="w-4 h-4" />
                                                                </button>
                                                                <button onClick={() => handleResetPassword(u.email)} className="p-2.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Reset Password"><KeyRound className="w-4 h-4" /></button>
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
                                                            log.type === "MOVEMENT" ? "text-blue-600 border-blue-100 bg-blue-50" :
                                                                log.type === "STATUS" ? "text-amber-600 border-amber-100 bg-amber-50" :
                                                                    log.type === "AUTH" ? "text-purple-600 border-purple-100 bg-purple-50" :
                                                                        log.type === "ROOM" ? "text-emerald-500 border-emerald-100 bg-emerald-50" : "text-gray-400 border-gray-100 bg-gray-50"
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

                {activeTab === "settings" && (
                    <div id="super-admin-settings-content" className="space-y-8 animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                            {/* Global Configuration */}
                            {!selectedCompany && (
                                <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                                    <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-6 border-b border-gray-100 pb-4 flex items-center gap-2">
                                        <Shield className="w-4 h-4 text-indigo-600" />
                                        Konfigurasi Sistem Global
                                    </h3>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                                                    <ShieldAlert className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-indigo-900 uppercase tracking-tight">Mode Uji Coba (Demo)</p>
                                                    <p className="text-[10px] text-indigo-600 font-bold uppercase py-0.5">Status: {trialMode ? 'AKTIF' : 'NON-AKTIF'}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => toggleTrialMode()}
                                                className={clsx(
                                                    "w-12 h-6 rounded-full transition-all relative flex items-center px-1 shadow-inner",
                                                    trialMode ? "bg-emerald-500" : "bg-gray-300"
                                                )}
                                            >
                                                <div className={clsx("w-4 h-4 bg-white rounded-full transition-all shadow-md", trialMode ? "translate-x-6" : "translate-x-0")}></div>
                                            </button>
                                        </div>

                                        {trialMode && (
                                            <button
                                                onClick={resetTrialData}
                                                className="w-full py-3 px-4 bg-white border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" /> Bersihkan Data Dummy
                                            </button>
                                        )}
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
