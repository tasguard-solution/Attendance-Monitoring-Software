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
    Pencil,
    Eye,
    KeyRound,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";

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

interface Employee {
    id: string;
    name: string;
    email: string;
    employeeId: string;
    organizationId: string;
    organizationName: string;
}

export function AdminDashboard() {
    const navigate = useNavigate();
    const [stats, setStats] = useState<SystemStats | null>(null);
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isWiping, setIsWiping] = useState(false);
    const [orgFilter, setOrgFilter] = useState("");
    const [staffOrgFilter, setStaffOrgFilter] = useState("");

    // Edit org dialog
    const [showEditOrgDialog, setShowEditOrgDialog] = useState(false);
    const [editOrg, setEditOrg] = useState<Organization | null>(null);
    const [editOrgName, setEditOrgName] = useState("");
    const [editOrgEmail, setEditOrgEmail] = useState("");
    const [isSavingOrg, setIsSavingOrg] = useState(false);

    // Edit employee dialog
    const [showEditEmployeeDialog, setShowEditEmployeeDialog] = useState(false);
    const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
    const [editEmployeeName, setEditEmployeeName] = useState("");
    const [editEmployeeEmail, setEditEmployeeEmail] = useState("");
    const [isSavingEmployee, setIsSavingEmployee] = useState(false);

    // Inspect org dialog (org + employees)
    const [showInspectDialog, setShowInspectDialog] = useState(false);
    const [inspectOrg, setInspectOrg] = useState<Organization | null>(null);
    const [inspectEmployees, setInspectEmployees] = useState<Employee[]>([]);
    const [inspectLoading, setInspectLoading] = useState(false);

    // Password Reset
    const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
    const [resetPasswordTarget, setResetPasswordTarget] = useState<{ id: string, name: string } | null>(null);
    const [newResetPassword, setNewResetPassword] = useState("");
    const [isResettingPassword, setIsResettingPassword] = useState(false);

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
            const [statsRes, orgsRes, employeesRes] = await Promise.all([
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
                }),
                fetch(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/employees`, {
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }),
            ]);

            if (!statsRes.ok || !orgsRes.ok || !employeesRes.ok) throw new Error("Failed to fetch administrative data");

            const statsData = await statsRes.json();
            const orgsData = await orgsRes.json();
            const employeesData = await employeesRes.json();

            setStats(statsData.stats);
            setOrganizations(orgsData.organizations || []);
            setEmployees(employeesData.employees || []);
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

    const handleDeleteOrganization = async (id: string, name: string) => {
        if (!confirm(`CRITICAL: You are about to permanently DELETE "${name}" and all its associated data (Employees, Branches, Records). This cannot be undone. Proceed?`)) {
            return;
        }

        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/organizations/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }
            );

            if (!response.ok) throw new Error("Deletion failed");

            toast.success(`${name} has been expunged`);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const openEditOrg = (org: Organization) => {
        setEditOrg(org);
        setEditOrgName(org.name);
        setEditOrgEmail(org.email);
        setShowEditOrgDialog(true);
    };

    const handleSaveOrg = async () => {
        if (!editOrg) return;
        setIsSavingOrg(true);
        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/organizations/${editOrg.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ name: editOrgName, email: editOrgEmail }),
                }
            );
            if (!response.ok) throw new Error("Update failed");
            toast.success("Organization updated");
            setShowEditOrgDialog(false);
            if (showInspectDialog && inspectOrg?.id === editOrg.id) {
                setInspectOrg({ ...inspectOrg, name: editOrgName, email: editOrgEmail });
            }
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSavingOrg(false);
        }
    };

    const openEditEmployee = (emp: Employee) => {
        setEditEmployee(emp);
        setEditEmployeeName(emp.name);
        setEditEmployeeEmail(emp.email);
        setShowEditEmployeeDialog(true);
    };

    const handleSaveEmployee = async () => {
        if (!editEmployee) return;
        setIsSavingEmployee(true);
        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/employees/${editEmployee.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ name: editEmployeeName, email: editEmployeeEmail }),
                }
            );
            if (!response.ok) throw new Error("Update failed");
            toast.success("Employee updated");
            setShowEditEmployeeDialog(false);
            fetchData();
            if (showInspectDialog && inspectOrg && editEmployee.organizationId === inspectOrg.id) {
                setInspectEmployees((prev) =>
                    prev.map((e) => (e.id === editEmployee.id ? { ...e, name: editEmployeeName, email: editEmployeeEmail } : e))
                );
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsSavingEmployee(false);
        }
    };

    const handleDeleteEmployee = async (id: string, name: string) => {
        if (!confirm(`Delete employee "${name}"? This will remove their account.`)) return;
        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/employees/${id}`,
                {
                    method: "DELETE",
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }
            );
            if (!response.ok) throw new Error("Deletion failed");
            toast.success("Employee removed");
            fetchData();
            if (showInspectDialog && inspectEmployees.some((e) => e.id === id)) {
                setInspectEmployees((prev) => prev.filter((e) => e.id !== id));
            }
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleInspectOrg = async (org: Organization) => {
        setInspectOrg(org);
        setShowInspectDialog(true);
        setInspectLoading(true);
        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/organizations/${org.id}`,
                {
                    headers: {
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                }
            );
            if (!response.ok) throw new Error("Failed to load");
            const data = await response.json();
            setInspectEmployees(data.employees || []);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setInspectLoading(false);
        }
    };

    const openResetPassword = (id: string, name: string) => {
        setResetPasswordTarget({ id, name });
        setNewResetPassword("");
        setShowResetPasswordDialog(true);
    };

    const handleResetPassword = async () => {
        if (!resetPasswordTarget || !newResetPassword) return;
        if (newResetPassword.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsResettingPassword(true);
        const adminToken = localStorage.getItem("adminToken");
        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/users/${resetPasswordTarget.id}/reset-password`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${publicAnonKey}`,
                        "X-Authorization": `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ password: newResetPassword }),
                }
            );

            if (!response.ok) throw new Error("Password reset failed");
            toast.success(`Password for ${resetPasswordTarget.name} has been updated`);
            setShowResetPasswordDialog(false);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("adminToken");
        localStorage.removeItem("userType");
        navigate("/admin/login-page");
    };

    const filteredOrgs = orgFilter
        ? organizations.filter(
            (o) =>
                o.name.toLowerCase().includes(orgFilter.toLowerCase()) ||
                o.email.toLowerCase().includes(orgFilter.toLowerCase())
        )
        : organizations;

    const filteredEmployees = staffOrgFilter
        ? employees.filter((e) => e.organizationId === staffOrgFilter)
        : employees;

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
                                    value={orgFilter}
                                    onChange={(e) => setOrgFilter(e.target.value)}
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
                                        ) : filteredOrgs.length === 0 ? (
                                            <tr><td colSpan={4} className="py-20 text-center text-slate-500 italic">No nodes detected in the network</td></tr>
                                        ) : (
                                            filteredOrgs.map((org) => (
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
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleInspectOrg(org)}
                                                                className="text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                                                                title="View details & staff"
                                                            >
                                                                <Eye className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEditOrg(org)}
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                                title="Edit name/email"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openResetPassword(org.id, org.name)}
                                                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                                                title="Reset Password"
                                                            >
                                                                <KeyRound className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteOrganization(org.id, org.name)}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </section>

                    {/* Staff Table - full width row */}
                    <section className="lg:col-span-3">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Users className="w-5 h-5 text-emerald-400" />
                                Staff Registry
                            </h2>
                            <select
                                value={staffOrgFilter}
                                onChange={(e) => setStaffOrgFilter(e.target.value)}
                                className="bg-[#0f172a] border border-[#334155] rounded-lg px-3 py-2 text-sm text-slate-300 focus:ring-1 focus:ring-blue-500 outline-none"
                            >
                                <option value="">All organizations</option>
                                {organizations.map((o) => (
                                    <option key={o.id} value={o.id}>{o.name}</option>
                                ))}
                            </select>
                        </div>
                        <Card className="bg-[#1e293b] border-[#334155] overflow-hidden shadow-2xl">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-[#0f172a]/50 text-slate-400 text-[10px] uppercase tracking-widest border-b border-[#334155]">
                                            <th className="py-4 px-6 font-bold">Name</th>
                                            <th className="py-4 px-6 font-bold">Employee ID</th>
                                            <th className="py-4 px-6 font-bold">Email</th>
                                            <th className="py-4 px-6 font-bold">Organization</th>
                                            <th className="py-4 px-6 font-bold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic">Loading...</td></tr>
                                        ) : filteredEmployees.length === 0 ? (
                                            <tr><td colSpan={5} className="py-20 text-center text-slate-500 italic">No staff records</td></tr>
                                        ) : (
                                            filteredEmployees.map((emp) => (
                                                <tr key={emp.id} className="border-b border-[#334155] hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-4 px-6 font-medium text-white">{emp.name}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">{emp.employeeId}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">{emp.email}</td>
                                                    <td className="py-4 px-6 text-sm text-slate-400">{emp.organizationName}</td>
                                                    <td className="py-4 px-6 text-right">
                                                        <div className="flex justify-end gap-2">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openEditEmployee(emp)}
                                                                className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                                                                title="Edit Profile"
                                                            >
                                                                <Pencil className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openResetPassword(emp.id, emp.name)}
                                                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-400/10"
                                                                title="Reset Password"
                                                            >
                                                                <KeyRound className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
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

            {/* Edit Organization Dialog */}
            <Dialog open={showEditOrgDialog} onOpenChange={setShowEditOrgDialog}>
                <DialogContent className="sm:max-w-md bg-[#1e293b] border-[#334155] text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Organization</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update organization name and email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <input
                                type="text"
                                value={editOrgName}
                                onChange={(e) => setEditOrgName(e.target.value)}
                                className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={editOrgEmail}
                                onChange={(e) => setEditOrgEmail(e.target.value)}
                                className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEditOrgDialog(false)} className="border-[#334155]">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveOrg} disabled={isSavingOrg} className="bg-blue-600 hover:bg-blue-700">
                            {isSavingOrg ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Employee Dialog */}
            <Dialog open={showEditEmployeeDialog} onOpenChange={setShowEditEmployeeDialog}>
                <DialogContent className="sm:max-w-md bg-[#1e293b] border-[#334155] text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Edit Employee</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Update employee name and email.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Name</label>
                            <input
                                type="text"
                                value={editEmployeeName}
                                onChange={(e) => setEditEmployeeName(e.target.value)}
                                className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Email</label>
                            <input
                                type="email"
                                value={editEmployeeEmail}
                                onChange={(e) => setEditEmployeeEmail(e.target.value)}
                                className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-white focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowEditEmployeeDialog(false)} className="border-[#334155]">
                            Cancel
                        </Button>
                        <Button onClick={handleSaveEmployee} disabled={isSavingEmployee} className="bg-blue-600 hover:bg-blue-700">
                            {isSavingEmployee ? "Saving..." : "Save"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Inspect Organization Dialog */}
            <Dialog open={showInspectDialog} onOpenChange={setShowInspectDialog}>
                <DialogContent className="sm:max-w-lg bg-[#1e293b] border-[#334155] text-slate-200 max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-white flex items-center justify-between">
                            <span>{inspectOrg?.name || "Organization"}</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => inspectOrg && openEditOrg(inspectOrg)}
                                className="text-blue-400 hover:text-blue-300"
                            >
                                <Pencil className="w-4 h-4 mr-1" />
                                Edit
                            </Button>
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            {inspectOrg?.email} · ID: {inspectOrg?.id}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-auto py-4">
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">Staff ({inspectEmployees.length})</h4>
                        {inspectLoading ? (
                            <p className="text-slate-500 italic">Loading...</p>
                        ) : inspectEmployees.length === 0 ? (
                            <p className="text-slate-500 italic">No employees</p>
                        ) : (
                            <div className="space-y-2">
                                {inspectEmployees.map((emp) => (
                                    <div
                                        key={emp.id}
                                        className="flex items-center justify-between rounded-lg border border-[#334155] bg-[#0f172a]/50 px-4 py-3"
                                    >
                                        <div>
                                            <span className="font-medium text-white">{emp.name}</span>
                                            <span className="text-slate-500 font-mono text-sm ml-2">#{emp.employeeId}</span>
                                            <div className="text-xs text-slate-400">{emp.email}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openEditEmployee(emp)}
                                                className="text-blue-400 hover:bg-blue-400/10 h-8"
                                                title="Edit Profile"
                                            >
                                                <Pencil className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => openResetPassword(emp.id, emp.name)}
                                                className="text-amber-400 hover:bg-amber-400/10 h-8"
                                                title="Reset Password"
                                            >
                                                <KeyRound className="w-3 h-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                                                className="text-red-400 hover:bg-red-400/10 h-8"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Password Reset Dialog */}
            <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
                <DialogContent className="sm:max-w-md bg-[#1e293b] border-[#334155] text-slate-200">
                    <DialogHeader>
                        <DialogTitle className="text-white">Manual Password Override</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Setting a new password for <span className="text-amber-400 font-bold">{resetPasswordTarget?.name}</span>.
                            This will take effect immediately.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Credentials</label>
                            <input
                                type="text"
                                value={newResetPassword}
                                onChange={(e) => setNewResetPassword(e.target.value)}
                                placeholder="Min. 6 alphanumeric"
                                className="w-full rounded-md border border-[#334155] bg-[#0f172a] px-3 py-2 text-white focus:ring-1 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)} className="border-[#334155]">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleResetPassword}
                            disabled={isResettingPassword || !newResetPassword}
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                        >
                            {isResettingPassword ? "Executing Reset..." : "Force Update"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
