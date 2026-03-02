import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import {
    LogOut,
    BarChart3,
    Users,
    Building2,
    Calendar,
    ShieldAlert,
    Trash2,
    RefreshCw,
    Search,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

interface SystemStats {
    organizations: number;
    employees: number;
    records: number;
}

interface Organization {
    id: string;
    name: string;
    email: string;
    createdAt: string;
}

export function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [isWiping, setIsWiping] = useState(false);

    useEffect(() => {
        const adminToken = localStorage.getItem("adminToken");
        if (!adminToken) {
            navigate("/admin/login-page");
            return;
        }

        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const adminToken = localStorage.getItem("adminToken");

        try {
            const [statsRes, orgsRes] = await Promise.all([
                fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/stats`, {
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }),
                fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/organizations`, {
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                })
            ]);

            if (!statsRes.ok || !orgsRes.ok) throw new Error("Failed to fetch administrative data");

            const statsData = await statsRes.json();
            const orgsData = await orgsRes.json();

            setStats(statsData.stats);
            setOrganizations(orgsData.organizations);
        } catch (error: any) {
            toast.error(error.message);
            if (error.message.includes("Unauthorized")) {
                handleLogout();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleWipeData = async () => {
        if (!confirm("CRITICAL WARNING: This will permanently delete ALL data (Organizations, Employees, and Attendance Records). This action cannot be undone. Proceed?")) {
            return;
        }

        setIsWiping(true);
        const adminToken = localStorage.getItem("adminToken");

        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/wipe`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Wipe operation failed");

            toast.success("System data purged successfully");
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsWiping(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("userType");
        navigate("/admin/login-page");
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-200">
            {/* Admin Header */}
            <header className="bg-[#1e293b] border-b border-[#334155] sticky top-0 z-10 shadow-xl">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-red-500 p-2 rounded-lg">
                            <ShieldAlert className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-tight">System Authority</h1>
                            <p className="text-[10px] text-red-400 font-mono uppercase tracking-widest">Administrator Root Access</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={fetchData}
                            className="border-[#334155] text-slate-300 hover:bg-[#334155]"
                        >
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Sync
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleLogout}
                            className="bg-red-900/40 hover:bg-red-900/60 border border-red-500/30 text-red-200"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Terminate Session
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* System Overview */}
                <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    <Card className="p-6 bg-[#1e293b] border-[#334155] hover:border-blue-500/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Total Organizations</p>
                                <p className="text-4xl font-bold text-white tracking-tighter">
                                    {loading ? "--" : stats?.organizations || 0}
                                </p>
                            </div>
                            <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
                                <Building2 className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-[#1e293b] border-[#334155] hover:border-emerald-500/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Registered Staff</p>
                                <p className="text-4xl font-bold text-white tracking-tighter">
                                    {loading ? "--" : stats?.employees || 0}
                                </p>
                            </div>
                            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20">
                                <Users className="w-8 h-8 text-emerald-500" />
                            </div>
                        </div>
                    </Card>

                    <Card className="p-6 bg-[#1e293b] border-[#334155] hover:border-purple-500/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Total Event Records</p>
                                <p className="text-4xl font-bold text-white tracking-tighter">
                                    {loading ? "--" : stats?.records || 0}
                                </p>
                            </div>
                            <div className="bg-purple-500/10 p-4 rounded-xl border border-purple-500/20">
                                <Calendar className="w-8 h-8 text-purple-500" />
                            </div>
                        </div>
                    </Card>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Organizations Table */}
                    <section className="lg:col-span-2">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-blue-400" />
                                Network Nodes
                            </h2>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    placeholder="Filter orgs..."
                                    className="bg-[#0f172a] border-[#334155] rounded-full pl-9 pr-4 py-1 text-sm focus:ring-1 focus:ring-blue-500 outline-none w-64"
                                />
                            </div>
                        </div>

                        <Card className="bg-[#1e293b] border-[#334155] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[#0f172a]/50 text-slate-400 text-[10px] uppercase tracking-widest border-b border-[#334155]">
                                            <th className="py-4 px-6 font-bold">Organization</th>
                                            <th className="py-4 px-6 font-bold">Registry Email</th>
                                            <th className="py-4 px-6 font-bold">Registered</th>
                                            <th className="py-4 px-6 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-500 italic">Accessing node records...</td></tr>
                                        ) : organizations.length === 0 ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-500 italic">No nodes detected in the network</td></tr>
                                        ) : (
                                            organizations.map((org) => (
                                                <tr key={org.id} className="border-b border-[#334155] hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-4 px-6">
                                                        <span className="font-bold text-white">{org.name}</span>
                                                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">{org.id}</div>
                                                    </td>
                                                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">{org.email}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-400">
                                                        {new Date(org.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4 px-6 text-right">
                                                        <Button variant="ghost" size="sm" className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10">
                                                            Inspect
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </section>

                    {/* Maintenance Section */}
                    <section className="space-y-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
                            <RefreshCw className="w-5 h-5 text-red-500" />
                            Maintenance Console
                        </h2>

                        <Card className="p-6 bg-[#1e293b] border border-red-900/30 bg-gradient-to-b from-red-950/10 to-transparent">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-red-500/20 p-2 rounded-lg border border-red-500/20">
                                    <Trash2 className="w-5 h-5 text-red-500" />
                                </div>
                                <h3 className="font-bold text-white font-mono uppercase tracking-tighter">Atomic Data Purge</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                Deletes all organization data, employee records, and attendance logs across the entire system. Access is logged.
                            </p>
                            <Button
                                variant="destructive"
                                className="w-full bg-red-600 hover:bg-red-700 font-bold tracking-tight text-white py-6 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                onClick={handleWipeData}
                                disabled={isWiping || loading}
                            >
                                {isWiping ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Executing Purge...
                                    </>
                                ) : (
                                    <>
                                        <RefreshCw className="w-4 h-4" />
                                        Reset System Data
                                    </>
                                )}
                            </Button>
                        </Card>

                        <Card className="p-6 bg-[#0f172a] border border-[#334155] font-mono text-[10px]">
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 uppercase tracking-widest font-bold">Status:</span>
                                <span className="text-emerald-400 font-bold uppercase tracking-widest animate-pulse">Online</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 uppercase tracking-widest font-bold">Node ID:</span>
                                <span className="text-slate-300 uppercase tracking-widest font-bold">{projectId}</span>
                            </div>
                            <div className="flex justify-between mb-2">
                                <span className="text-slate-500 uppercase tracking-widest font-bold">Registry:</span>
                                <span className="text-slate-300 uppercase tracking-widest font-bold">KV Store Purged v2.0</span>
                            </div>
                            <div className="mt-4 pt-4 border-t border-[#334155] text-slate-600 italic">
                                Logs are being captured by terminal agent 774b-f3cc.
                            </div>
                        </Card>
                    </section>
                </div>
            </main>
        </div>
    );
}
