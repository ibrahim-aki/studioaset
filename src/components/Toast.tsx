"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";
import clsx from "clsx";

export function ToastContainer({ children }: { children: React.ReactNode }) {
    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 pointer-events-none">
            <div className="flex flex-col gap-3 max-w-sm w-full pointer-events-none">
                {children}
            </div>
        </div>
    );
}

interface ToastProps {
    message: string;
    type: "success" | "error" | "info" | "warning";
    onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
    const [isClosing, setIsClosing] = useState(false);

    const icons = {
        success: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
        error: <AlertCircle className="w-5 h-5 text-rose-500" />,
        info: <Info className="w-5 h-5 text-indigo-500" />,
        warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    };

    const borders = {
        success: "border-emerald-100/50",
        error: "border-rose-100/50",
        info: "border-indigo-100/50",
        warning: "border-amber-100/50",
    };

    const backgrounds = {
        success: "bg-white/90 backdrop-blur-lg shadow-emerald-500/10",
        error: "bg-white/90 backdrop-blur-lg shadow-rose-500/10",
        info: "bg-white/90 backdrop-blur-lg shadow-indigo-500/10",
        warning: "bg-white/90 backdrop-blur-lg shadow-amber-500/10",
    };

    return (
        <div
            className={clsx(
                "pointer-events-auto flex items-start gap-4 p-5 rounded-3xl border shadow-2xl transition-all duration-300 transform",
                backgrounds[type],
                borders[type],
                isClosing ? "opacity-0 scale-90 translate-y-4" : "opacity-100 scale-100 translate-y-0 animate-in zoom-in-95 fade-in duration-300"
            )}
        >
            <div className="shrink-0 mt-0.5">
                {icons[type]}
            </div>
            <div className="flex-1">
                <p className="text-sm font-bold text-gray-900 leading-relaxed">
                    {message}
                </p>
            </div>
            <button
                onClick={() => {
                    setIsClosing(true);
                    setTimeout(onClose, 300);
                }}
                className="shrink-0 p-1.5 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            >
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}
