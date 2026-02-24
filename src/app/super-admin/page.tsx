"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, doc, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { UserPlus, Shield, Users, Trash2, ShieldAlert, Loader2, Mail, User, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface UserData {
    id: string;
    uid: string;
    email: string;
    role: "ADMIN" | "OPERATOR" | "SUPER_ADMIN";
    name: string;
}

export default function UserManagementPage() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "users"));
            const querySnapshot = await getDocs(q);
            const usersList: UserData[] = [];
            querySnapshot.forEach((doc) => {
                usersList.push({ id: doc.id, ...doc.data() } as UserData);
            });
            setUsers(usersList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { role: newRole });
            setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
        } catch (error) {
            alert("Gagal mengubah role");
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-6xl mx-auto">
            <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <Users className="w-6 h-6 text-indigo-600" />
                        Daftar Pengguna
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">Kelola hak akses Admin dan Operator aplikasi.</p>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3 max-w-md">
                    <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                        <span className="font-bold uppercase block mb-1">Catatan Penting:</span>
                        Pendaftaran user baru harus dilakukan secara manual melalu <b>Firebase Authentication</b> terlebih dahulu, kemudian UID-nya didaftarkan ke koleksi <code className="bg-amber-100 px-1 rounded">users</code> di Firestore dengan role yang diinginkan.
                    </p>
                </div>
            </header>

            {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4 text-gray-400">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm font-medium">Bekerja...</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {users.map((userData) => (
                        <div key={userData.id} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    <div className={clsx(
                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                                        userData.role === "SUPER_ADMIN" ? "bg-purple-50 text-purple-600" :
                                            userData.role === "ADMIN" ? "bg-indigo-50 text-indigo-600" : "bg-emerald-50 text-emerald-600"
                                    )}>
                                        {userData.role === "SUPER_ADMIN" ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            {userData.name}
                                            {userData.role === "SUPER_ADMIN" && (
                                                <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-[9px] font-black uppercase rounded">System Owner</span>
                                            )}
                                        </h3>
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-y-1 sm:gap-x-4 mt-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                <Mail className="w-3.5 h-3.5" />
                                                {userData.email}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-gray-300 font-mono">
                                                ID: {userData.id.substring(0, 8)}...
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                    {userData.role !== "SUPER_ADMIN" && (
                                        <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                            <button
                                                onClick={() => handleRoleChange(userData.id, "ADMIN")}
                                                className={clsx(
                                                    "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                    userData.role === "ADMIN"
                                                        ? "bg-white text-indigo-600 shadow-sm"
                                                        : "text-gray-400 hover:text-gray-600"
                                                )}
                                            >
                                                ADMIN
                                            </button>
                                            <button
                                                onClick={() => handleRoleChange(userData.id, "OPERATOR")}
                                                className={clsx(
                                                    "px-3 py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                                    userData.role === "OPERATOR"
                                                        ? "bg-white text-emerald-600 shadow-sm"
                                                        : "text-gray-400 hover:text-gray-600"
                                                )}
                                            >
                                                OPERATOR
                                            </button>
                                        </div>
                                    )}

                                    {userData.role !== "SUPER_ADMIN" && (
                                        <button
                                            className="p-2 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                            onClick={() => {
                                                if (confirm(`Hapus akses untuk ${userData.name}?`)) {
                                                    deleteDoc(doc(db, "users", userData.id)).then(() => fetchUsers());
                                                }
                                            }}
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    )}

                                    {userData.role === "SUPER_ADMIN" && (
                                        <div className="px-4 py-2 bg-purple-50 text-purple-700 text-[10px] font-bold rounded-xl border border-purple-100 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" />
                                            AKSES PENUH
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <footer className="mt-12 pt-8 border-t border-gray-100 text-center">
                <p className="text-[10px] text-gray-400 font-medium uppercase tracking-[0.2em]">Studio Management System v2.0</p>
            </footer>
        </div>
    );
}
