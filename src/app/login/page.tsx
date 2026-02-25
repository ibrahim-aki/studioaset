"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, ShieldAlert, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { useEffect } from "react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [trialMode, setTrialMode] = useState<boolean>(false);
    const router = useRouter();
    const authContext = useAuth();
    const { addLog } = useLocalDb();

    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "system-config"), (snap) => {
            if (snap.exists()) {
                setTrialMode(snap.data().trialModeEnabled);
            }
        });
        return () => unsub();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Fetch role directly to handle fast redirect
            const userDocRef = doc(db, "users", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const role = userDocSnap.data().role;
                if (role === "SUPER_ADMIN") {
                    addLog({
                        type: "AUTH",
                        toValue: "Login Berhasil (Super Admin)",
                        operatorName: userDocSnap.data().name || email,
                        notes: `Email: ${email}`
                    });
                    router.push("/super-admin");
                } else if (role === "ADMIN") {
                    addLog({
                        type: "AUTH",
                        toValue: "Login Berhasil (Admin)",
                        operatorName: userDocSnap.data().name || email,
                        notes: `Email: ${email}`
                    });
                    router.push("/admin");
                } else if (role === "OPERATOR") {
                    addLog({
                        type: "AUTH",
                        toValue: "Login Berhasil (Operator)",
                        operatorName: userDocSnap.data().name || email,
                        notes: `Email: ${email}`
                    });
                    router.push("/operator");
                } else {
                    setError("Peran pengguna tidak valid.");
                    auth.signOut();
                }
            } else {
                setError("Data pengguna tidak ditemukan di sistem.");
                auth.signOut();
            }
        } catch (err: any) {
            console.error(err);
            setError("Email atau password salah.");
        } finally {
            if (!router) {
                setLoading(false);
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-black p-4">
            <div className="max-w-md w-full backdrop-blur-xl bg-white/10 p-8 rounded-3xl shadow-2xl border border-white/20">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Login Studio</h1>
                    <p className="text-gray-300">Masuk untuk mengelola aset streaming Anda</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-100 text-sm text-center font-medium">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-4">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all sm:text-sm"
                                placeholder="Alamat Email"
                                required
                            />
                        </div>

                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-12 pr-4 py-4 bg-white/10 border border-white/30 rounded-xl text-white placeholder-gray-300 focus:bg-white/20 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition-all sm:text-sm"
                                placeholder="Kata Sandi"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            "Masuk ke Sistem"
                        )}
                    </button>
                </form>

                {trialMode && (
                    <div className="mt-8 border-t border-white/20 pt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <ShieldAlert className="w-3 h-3 text-amber-400" />
                            <p className="text-[10px] text-amber-200/60 font-black uppercase tracking-[0.2em]">Mode Uji Coba Aktif</p>
                        </div>
                        <div className="flex gap-4">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    authContext.triggerDemoLogin?.("ADMIN");
                                    addLog({
                                        type: "AUTH",
                                        toValue: "Login Demo (Admin)",
                                        operatorName: "Demo Admin",
                                        notes: "Menggunakan mode uji coba"
                                    });
                                    router.push("/admin");
                                }}
                                className="w-full flex justify-center py-3 px-4 border border-blue-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-blue-300 hover:bg-blue-900/40 transition-all active:scale-95"
                            >
                                Demo Admin
                            </button>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    authContext.triggerDemoLogin?.("OPERATOR");
                                    addLog({
                                        type: "AUTH",
                                        toValue: "Login Demo (Operator)",
                                        operatorName: "Demo Operator",
                                        notes: "Menggunakan mode uji coba"
                                    });
                                    router.push("/operator");
                                }}
                                className="w-full flex justify-center py-3 px-4 border border-rose-500/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-300 hover:bg-rose-900/40 transition-all active:scale-95"
                            >
                                Demo Operator
                            </button>
                        </div>
                        <div className="mt-4 text-center">
                            <a
                                href="https://drive.google.com/file/d/1ycabUmyIv57c9FNevO2duppur_u1vp6M/view?usp=sharing"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[10px] text-white/40 hover:text-white/80 transition-colors flex items-center justify-center gap-1.5 font-medium underline underline-offset-4"
                            >
                                <ClipboardCheck className="w-3 h-3" />
                                DownLoad Panduan Pengguna
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
