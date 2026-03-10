"use client";

import { useState, useEffect, memo, useMemo } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User, ShieldAlert } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { useToast } from "@/context/ToastContext";
import { motion } from "framer-motion";

// CSS for smooth twinkling and floating without taxing the main thread
const starStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0); opacity: 0.3; }
    50% { transform: translateY(-15px); opacity: 0.8; }
  }
  .star-float {
    animation: float var(--duration) ease-in-out infinite;
    animation-delay: var(--delay);
  }
`;

const BackgroundStars = memo(() => {
    const starData = useMemo(() => [...Array(40)].map((_, i) => ({
        top: Math.random() * 80,
        left: Math.random() * 100,
        size: Math.random() * 2 + 1,
        duration: 4 + Math.random() * 6 + "s",
        delay: Math.random() * 5 + "s",
    })), []);

    return (
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
            <style>{starStyles}</style>
            {starData.map((star, i) => (
                <div
                    key={i}
                    className="absolute rounded-full bg-white/50 star-float"
                    style={{
                        width: `${star.size}px`,
                        height: `${star.size}px`,
                        top: `${star.top}%`,
                        left: `${star.left}%`,
                        // @ts-ignore
                        "--duration": star.duration,
                        "--delay": star.delay,
                    }}
                />
            ))}
        </div>
    );
});

BackgroundStars.displayName = "BackgroundStars";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [displayMessage, setDisplayMessage] = useState<string | null>(null);
    const [welcomeTitle, setWelcomeTitle] = useState("Welcome Back!");
    const [welcomeDescription, setWelcomeDescription] = useState("Hubungkan kembali koneksi Anda untuk mengelola aset dengan cerdas.");
    const router = useRouter();
    const { addLog } = useLocalDb();
    const { showToast } = useToast();

    // Listen to Dynamic Login Text from Firestore
    useEffect(() => {
        const unsub = onSnapshot(doc(db, "settings", "login-config"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.welcomeTitle) setWelcomeTitle(data.welcomeTitle);
                if (data.welcomeDescription) setWelcomeDescription(data.welcomeDescription);
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
            const userDocRef = doc(db, "users", userCredential.user.uid);
            const userDocSnap = await getDoc(userDocRef);

            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const role = userData.role?.toUpperCase();

                if (role) {
                    const newSessionId = Math.random().toString(36).substring(2, 15);
                    localStorage.setItem("studio_session_id", newSessionId);

                    const { updateDoc } = await import("firebase/firestore");
                    await updateDoc(userDocRef, {
                        lastSessionId: newSessionId,
                        lastLogin: new Date().toISOString()
                    }).catch(err => console.error("Session update failed:", err));

                    const logData = {
                        type: "AUTH" as const,
                        operatorName: userData.name || email,
                        operatorRole: role as any,
                        companyId: userData.companyId || "",
                        notes: `Email: ${email}`
                    };

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
                    background: "linear-gradient(to bottom, #1A0D3C 0%, #7C4DFF 40%, #FFB246 100%)"
                }}
            />

            {/* ── Background Elements (Memoized to prevent jitter during typing) ── */}
            <BackgroundStars />

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
                <path d="M0,280 L120,160 L240,220 L360,100 L480,180 L600,80 L720,160 L840,90 L960,170 L1080,110 L1200,190 L1320,120 L1440,200 L1440,320 L0,320 Z"
                    fill="#3d1367" opacity="0.7" />
                <path d="M0,310 L80,220 L180,270 L280,180 L400,240 L520,150 L640,230 L760,170 L880,240 L1000,180 L1120,250 L1240,190 L1360,260 L1440,220 L1440,320 L0,320 Z"
                    fill="#2a0c55" opacity="0.85" />
                <path d="M0,320 L60,270 L140,300 L220,250 L320,285 L420,240 L520,275 L620,230 L720,265 L820,235 L920,270 L1020,245 L1120,280 L1220,255 L1320,285 L1440,260 L1440,320 Z"
                    fill="#170733" />
                <rect x="0" y="305" width="1440" height="15" fill="#1a0a3d" opacity="0.6" />
            </svg>

            {/* ── Glass Card ── */}
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
                {/* LEFT SECTION */}
                <div className="md:w-5/12 p-10 flex flex-col justify-center items-center text-center relative overflow-hidden bg-gradient-to-br from-brand-teal/[0.005] to-purple-800/[0.005]">
                    <h2 className="text-4xl font-black text-white mb-4 tracking-tight drop-shadow-lg">{welcomeTitle}</h2>
                    <p className="text-sm font-medium text-white/70 leading-relaxed mb-8 max-w-[220px] mx-auto">
                        {welcomeDescription}
                    </p>
                    <div className="w-12 h-1 bg-white/30 mx-auto rounded-full" />
                </div>

                <div className="hidden md:block w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

                {/* RIGHT SECTION */}
                <div className="md:w-7/12 p-8 md:p-12 relative">
                    {displayMessage ? (
                        <div className="h-full flex flex-col justify-center items-center space-y-6">
                            <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center w-full max-w-sm">
                                <ShieldAlert className="w-7 h-7 text-rose-500 mx-auto mb-6" />
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
                                        <User className="absolute inset-y-0 right-4 h-4 w-4 text-white/30 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
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
                                        <Lock className="absolute inset-y-0 right-4 h-4 w-4 text-white/20 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-2xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-purple/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
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
                                    <label className="flex items-center gap-2 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border border-white/20 bg-transparent appearance-none checked:bg-brand-blue/40 transition-all cursor-pointer relative group-hover:border-brand-blue"
                                            style={{
                                                backgroundColor: 'transparent',
                                                boxShadow: 'none'
                                            }}
                                        />
                                        <span className="text-[10px] font-bold text-white/30 uppercase tracking-wider">Remember me</span>
                                    </label>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!email) {
                                                setDisplayMessage("Masukkan email untuk reset password.");
                                                return;
                                            }
                                            try {
                                                const { fetchSignInMethodsForEmail, sendPasswordResetEmail } = await import("firebase/auth");

                                                // Cek apakah email terdaftar di Firebase Auth
                                                const methods = await fetchSignInMethodsForEmail(auth, email);

                                                if (methods.length === 0) {
                                                    setDisplayMessage("Email Belum Terdaftar, Gagal memproses permintaan reset password.");
                                                    return;
                                                }

                                                // Jika terdaftar, baru kirim email reset
                                                await sendPasswordResetEmail(auth, email);
                                                setDisplayMessage("Cek email Anda untuk reset password.");
                                            } catch (error: any) {
                                                console.error("Reset error:", error);
                                                // Jika Firebase mengembalikan error khusus bahwa user tidak ditemukan
                                                if (error.code === 'auth/user-not-found') {
                                                    setDisplayMessage("Email Belum Terdaftar, Gagal memproses permintaan reset password.");
                                                } else {
                                                    setDisplayMessage("Terjadi kesalahan sistem. Gagal memproses permintaan reset password.");
                                                }
                                            }
                                        }}
                                        className="text-[10px] font-bold text-white/30 hover:text-white transition-all tracking-tight uppercase"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-4 rounded-full text-[12px] font-black uppercase tracking-[0.2em] text-white transition-all transform hover:scale-[1.05]"
                                    style={{
                                        background: "linear-gradient(to right, #7C4DFF, #FFB246)",
                                        boxShadow: "0 0 20px rgba(124, 77, 255, 0.4)",
                                        border: "1px solid rgba(255, 255, 255, 0.2)"
                                    }}
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SIGN IN"}
                                </button>
                            </form>

                            <div className="mt-8 text-center text-[9px] font-black text-white/30 flex items-center justify-center gap-3 group/signup cursor-pointer">
                                <span className="shrink-0">Don't have an account?</span>
                                <span className="text-white/60 tracking-widest group-hover/signup:text-white transition-colors underline underline-offset-4 decoration-white/20">SIGN UP</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
