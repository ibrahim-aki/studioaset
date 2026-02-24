"use client";

import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import { DoorOpen } from "lucide-react";

export default function OperatorPage() {
    const { user } = useAuth();

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-indigo-900 to-purple-800 rounded-2xl p-6 text-white shadow-xl">
                <h1 className="text-2xl font-bold">Halo, {user?.name || "Operator"}</h1>
                <p className="opacity-90 mt-2 text-sm">Pilih ruangan yang akan dicek kondisinya hari ini.</p>
            </div>

            {/* Button Navigate to Rooms List (To be implemented) */}
            <Link
                href="/operator/rooms"
                className="block bg-white border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow active:scale-95 transform"
            >
                <div className="flex items-center space-x-4">
                    <div className="bg-blue-100 p-4 rounded-full text-blue-600">
                        <DoorOpen className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-900">Mulai Checklist</h2>
                        <p className="text-sm text-gray-500">Pilih dari daftar ruangan</p>
                    </div>
                </div>
            </Link>
        </div>
    );
}
