"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "../layout/Sidebar";
import { useAuth } from "@/context/AuthContext";
import { dashboardService } from "@/lib/services/dashboardService";

type DashboardLayoutProps = {
    children: React.ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
    const { user } = useAuth();
    const [hasDashboards, setHasDashboards] = useState<boolean | null>(null);

    useEffect(() => {
        let mounted = true;
        const checkDashboards = async () => {
            try {
                const empresaId = (user as any)?.empresa_id || (user as any)?.empresaId;
                if (!empresaId) {
                    if (mounted) setHasDashboards(true);
                    return;
                }
                const dashboards = await dashboardService.listByEmpresa(Number(empresaId));
                if (mounted) setHasDashboards(Boolean(dashboards && dashboards.length > 0));
            } catch {
                if (mounted) setHasDashboards(false);
            }
        };
        if (user) checkDashboards();
        return () => { mounted = false; };
    }, [user]);

    return (
        <div className="flex w-full min-h-screen bg-muted/40">
            <Sidebar />
            <main className="flex-1 p-4 md:p-8 print:p-0">
                {children}
            </main>
        </div>
    );
};

export default DashboardLayout;