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
import { motion } from "framer-motion";

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

            {/* ── Glass Card (Two Columns) ── */}
            <div
                className="max-w-2xl w-full flex flex-col md:flex-row rounded-[2.5rem] relative z-10 overflow-hidden"
                style={{
                    background: "rgba(255, 255, 255, 0.001)",
                    backdropFilter: "blur(16px) saturate(110%)",
                    WebkitBackdropFilter: "blur(16px) saturate(110%)",
                    border: "1px solid rgba(255, 255, 255, 0.015)",
                    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.005)",
                }}
            >
                {/* ── LEFT SECTION: Welcome ── */}
                <div className="md:w-5/12 p-10 flex flex-col justify-center items-center text-center relative overflow-hidden bg-gradient-to-br from-blue-600/[0.005] to-purple-800/[0.005]">
                    <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-blue-400/[0.005] rounded-full blur-[80px]" />
                    <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-purple-400/[0.005] rounded-full blur-[80px]" />

                    <div className="relative z-10 w-full">
                        <h2 className="text-4xl font-black text-white mb-4 tracking-tight drop-shadow-lg">Welcome Back!</h2>
                        <p className="text-sm font-medium text-white/70 leading-relaxed mb-8 max-w-[220px] mx-auto">
                            Hubungkan kembali koneksi Anda untuk mengelola aset studio dengan cerdas.
                        </p>
                        <div className="w-12 h-1 bg-white/30 mx-auto rounded-full" />
                    </div>
                </div>

                {/* ── Vertical Separator ── */}
                <div className="hidden md:block w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

                {/* ── RIGHT SECTION: Form ── */}
                <div className="md:w-7/12 p-8 md:p-12 relative">
                    {displayMessage ? (
                        <div className="h-full flex flex-col justify-center items-center space-y-6 animate-in fade-in zoom-in duration-500">
                            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center w-full max-w-sm">
                                <div className="relative w-14 h-14 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <ShieldAlert className="w-7 h-7 text-rose-500 animate-pulse" />
                                </div>
                                <p className="text-white/90 font-medium leading-relaxed text-sm">
                                    {displayMessage}
                                </p>
                            </div>
                            <button
                                onClick={() => setDisplayMessage(null)}
                                className="px-8 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-all text-xs uppercase tracking-widest"
                            >
                                Kembali ke Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Login</h1>
                                <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em]">Sign in to your account</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                            <User className="h-4 w-4 text-white/30 group-focus-within:text-blue-400 transition-colors" />
                                        </div>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
                                            style={{
                                                backgroundColor: 'transparent',
                                                WebkitBoxShadow: '0 0 0 1000px transparent inset',
                                                WebkitTextFillColor: 'white',
                                            }}
                                            placeholder="Username / Email"
                                            required
                                        />
                                    </div>

                                    <div className="relative group">
                                        <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
                                            <Lock className="h-4 w-4 text-white/20 group-focus-within:text-purple-400/50 transition-colors" />
                                        </div>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-purple-500/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
                                            style={{
                                                backgroundColor: 'transparent',
                                                WebkitBoxShadow: '0 0 0 1000px transparent inset',
                                                WebkitTextFillColor: 'white',
                                            }}
                                            placeholder="Password"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between px-1">
                                    <label className="flex items-center gap-2 cursor-pointer group p-1.5 rounded-lg hover:bg-white/[0.05] transition-all">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border border-white/20 bg-transparent appearance-none checked:bg-blue-500/40 transition-all cursor-pointer relative group-hover:border-blue-400"
                                            style={{
                                                backgroundColor: 'transparent',
                                                boxShadow: 'none'
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-white/30 group-hover:text-white/70 transition-colors cursor-pointer uppercase tracking-wider">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!email) {
                                                setDisplayMessage("Masukkan email untuk reset password.");
                                                return;
                                            }
                                            try {
                                                const { sendPasswordResetEmail } = await import("firebase/auth");
                                                await sendPasswordResetEmail(auth, email);
                                                setDisplayMessage("Cek email Anda untuk reset password.");
                                            } catch (error) {
                                                setDisplayMessage("Gagal mengirim email reset.");
                                            }
                                        }}
                                        className="text-[10px] font-bold text-white/30 hover:text-white hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all tracking-tight uppercase"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-4 rounded-full shadow-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all transform hover:scale-[1.05] hover:shadow-blue-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                                    style={{
                                        background: "linear-gradient(to right, rgba(59, 130, 246, 0.15), rgba(147, 51, 234, 0.15))",
                                        backdropFilter: "blur(2px)",
                                        WebkitBackdropFilter: "blur(2px)",
                                        border: "1px solid rgba(255, 255, 255, 0.05)"
                                    }}
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        "SIGN IN"
                                    )}
                                </button>
                            </form>

                            {trialMode && (
                                <div className="mt-8 border-t border-white/[0.05] pt-6 animate-in fade-in slide-in-from-top-4 duration-700">
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <div className="w-1 h-1 rounded-full bg-amber-500/30 animate-pulse" />
                                        <p className="text-[9px] text-amber-500/40 font-black uppercase tracking-[0.3em]">Access Mode</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                authContext.triggerDemoLogin?.("ADMIN");
                                                router.push("/admin");
                                            }}
                                            className="w-full py-2.5 border border-white/[0.03] bg-transparent rounded-xl text-[9px] font-black uppercase tracking-widest text-white/20 hover:bg-white/[0.03] hover:border-white/10 hover:text-white/50 transition-all active:scale-95"
                                        >
                                            Admin
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.preventDefault();
                                                authContext.triggerDemoLogin?.("OPERATOR");
                                                router.push("/operator");
                                            }}
                                            className="w-full py-2.5 border border-white/[0.03] bg-transparent rounded-xl text-[9px] font-black uppercase tracking-widest text-white/20 hover:bg-white/[0.03] hover:border-white/10 hover:text-white/50 transition-all active:scale-95"
                                        >
                                            Operator
                                        </button>
                                    </div>
                                    <div className="mt-8 text-center text-[9px] font-black text-white/[0.05] flex items-center justify-center gap-3 group/signup cursor-pointer">
                                        <span className="shrink-0">Don't have an account?</span>
                                        <span className="text-white/[0.15] tracking-widest group-hover/signup:text-white/40 transition-colors">SIGN UP</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
