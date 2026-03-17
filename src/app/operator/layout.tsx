"use client";

import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { useLocalDb } from "@/context/LocalDbContext";
import { LogOut, Key, Camera, CameraOff, RefreshCw, ShieldAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import ChangePasswordModal from "@/components/ChangePasswordModal";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth();
    const { addLog, operatorShifts, endShift } = useLocalDb();
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const router = useRouter();

    // State baru untuk status akses yang lebih detail
    const [accessStatus, setAccessStatus] = useState<"checking" | "allowed" | "desktop" | "emulator">("checking");

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        const platform = (navigator as any).platform?.toLowerCase() || "";
        
        const isMobileUA = /android|iphone|ipad|ipod|mobile|tablet/i.test(ua);
        // iPad modern terkadang melaporkan sebagai Macintosh (MacIntel), cek via touch
        const isIpadOS = (navigator.maxTouchPoints > 2 && /mac/i.test(ua));
        
        // Deteksi Platform Hardware Asli
        const isDesktopPlatform = /win32|win64|macintel|linux x86_64/i.test(platform);

        if (!isMobileUA && !isIpadOS) {
            // Murni Desktop
            setAccessStatus("desktop");
        } else if (isMobileUA && isDesktopPlatform && !isIpadOS) {
            // User-Agent mengaku Mobile, tapi Platform Hardware tetap Windows/Mac/Linux.
            // Ini adalah indikasi kuat penggunaan "Inspect Element" (Mobile Emulation).
            setAccessStatus("emulator");
        } else {
            // Perangkat Mobile Asli atau iPad
            setAccessStatus("allowed");
        }
    }, []);

    // Pengecekan ketersediaan kamera
    const [cameraStatus, setCameraStatus] = useState<"checking" | "allowed" | "no-camera" | "denied">("checking");

    useEffect(() => {
        const checkCamera = async () => {
            // Jika mediaDevices tidak tersedia = bukan HTTPS atau browser sangat lama
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                setCameraStatus("no-camera");
                return;
            }

            // Helper: Coba buka stream kamera, kembalikan true jika berhasil
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
                // Tahap 1: Coba dengan facingMode "environment" (kamera belakang)
                // Chrome Android mendukung ini dengan baik
                const stage1 = await tryStream({ video: { facingMode: "environment" } });
                if (stage1) {
                    setCameraStatus("allowed");
                    return;
                }

                // Tahap 2: Fallback ke { video: true } untuk Firefox mobile
                // Firefox tidak mendukung facingMode constraint secara langsung
                const stage2 = await tryStream({ video: true });
                if (stage2) {
                    setCameraStatus("allowed");
                    return;
                }

                // Kedua tahap gagal, cek alasannya
                throw new Error("camera_unavailable");

            } catch (err: any) {
                const errorName = err?.name || "";
                if (errorName === "NotAllowedError" || errorName === "PermissionDeniedError") {
                    // Kamera ada tapi izin ditolak user
                    setCameraStatus("denied");
                } else if (errorName === "NotFoundError" || errorName === "DevicesNotFoundError") {
                    // Tidak ada kamera fisik sama sekali
                    setCameraStatus("no-camera");
                } else {
                    // Kamera gagal karena sebab lain (sedang terpakai, dsb.)
                    // Jangan blokir operator, anggap tersedia
                    setCameraStatus("allowed");
                }
            }
        };
        checkCamera();
    }, []);

    const handleLogout = async () => {
        const activeShift = operatorShifts.find(s => s.operatorId === user?.uid && s.status === "ACTIVE");
        if (activeShift) {
            try {
                await endShift(activeShift.id);
            } catch (err) {
                console.error("Gagal mengakhiri shift saat logout:", err);
            }
        }

        addLog({
            type: "AUTH",
            toValue: "Logout",
            operatorName: user?.name || user?.email || "Unknown",
            companyId: user?.companyId || "",
            notes: "Role: OPERATOR (Shift Berakhir Otomatis)"
        });
        logout();
        router.push("/login");
    };

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
                        onClick={handleLogout}
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
            </div>
        </ProtectedRoute>
    );
}
