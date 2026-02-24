"use client";

import { useAuth, UserRole } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Loader2 } from "lucide-react";

export default function ProtectedRoute({
    children,
    allowedRoles,
}: {
    children: ReactNode;
    allowedRoles?: UserRole[];
}) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!user) {
                // Redirection if not logged in
                router.replace("/login");
            } else if (allowedRoles && (!user.role || !allowedRoles.includes(user.role))) {
                // If the user is a SUPER_ADMIN, they are allowed to see ADMIN pages
                if (user.role === "SUPER_ADMIN" && allowedRoles.includes("ADMIN")) {
                    return; // Allow access
                }

                // Redirection if doesn't have required role
                if (user.role === "SUPER_ADMIN") {
                    router.replace("/super-admin");
                } else if (user.role === "ADMIN") {
                    router.replace("/admin");
                } else if (user.role === "OPERATOR") {
                    router.replace("/operator");
                } else {
                    router.replace("/login");
                }
            }
        }
    }, [user, loading, router, allowedRoles]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
            </div>
        );
    }

    // Double check condition before rendering
    const isSuperAdminAccessingAdmin = user?.role === "SUPER_ADMIN" && allowedRoles?.includes("ADMIN");
    const hasAccess = !allowedRoles || (user?.role && allowedRoles.includes(user.role)) || isSuperAdminAccessingAdmin;

    if (!user || !hasAccess) {
        return null; // Will be redirected by useEffect
    }

    return <>{children}</>;
}
