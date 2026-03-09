"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, ShieldAlert, ClipboardCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { useToast } from "@/context/ToastContext";
import { useEffect } from "react";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [trialMode, setTrialMode] = useState<boolean>(false);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);
    const router = useRouter();
    const authContext = useAuth();
    const { addLog } = useLocalDb();
    const { showToast } = useToast();

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
        setDisplayMessage(null);
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            // Fetch role directly to handle fast redirect
            const userDocRef = doc(db, "users", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData.role?.toUpperCase();

                if (role === "SUPER_ADMIN" || role === "ADMIN" || role === "OPERATOR" || role === "CLIENT_ADMIN" || role === "CLIENT_OPERATOR") {
                    // SESSION MANAGEMENT: Generate and save new session ID on login
                    const newSessionId = Math.random().toString(36).substring(2, 15);

                    // FIX: Tetapkan ke localStorage DULU sebelum update Firestore 
                    // agar AuthContext tidak membaca array kosong.
                    localStorage.setItem("studio_session_id", newSessionId);

                    // Update session in Firestore — MUST await before redirect
                    // to prevent race condition with the session monitor in AuthContext
                    const { updateDoc } = await import("firebase/firestore");
                    await updateDoc(userDocRef, {
                        lastSessionId: newSessionId,
                        lastLogin: new Date().toISOString()
                    }).catch(err => console.error("Session update failed:", err));

                    // Add logs and redirect
                    const logData = {
                        type: "AUTH" as const,
                        operatorName: userData.name || email,
                        operatorRole: role as any,
                        companyId: userData.companyId || "",
                        notes: `Email: ${email}`
                    };

                    // Persist for context fallback
                    if (userData.companyId) {
                        localStorage.setItem("last_known_company_id", userData.companyId);
                    }

                    if (role === "SUPER_ADMIN") {
                        addLog({ ...logData, toValue: "Login (Super Admin)" });
                        router.push("/super-admin");
                    } else if (role === "ADMIN" || role === "CLIENT_ADMIN") {
                        addLog({ ...logData, toValue: `Login (${role === "ADMIN" ? "Admin" : "Client Admin"})` });
                        router.push("/admin");
                    } else if (role === "OPERATOR" || role === "CLIENT_OPERATOR") {
                        addLog({ ...logData, toValue: `Login (${role === "OPERATOR" ? "Operator" : "Client Operator"})` });
                        router.push("/operator");
                    }
                } else {
                    setDisplayMessage("Peran pengguna tidak valid. Silakan hubungi admin sistem.");
                    auth.signOut();
                }
            } else {
                setDisplayMessage("Data pengguna tidak ditemukan di sistem. Pastikan Anda sudah terdaftar.");
                auth.signOut();
            }
        } catch (err: any) {
            console.error(err);
            setDisplayMessage("Email atau kata sandi yang Anda masukkan salah. Silakan coba lagi atau hubungi admin.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
            {/* ── Sky Gradient Background ── */}
            <div
                className="absolute inset-0 -z-10"
                style={{
                    background: "linear-gradient(to bottom, #0d0121 0%, #2e0a6e 25%, #7b2fa0 50%, #c85a15 75%, #e87020 100%)"
                }}
            />

            {/* ── Stars ── */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                {[...Array(60)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute rounded-full bg-white"
                        style={{
                            width: Math.random() * 2 + 1 + "px",
                            height: Math.random() * 2 + 1 + "px",
                            top: Math.random() * 60 + "%",
                            left: Math.random() * 100 + "%",
                            opacity: Math.random() * 0.7 + 0.2,
                        }}
                    />
                ))}
            </div>

            {/* ── Moon ── */}
            <div
                className="absolute -z-10 rounded-full"
                style={{
                    width: "70px",
                    height: "70px",
                    top: "10%",
                    left: "22%",
                    background: "radial-gradient(circle at 35% 35%, #f5c842, #e0860d)",
                    boxShadow: "0 0 40px 10px rgba(240,160,20,0.35)",
                }}
            />

            {/* ── Mountain SVG Scene ── */}
            <svg
                className="absolute bottom-0 left-0 w-full -z-10"
                viewBox="0 0 1440 320"
                preserveAspectRatio="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                {/* Far mountains – lighter */}
                <path d="M0,280 L120,160 L240,220 L360,100 L480,180 L600,80 L720,160 L840,90 L960,170 L1080,110 L1200,190 L1320,120 L1440,200 L1440,320 L0,320 Z"
                    fill="#3d1367" opacity="0.7" />
                {/* Mid mountains */}
                <path d="M0,310 L80,220 L180,270 L280,180 L400,240 L520,150 L640,230 L760,170 L880,240 L1000,180 L1120,250 L1240,190 L1360,260 L1440,220 L1440,320 L0,320 Z"
                    fill="#2a0c55" opacity="0.85" />
                {/* Front mountains – darkest */}
                <path d="M0,320 L60,270 L140,300 L220,250 L320,285 L420,240 L520,275 L620,230 L720,265 L820,235 L920,270 L1020,245 L1120,280 L1220,255 L1320,285 L1440,260 L1440,320 Z"
                    fill="#170733" />
                {/* Water reflection */}
                <rect x="0" y="305" width="1440" height="15" fill="#1a0a3d" opacity="0.6" />
            </svg>

            {/* ── Glow orb at horizon ── */}
            <div
                className="absolute -z-10"
                style={{
                    bottom: "28%",
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: "340px",
                    height: "120px",
                    borderRadius: "50%",
                    background: "radial-gradient(ellipse, rgba(230,140,30,0.45) 0%, transparent 70%)",
                    filter: "blur(18px)",
                }}
            />

            {/* ── Glass Card ── */}
            <div
                className="max-w-md w-full p-8 rounded-2xl relative z-10"
                style={{
                    background: "rgba(255,255,255,0.07)",
                    backdropFilter: "blur(24px)",
                    WebkitBackdropFilter: "blur(24px)",
                    border: "1px solid rgba(255,255,255,0.18)",
                    boxShadow: "0 8px 40px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.12)",
                }}
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-gradient-to-tr from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-purple-500/30">
                        <Lock className="text-white w-8 h-8" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Login Studio</h1>
                    <p className="text-gray-300">
                        {displayMessage ? "Informasi Sistem" : "Masuk untuk mengelola aset streaming Anda"}
                    </p>
                </div>

                {displayMessage ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="p-6 bg-white/10 border border-rose-400/30 rounded-2xl text-center">
                            <div className="relative w-12 h-12 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-6 h-6 text-rose-500 animate-pulse" />
                                <div className="absolute inset-0 bg-rose-500/20 rounded-full animate-ping" />
                            </div>
                            <p className="text-white font-medium leading-relaxed">
                                {displayMessage}
                            </p>
                        </div>
                        <button
                            onClick={() => setDisplayMessage(null)}
                            className="w-full py-4 px-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-white font-bold transition-all"
                        >
                            Kembali ke Menu Login
                        </button>
                    </div>
                ) : (
                    <>
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
                                        className="block w-full pl-12 pr-4 py-4 border border-white/25 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-white/40 transition-all sm:text-sm"
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.06) inset',
                                            WebkitTextFillColor: 'white',
                                        }}
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
                                        className="block w-full pl-12 pr-4 py-4 border border-white/25 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60 focus:border-white/40 transition-all sm:text-sm"
                                        style={{
                                            background: 'rgba(255,255,255,0.06)',
                                            WebkitBoxShadow: '0 0 0 1000px rgba(255,255,255,0.06) inset',
                                            WebkitTextFillColor: 'white',
                                        }}
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

                            <div className="text-center">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!email) {
                                            setDisplayMessage("Silakan masukkan alamat email Anda terlebih dahulu di kolom email.");
                                            return;
                                        }
                                        try {
                                            const { sendPasswordResetEmail } = await import("firebase/auth");
                                            await sendPasswordResetEmail(auth, email);
                                            setDisplayMessage("Cek email masuk, jika tidak ada pastikan cek email di folder Spam, Terimakasih .");
                                        } catch (error) {
                                            setDisplayMessage("Gagal mengirim email reset password. Pastikan alamat email Anda sudah terdaftar dengan benar.");
                                        }
                                    }}
                                    className="text-xs font-bold text-gray-400 hover:text-white transition-colors underline underline-offset-4"
                                >
                                    Lupa Password?
                                </button>
                            </div>
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
                                                operatorRole: "ADMIN",
                                                companyId: "DEMO_COMPANY",
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
                                                operatorRole: "OPERATOR",
                                                companyId: "DEMO_COMPANY",
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
                    </>
                )}
            </div>
        </div>
    );
}
