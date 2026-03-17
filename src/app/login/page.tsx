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
import clsx from "clsx";

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
    const [showNotificationImage, setShowNotificationImage] = useState(false);
    const [notificationImageUrl, setNotificationImageUrl] = useState("");
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
                setShowNotificationImage(data.showNotificationImage || false);
                setNotificationImageUrl(data.notificationImageUrl || "");
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
                    background: "linear-gradient(to bottom, #0A051E 0%, #703DFF 45%, #FF8A00 100%)"
                }}
            />

            {/* ── Background Elements (Memoized to prevent jitter during typing) ── */}
            <BackgroundStars />

            {/* ── Moon ── */}
            <div
                className="absolute -z-10 rounded-full"
                style={{
                    width: "75px",
                    height: "75px",
                    top: "12%",
                    left: "20%",
                    background: "radial-gradient(circle at 30% 30%, #FFF176, #FF9100)",
                    boxShadow: "0 0 60px 20px rgba(255, 145, 0, 0.4), 0 0 100px 40px rgba(255, 213, 79, 0.15)",
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
                    fill="#2E1065" opacity="0.8" />
                <path d="M0,310 L80,220 L180,270 L280,180 L400,240 L520,150 L640,230 L760,170 L880,240 L1000,180 L1120,250 L1240,190 L1360,260 L1440,220 L1440,320 L0,320 Z"
                    fill="#1E0B4B" opacity="0.95" />
                <path d="M0,320 L60,270 L140,300 L220,250 L320,285 L420,240 L520,275 L620,230 L720,265 L820,235 L920,270 L1020,245 L1120,280 L1220,255 L1320,285 L1440,260 L1440,320 Z"
                    fill="#0F0524" />
                <rect x="0" y="305" width="1440" height="15" fill="#0A051E" opacity="0.4" />
            </svg>

            {/* ── Glass Card ── */}
            <div
                className="max-w-2xl w-full flex flex-col md:flex-row rounded-[1.5rem] relative z-10 overflow-hidden"
                style={{
                    background: "rgba(255, 255, 255, 0.001)",
                    backdropFilter: "blur(16px) saturate(110%)",
                    WebkitBackdropFilter: "blur(16px) saturate(110%)",
                    border: "1px solid rgba(255, 255, 255, 0.015)",
                    boxShadow: "0 15px 45px rgba(0, 0, 0, 0.2), inset 0 1px 1px rgba(255, 255, 255, 0.005)",
                }}
            >
                {/* LEFT SECTION */}
                <div className={clsx(
                    "md:w-5/12 p-10 flex flex-col justify-center items-center text-center relative overflow-hidden bg-gradient-to-br from-brand-teal/[0.005] to-purple-800/[0.005]",
                    displayMessage && "hidden md:flex"
                )}>
                    {displayMessage && showNotificationImage && notificationImageUrl ? (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute inset-0 w-full h-full"
                        >
                            <img 
                                src={notificationImageUrl} 
                                className="w-full h-full object-cover"
                                alt="Notification Illustration"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-brand-purple/20 to-black/40 mix-blend-overlay" />
                        </motion.div>
                    ) : (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative z-10"
                        >
                            <h2 className="text-4xl font-bold text-white mb-4 tracking-tight drop-shadow-lg">{welcomeTitle}</h2>
                            <p className="text-sm font-medium text-white/70 leading-relaxed mb-8 max-w-[220px] mx-auto">
                                {welcomeDescription}
                            </p>
                            <div className="w-12 h-1 bg-white/30 mx-auto rounded-full" />
                        </motion.div>
                    )}
                </div>

                <div className="hidden md:block w-[1px] self-stretch bg-gradient-to-b from-transparent via-white/[0.08] to-transparent" />

                {/* RIGHT SECTION */}
                <div className="md:w-7/12 p-8 md:p-12 relative flex flex-col justify-center">
                    {displayMessage ? (
                        <div className="h-full flex flex-col justify-center items-center space-y-6 relative min-h-[400px] md:min-h-0">
                            {/* MOBILE BACKGROUND PHOTO (Hidden on Desktop) */}
                            {showNotificationImage && notificationImageUrl && (
                                <div className="absolute inset-x-0 inset-y-0 -m-8 md:hidden -z-10 overflow-hidden">
                                    <img 
                                        src={notificationImageUrl} 
                                        className="w-full h-full object-cover opacity-60" 
                                        alt="Notification BG mobile"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-black/80 backdrop-blur-[1px]" />
                                </div>
                            )}

                            <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl text-center w-full max-w-sm shadow-xl relative z-10">
                                <ShieldAlert className="w-8 h-8 text-rose-500 mx-auto mb-6 drop-shadow-[0_0_10px_rgba(244,63,94,0.4)]" />
                                <p className="text-white font-semibold leading-relaxed text-sm tracking-tight uppercase">
                                    {displayMessage}
                                </p>
                            </div>
                            <button
                                onClick={() => setDisplayMessage(null)}
                                className="px-10 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-white font-bold transition-all text-[11px] uppercase tracking-[0.2em] backdrop-blur-sm relative z-10"
                            >
                                Kembali ke Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="mb-10">
                                <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Login</h1>
                                <p className="text-xs font-semibold text-white/40 uppercase tracking-[0.2em]">Sign in to your account</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                <div className="space-y-4">
                                    <div className="relative group">
                                        <User className="absolute inset-y-0 right-4 h-4 w-4 text-white/30 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-blue/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
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
                                            className="block w-full pl-6 pr-12 py-4 bg-transparent border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-1 focus:ring-brand-purple/30 focus:border-white/40 hover:bg-white/[0.03] hover:border-white/30 transition-all text-sm font-medium"
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
                                            onChange={() => setDisplayMessage("Maaf demi alasan keamanan fitur REMEMBER ME kami NON AKTIFKAN")}
                                            readOnly
                                            className="w-4 h-4 rounded border border-white/20 bg-transparent appearance-none checked:bg-brand-blue/40 transition-all cursor-pointer relative group-hover:border-brand-blue"
                                            style={{
                                                backgroundColor: 'transparent',
                                                boxShadow: 'none'
                                            }}
                                        />
                                        <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">Remember me</span>
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
                                        className="text-[10px] font-semibold text-white/30 hover:text-white transition-all tracking-tight uppercase"
                                    >
                                        Forgot password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 px-4 rounded-xl text-[12px] font-bold uppercase tracking-[0.3em] text-white transition-all transform hover:translate-y-[-2px] active:scale-[0.98] relative overflow-hidden group/btn shadow-[0_10px_20px_-10px_rgba(124,77,255,0.5)] border border-white/20"
                                    style={{
                                        background: "linear-gradient(135deg, rgba(124, 77, 255, 0.4) 0%, rgba(58, 190, 249, 0.4) 100%)",
                                        backdropFilter: "blur(8px)",
                                        WebkitBackdropFilter: "blur(8px)",
                                    }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-700 pointer-events-none" />
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SIGN IN"}
                                </button>
                            </form>

                            <div 
                                onClick={() => setDisplayMessage("Mohon maaf aplikasi ini belum dibuka untuk umum")}
                                className="mt-8 text-center text-[9px] font-bold text-white/30 flex items-center justify-center gap-3 group/signup cursor-pointer"
                            >
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
