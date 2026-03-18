"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { LogOut, Key, Camera, CameraOff, RefreshCw, ShieldAlert, Smartphone, AlertTriangle, Lock, Clock, Bell, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import { AnimatePresence, motion } from "framer-motion";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const { addLog, operatorShifts, endShift, companies, updateShift } = useLocalDb();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    // State untuk shift expired
    const [isShiftExpired, setIsShiftExpired] = useState(false);
    const [newEndTime, setNewEndTime] = useState("");
    const [isUpdatingShift, setIsUpdatingShift] = useState(false);
    const router = useRouter();

    // State baru untuk status akses yang lebih detail
    const [accessStatus, setAccessStatus] = useState<"checking" | "allowed" | "desktop" | "emulator" | "wrong-browser">("checking");

    useEffect(() => {
        const ua = navigator.userAgent;
        const uaLower = ua.toLowerCase();
        const platform = (navigator as any).platform?.toLowerCase() || "";

        const isMobileUA = /android|iphone|ipad|ipod|mobile|tablet/i.test(ua);
        // iPad modern terkadang melaporkan sebagai Macintosh (MacIntel), cek via touch
        const isIpadOS = (navigator.maxTouchPoints > 2 && /mac/i.test(uaLower));

        // Deteksi Platform Hardware Asli
        const isDesktopPlatform = /win32|win64|macintel|linux x86_64/i.test(platform);

        if (!isMobileUA && !isIpadOS) {
            // Murni Desktop
            setAccessStatus("desktop");
            return;
        }

        if (isMobileUA && isDesktopPlatform && !isIpadOS) {
            // User-Agent mengaku Mobile, tapi Platform Hardware tetap Windows/Mac/Linux.
            // Ini adalah indikasi kuat penggunaan "Inspect Element" (Mobile Emulation).
            setAccessStatus("emulator");
            return;
        }

        // --- Deteksi Browser yang Diizinkan ---
        const isAndroid = /android/i.test(ua);
        const isIOS = /iphone|ipad|ipod/i.test(ua) || isIpadOS;

        if (isAndroid) {
            // Android: Hanya izinkan Chrome asli
            // Chrome Android: mengandung 'Chrome/' tapi BUKAN EdgA, SamsungBrowser, OPR, atau Firefox
            const isChromeAndroid = /Chrome\//.test(ua) &&
                !/EdgA\//.test(ua) &&
                !/SamsungBrowser\//.test(ua) &&
                !/OPR\//.test(ua) &&
                !/Firefox\//.test(ua);

            if (!isChromeAndroid) {
                setAccessStatus("wrong-browser");
                return;
            }
        } else if (isIOS) {
            // iOS: Hanya izinkan Safari asli
            // Safari iOS: mengandung 'Safari/' tapi BUKAN CriOS (Chrome iOS), FxiOS (Firefox iOS), EdgiOS (Edge iOS)
            const isSafariIOS = /Safari\//.test(ua) &&
                !/CriOS\//.test(ua) &&
                !/FxiOS\//.test(ua) &&
                !/EdgiOS\//.test(ua) &&
                !/OPiOS\//.test(ua);

            if (!isSafariIOS) {
                setAccessStatus("wrong-browser");
                return;
            }
        }

        // Perangkat Mobile Asli dengan browser yang benar
        setAccessStatus("allowed");
    }, []);

    // Pengecekan ketersediaan kamera
    const [cameraStatus, setCameraStatus] = useState<"checking" | "allowed" | "no-camera" | "denied">("checking");

    useEffect(() => {
        const checkCamera = async () => {
            if (companies.length === 0) return;
            const company = companies[0];
            if (company.requireChecklistPhoto === false) {
                setCameraStatus("allowed");
                return;
            }
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraStatus("no-camera");
                return;
            }
            const tryStream = async (constraints: MediaStreamConstraints): Promise<boolean> => {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(constraints);
                    stream.getTracks().forEach(t => t.stop());
                    return true;
                } catch {
                    return false;
                }
            };
            try {
                const stage1 = await tryStream({ video: { facingMode: "environment" } });
                if (stage1) {
                    setCameraStatus("allowed");
                    return;
                }
                const stage2 = await tryStream({ video: true });
                if (stage2) {
                    setCameraStatus("allowed");
                    return;
                }
                throw new Error("camera_unavailable");
            } catch (err: any) {
                const errorName = err?.name || "";
                if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
                    setCameraStatus("denied");
                } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
                    setCameraStatus("no-camera");
                } else {
                    setCameraStatus("allowed");
                }
            }
        };
        checkCamera();
    }, [companies]);

    useEffect(() => {
        const checkShift = () => {
            const now = new Date();
            const active = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");

            if (active) {
                const diffMs = new Date(active.endTime).getTime() - now.getTime();
                const diffSec = diffMs / 1000;

                if (diffSec <= 0) {
                    setIsShiftExpired(true);
                    // Set default new end time (e.g. 1 hour from now)
                    if (!newEndTime) {
                        const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
                        setNewEndTime(nextHour.toTimeString().slice(0, 5));
                    }
                } else {
                    setIsShiftExpired(false);
                }
            } else {
                setIsShiftExpired(false);
            }
        };

        checkShift();
        const timer = setInterval(checkShift, 60000);
        return () => clearInterval(timer);
    }, [operatorShifts, user?.uid, newEndTime]);

    const handleExtendShift = async () => {
        const active = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");
        if (!active || !newEndTime) return;

        setIsUpdatingShift(true);
        try {
            const [hours, minutes] = newEndTime.split(":").map(Number);
            const endDate = new Date();
            endDate.setHours(hours, minutes, 0, 0);

            if (endDate <= new Date()) {
                alert("Jam baru harus lebih dari waktu sekarang.");
                return;
            }

            await updateShift(active.id, { endTime: endDate.toISOString() });
            setIsShiftExpired(false);
            setNewEndTime("");
            addLog({
                type: "AUTH",
                toValue: "Perpanjang Shift",
                operatorName: user?.name || "Operator",
                companyId: user?.companyId || "",
                notes: `Shift diperpanjang hingga: ${newEndTime}`
            });
        } catch (err) {
            console.error("Gagal perpanjang shift:", err);
            alert("Gagal memperbarui shift.");
        } finally {
            setIsUpdatingShift(false);
        }
    };

    const handleLogout = async () => {
        // Guard: Jika shift masih aktif tapi handleLogout terpanggil (e.g. bypass), jangan izinkan.
        // User maunya "sadar" mengakhiri shift dulu.
        const activeShift = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");
        if (activeShift) return;

        addLog({
            type: "AUTH",
            toValue: "Logout",
            operatorName: user?.name || user?.email || "Unknown",
            companyId: user?.companyId || "",
            notes: "Role: OPERATOR"
        });
        logout();
        router.push("/login");
    };

    // --- Lapisan Proteksi: Browser Tidak Didukung ---
    if (accessStatus === "wrong-browser") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-blue-100 overflow-hidden">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 px-6 pt-10 pb-12 text-center text-white">
                            <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Smartphone className="w-9 h-9 text-white" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight text-white uppercase">Browser Tidak Didukung</h1>
                            <p className="text-sm text-blue-100 mt-2 leading-relaxed font-medium">
                                Aplikasi ini hanya dapat dibuka menggunakan browser resmi yang didukung.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <p className="text-[11px] font-black text-gray-500 uppercase tracking-widest text-center">Gunakan browser berikut:</p>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-2xl border-2 border-green-200">
                                    <span className="text-3xl">🤖</span>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-green-800 uppercase">Android</p>
                                        <p className="text-sm font-black text-green-600">Chrome</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-2xl border-2 border-blue-200">
                                    <span className="text-3xl">🍎</span>
                                    <div className="text-center">
                                        <p className="text-xs font-black text-blue-800 uppercase">iPhone / iPad</p>
                                        <p className="text-sm font-black text-green-600">Safari</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-3">
                                <p className="text-[10px] text-amber-700 font-bold leading-relaxed text-center">
                                    Browser lain (Firefox, Samsung Internet, Opera, dll.) tidak didukung untuk memastikan fitur kamera berjalan dengan optimal.
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-1.5 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all active:scale-95"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Keluar Aplikasi
                            </button>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    // --- Lapisan Proteksi: Desktop & Emulator ---
    if (accessStatus === "desktop") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">
                        <div className="bg-gray-900 px-6 pt-10 pb-12 text-center text-white">
                            <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CameraOff className="w-9 h-9 text-gray-400" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight text-white">Perangkat Tidak Didukung</h1>
                            <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                                Aplikasi Operator hanya dapat digunakan melalui <span className="text-white font-bold">HP atau Tablet</span>.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Perangkat yang Diizinkan</p>
                                <div className="space-y-1.5">
                                    {["📱 HP Android", "🍎 iPhone (iOS)", "📲 iPad"].map(item => (
                                        <div key={item} className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                            <p className="text-xs text-amber-800 font-medium">{item}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
                                <p className="text-[10px] text-gray-500 leading-relaxed text-center">
                                    Kebijakan ini diterapkan untuk memastikan laporan aset dilakukan secara fisik di lokasi.
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-1.5 py-3 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition-all active:scale-95"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Keluar Aplikasi
                            </button>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    if (accessStatus === "emulator") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-rose-50 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden">
                        <div className="bg-rose-600 px-6 pt-10 pb-12 text-center text-white">
                            <div className="w-20 h-20 bg-white/10 border border-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <ShieldAlert className="w-9 h-9 text-white" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight text-white uppercase">Emulator Terdeteksi!</h1>
                            <p className="text-sm text-rose-100 mt-2 leading-relaxed font-medium">
                                Anda terdeteksi menggunakan <span className="text-white font-bold">Simulator Browser</span>.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4">
                            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                                <p className="text-xs text-rose-800 font-bold leading-relaxed text-center">
                                    Demi validitas data, dilarang melakukan inspeksi melalui komputer yang memanipulasi tampilan HP. Gunakan perangkat fisik asli.
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full py-3 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all active:scale-95 shadow-lg shadow-rose-200"
                            >
                                Keluar & Gunakan HP Asli
                            </button>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    // --- Layar Loading / Pengecekan Awal ---
    if (accessStatus === "checking" || cameraStatus === "checking") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                    <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-brand-purple/10 rounded-full flex items-center justify-center mx-auto animate-bounce">
                            <Camera className="w-8 h-8 text-brand-purple" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-700 uppercase tracking-widest">Validasi Perangkat</p>
                            <p className="text-xs text-gray-400">Sedang memeriksa otentikasi hardware...</p>
                        </div>
                    </div>
                </div>
            </ProtectedRoute>
        );
    }

    // --- Layar Blokir: Tidak Ada Kamera ---
    if (cameraStatus === "no-camera") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-gray-800 px-6 pt-8 pb-10 text-center text-white">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CameraOff className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight">Tidak Ada Kamera Terdeteksi</h1>
                            <p className="text-sm text-gray-300 mt-2 leading-relaxed">
                                Harap login menggunakan device yang dilengkapi kamera.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4 -mt-4">
                            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4">
                                <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-1">Device yang Diizinkan</p>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                    Gunakan <span className="font-bold">HP Android, iPhone, atau iPad</span> yang memiliki kamera untuk mengakses aplikasi ini.
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all active:scale-95"
                            >
                                <LogOut className="w-3.5 h-3.5" />
                                Keluar dari Aplikasi
                            </button>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-6 text-center">
                        Studio Aset • Keamanan Data Wajib Menggunakan Kamera
                    </p>
                </div>
            </ProtectedRoute>
        );
    }

    // --- Layar Blokir: Izin Kamera Ditolak ---
    if (cameraStatus === "denied") {
        return (
            <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
                <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
                    <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="bg-rose-500 px-6 pt-8 pb-10 text-center text-white">
                            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CameraOff className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-lg font-black tracking-tight">Akses Kamera Ditolak</h1>
                            <p className="text-sm text-rose-100 mt-1 leading-relaxed">
                                Anda memblokir izin kamera. Aplikasi tidak dapat berfungsi.
                            </p>
                        </div>
                        <div className="px-6 py-6 space-y-4 -mt-4">
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-2">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Cara Mengizinkan Kamera</p>
                                <div className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-black text-rose-500">1</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">Buka pengaturan browser Anda dan izinkan akses kamera untuk situs ini.</p>
                                </div>
                                <div className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-[10px] font-black text-rose-500">2</span>
                                    </div>
                                    <p className="text-xs text-gray-600 leading-relaxed">Setelah diizinkan, tekan tombol <span className="font-bold text-gray-900">"Coba Lagi"</span> di bawah ini.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center justify-center gap-1.5 py-3 bg-brand-purple text-white rounded-xl text-xs font-bold hover:bg-brand-purple/90 transition-all active:scale-95"
                                >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                    Coba Lagi
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center justify-center gap-1.5 py-3 bg-gray-100 text-gray-600 rounded-xl text-xs font-bold hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Keluar
                                </button>
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-6 text-center">
                        Studio Aset • Keamanan Data Wajib Menggunakan Kamera
                    </p>
                </div>
            </ProtectedRoute>
        );
    }

    // --- Tampilan Normal (Kamera Tersedia & Diizinkan) ---
    return (
        <ProtectedRoute allowedRoles={["OPERATOR", "CLIENT_OPERATOR"]}>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <ChangePasswordModal
                    isOpen={isPasswordModalOpen || (user?.role !== 'SUPER_ADMIN' && user?.needsPasswordChange === true)}
                    onClose={() => setIsPasswordModalOpen(false)}
                    preventClose={user?.role !== 'SUPER_ADMIN' && user?.needsPasswordChange === true}
                />

                {/* Mobile Header / Topbar */}
                <header className="fixed top-0 inset-x-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 h-16 flex items-center justify-between px-4 shadow-sm">


                    <button
                        onClick={() => setIsPasswordModalOpen(true)}
                        className="flex items-center gap-2 hover:bg-gray-50 p-1 rounded-xl transition-colors text-left"
                    >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-brand-blue to-brand-purple flex items-center justify-center text-white font-bold shrink-0">
                            {user?.name?.charAt(0).toUpperCase() || "O"}
                        </div>
                        <div className="truncate">
                            <p className="text-sm font-bold text-gray-900 leading-tight">Studio Ops</p>
                            <p className="text-[10px] text-brand-purple font-bold leading-tight truncate max-w-[120px] flex items-center gap-1">
                                {user?.name || "Operator"}
                                {user?.locationName && <span className="opacity-70 font-normal">({user.locationName})</span>}
                                <Key className="w-2.5 h-2.5" />
                            </p>
                        </div>
                    </button>

                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                        title="Keluar"
                    >
                        <LogOut className="w-5 h-5 ml-1" />
                    </button>
                </header>

                {/* Main Content Area (Mobile First padding) */}
                <main className="flex-1 px-4 pt-20 pb-8 w-full max-w-md mx-auto relative">
                    {children}
                </main>

                {/* --- Premium Logout Confirmation Modal --- */}
                <AnimatePresence>
                    {isLogoutModalOpen && (() => {
                        const activeShift = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");

                        return (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                                />

                                {/* Modal Card */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                    className="relative w-full max-w-xs bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-100"
                                >
                                    <div className="p-8 text-center">
                                        {activeShift ? (
                                            <>
                                                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-500">
                                                    <Lock className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Shift Masih Aktif</h3>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                                    Anda belum mengakhiri shift tugas hari ini. Silakan <span className="font-bold text-amber-600">Akhiri Shift</span> di dashboard utama terlebih dahulu sebelum keluar demi akurasi laporan.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-500">
                                                    <AlertTriangle className="w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">Konfirmasi Keluar</h3>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed">
                                                    Apakah Anda yakin ingin mengakhiri sesi dan keluar dari aplikasi?
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2 p-6 bg-gray-50/50 pt-0">
                                        {activeShift ? (
                                            <button
                                                onClick={() => {
                                                    setIsLogoutModalOpen(false);
                                                    router.push("/operator");
                                                }}
                                                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-200 transition-all active:scale-[0.98]"
                                            >
                                                Kembali ke Dashboard
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleLogout}
                                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200 transition-all active:scale-[0.98]"
                                            >
                                                Ya, Keluar Sekarang
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setIsLogoutModalOpen(false)}
                                            className="w-full py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:bg-gray-50 transition-all active:scale-[0.98]"
                                        >
                                            {activeShift ? "Tutup" : "Batal"}
                                        </button>
                                    </div>
                                </motion.div>
                            </div>
                        );
                    })()}
                </AnimatePresence>

                {/* --- Shift Expired Blocking Overlay --- */}
                <AnimatePresence>
                    {isShiftExpired && (
                        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 sm:p-10">
                            {/* Backdrop - More intense blur for blocking */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-gray-950/80 backdrop-blur-md"
                            />

                            {/* Blocking Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 30 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 30 }}
                                className="relative w-full max-w-sm bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white/20"
                            >
                                <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-8 text-center text-white">
                                    <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                        <Bell className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-xl font-black uppercase tracking-tight">Shift Berakhir!</h2>
                                    <p className="text-sm opacity-90 font-medium leading-relaxed mt-1">
                                        Waktu tugas Anda telah habis. Selesaikan shift atau perbarui waktu untuk melanjutkan akses.
                                    </p>

                                    {/* Pelanggaran SOP Banner */}
                                    {(() => {
                                        const active = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");
                                        if (active) {
                                            const diffMs = new Date().getTime() - new Date(active.endTime).getTime();
                                            if (diffMs > 1000 * 60) {
                                                const hours = (diffMs / (1000 * 60 * 60)).toFixed(1);
                                                return (
                                                    <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-xl py-2 px-3 border border-white/10">
                                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-200 leading-none mb-1">Audit Pelanggaran</p>
                                                        <p className="text-xs font-bold text-white leading-tight">Terdeteksi Terlambat: {hours} Jam</p>
                                                        <p className="text-[9px] text-white/60 mt-1 italic font-medium">Ini akan tercatat sebagai pelanggaran SOP</p>
                                                    </div>
                                                );
                                            }
                                        }
                                        return null;
                                    })()}
                                </div>

                                <div className="p-8 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Update Jam Selesai:</label>
                                            <div className="relative group/input">
                                                <Clock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within/input:text-amber-500 transition-colors" />
                                                <input
                                                    type="time"
                                                    value={newEndTime}
                                                    onChange={(e) => setNewEndTime(e.target.value)}
                                                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border-2 border-transparent rounded-2xl text-base font-black focus:bg-white focus:border-amber-200 focus:outline-none transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <button
                                            onClick={handleExtendShift}
                                            disabled={isUpdatingShift}
                                            className="w-full flex items-center justify-center gap-2 py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-[1.5rem] text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-100 transition-all active:scale-[0.98]"
                                        >
                                            {isUpdatingShift ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                            Simpan & Lanjutkan
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center">
                                            <div className="w-full border-t border-gray-100"></div>
                                        </div>
                                        <div className="relative flex justify-center text-[10px] uppercase font-black tracking-widest text-gray-300 bg-white px-4">Atau</div>
                                    </div>

                                    <button
                                        onClick={async () => {
                                            const active = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");
                                            if (active) {
                                                const now = new Date();
                                                const endTime = new Date(active.endTime);
                                                const diffMs = now.getTime() - endTime.getTime();

                                                if (confirm("Benar ingin mengakhiri shift sekarang? Pengecekan aset akan terhenti.")) {
                                                    // Jika terlambat signifikan (misal > 1 menit), kirim log audit pelanggaran
                                                    if (diffMs > 1000 * 60) {
                                                        const diffHours = (diffMs / (1000 * 60 * 60)).toFixed(1);
                                                        await addLog({
                                                            type: "AUTH",
                                                            toValue: "SOP Violation",
                                                            operatorName: user?.name || "Operator",
                                                            companyId: user?.companyId || "",
                                                            notes: `SOP VIOLATION: Terlambat mengakhiri shift ${diffHours} jam. (Penyebab: Keluar browser tanpa akhiri shift secara resmi)`
                                                        });
                                                    }

                                                    await endShift(active.id);
                                                    setIsShiftExpired(false);
                                                }
                                            }
                                        }}
                                        className="w-full py-4 bg-gray-900 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] hover:bg-gray-800 transition-all active:scale-[0.98]"
                                    >
                                        Akhiri Shift & Istirahat
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </ProtectedRoute>
    );
}
