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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0a0a0c]">
            {/* ── Dynamic Animated Background ── */}
            <div className="absolute inset-0 -z-10">
                {/* Mesh Gradient Orbs */}
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        rotate: [0, 90, 0],
                        x: [0, 100, 0],
                        y: [0, 50, 0]
                    }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-purple-600/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        scale: [1, 1.3, 1],
                        rotate: [0, -90, 0],
                        x: [0, -100, 0],
                        y: [0, -50, 0]
                    }}
                    transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                    className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/20 rounded-full blur-[120px]"
                />
                <motion.div
                    animate={{
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.5, 1]
                    }}
                    transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[30%] right-[20%] w-[30%] h-[30%] bg-rose-600/10 rounded-full blur-[100px]"
                />

                {/* Floating Glass Particles */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ x: Math.random() * 100 + "%", y: Math.random() * 100 + "%" }}
                            animate={{
                                x: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
                                y: [Math.random() * 100 + "%", Math.random() * 100 + "%"],
                                rotate: [0, 360]
                            }}
                            transition={{ duration: Math.random() * 20 + 20, repeat: Infinity, ease: "linear" }}
                            className="absolute w-64 h-64 bg-white/5 border border-white/10 rounded-full backdrop-blur-[60px]"
                            style={{ opacity: 0.3 }}
                        />
                    ))}
                </div>
            </div>

            {/* ── Glass Card ── */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="max-w-md w-full p-10 rounded-[2.5rem] relative z-10 overflow-hidden"
                style={{
                    background: "rgba(255, 255, 255, 0.03)",
                    backdropFilter: "blur(40px) saturate(180%)",
                    WebkitBackdropFilter: "blur(40px) saturate(180%)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255, 255, 255, 0.05)",
                }}
            >
                {/* Internal Glows */}
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />

                <div className="text-center mb-10 relative">
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-2xl backdrop-blur-xl"
                    >
                        <Lock className="text-white w-7 h-7" />
                    </motion.div>
                    <h1 className="text-4xl font-black text-white mb-2 tracking-tighter">STUDIO ASET</h1>
                    <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.3em]">
                        {displayMessage ? "Sistem Notifikasi" : "Authentication Required"}
                    </p>
                </div>

                {displayMessage ? (
                    <div className="space-y-6 animate-in fade-in zoom-in duration-500">
                        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl text-center">
                            <div className="relative w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-6 h-6 text-rose-500" />
                            </div>
                            <p className="text-white/80 font-medium leading-relaxed text-sm">
                                {displayMessage}
                            </p>
                        </div>
                        <button
                            onClick={() => setDisplayMessage(null)}
                            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-bold transition-all text-xs uppercase tracking-widest"
                        >
                            Back to Login
                        </button>
                    </div>
                ) : (
                    <>
                        <form onSubmit={handleLogin} className="space-y-5 relative">
                            <div className="space-y-3">
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-white/20 group-focus-within:text-blue-400 transition-colors" />
                                    </div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-white/20 transition-all text-sm font-medium"
                                        placeholder="Email Address"
                                        required
                                    />
                                </div>

                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                        <Lock className="h-4 w-4 text-white/20 group-focus-within:text-purple-400 transition-colors" />
                                    </div>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="block w-full pl-11 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-white/20 transition-all text-sm font-medium"
                                        placeholder="Password"
                                        required
                                    />
                                </div>
                            </div>

                            <motion.button
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={loading}
                                className="w-full flex justify-center py-4 px-4 rounded-xl shadow-2xl text-[12px] font-black uppercase tracking-[0.2em] text-white bg-white/10 hover:bg-white/20 border border-white/10 focus:outline-none transition-all disabled:opacity-50"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Masuk"
                                )}
                            </motion.button>

                            <div className="text-center pt-2">
                                <button
                                    type="button"
                                    onClick={async () => {
                                        if (!email) {
                                            setDisplayMessage("Masukkan email Anda terlebih dahulu.");
                                            return;
                                        }
                                        try {
                                            const { sendPasswordResetEmail } = await import("firebase/auth");
                                            await sendPasswordResetEmail(auth, email);
                                            setDisplayMessage("Cek email masuk/spam untuk reset password.");
                                        } catch (error) {
                                            setDisplayMessage("Gagal mengirim email reset password.");
                                        }
                                    }}
                                    className="text-[10px] font-bold text-white/20 hover:text-white/60 transition-colors tracking-[0.15em] uppercase"
                                >
                                    Lupa Password?
                                </button>
                            </div>
                        </form>

                        {trialMode && (
                            <div className="mt-8 border-t border-white/5 pt-8 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="flex items-center justify-center gap-2 mb-5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
                                    <p className="text-[10px] text-amber-500/30 font-black uppercase tracking-[0.3em]">Quick Access Mode</p>
                                </div>
                                <div className="flex gap-3">
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
                                                notes: "Trial mode login"
                                            });
                                            router.push("/admin");
                                        }}
                                        className="w-full py-3 px-2 border border-white/5 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white/80 transition-all"
                                    >
                                        Admin
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
                                                notes: "Trial mode login"
                                            });
                                            router.push("/operator");
                                        }}
                                        className="w-full py-3 px-2 border border-white/5 bg-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10 hover:text-white/80 transition-all"
                                    >
                                        Operator
                                    </button>
                                </div>
                                <div className="mt-6 text-center">
                                    <a
                                        href="https://drive.google.com/file/d/1ycabUmyIv57c9FNevO2duppur_u1vp6M/view?usp=sharing"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] text-white/10 hover:text-white/30 transition-colors inline-flex items-center gap-1.5 font-bold uppercase tracking-widest underline underline-offset-8"
                                    >
                                        <ClipboardCheck className="w-3 h-3" />
                                        User Guide
                                    </a>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </motion.div>
        </div>
    );
}
