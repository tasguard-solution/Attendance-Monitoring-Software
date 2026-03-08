import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import {
  LogOut,
  QrCode,
  Users,
  Clock,
  Download,
  Calendar,
  Plus,
  MapPin,
  Building2,
  Pencil,
  Trash2,
  KeyRound,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { MapPicker } from "./MapPicker";

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  timestamp: string;
  latitude: number;
  longitude: number;
  branchId?: string;
  branchName?: string;
}

interface Branch {
  id: string;
  name: string;
  qrCode: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
}

export function OrgDashboard() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [showCreateBranchDialog, setShowCreateBranchDialog] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchAddress, setNewBranchAddress] = useState("");
  const [newBranchLat, setNewBranchLat] = useState<number>(0);
  const [newBranchLng, setNewBranchLng] = useState<number>(0);
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);
  const [orgId, setOrgId] = useState("");

  // Edit branch state
  const [showEditBranchDialog, setShowEditBranchDialog] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [editBranchName, setEditBranchName] = useState("");
  const [editBranchAddress, setEditBranchAddress] = useState("");
  const [editBranchLat, setEditBranchLat] = useState<number>(0);
  const [editBranchLng, setEditBranchLng] = useState<number>(0);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [isDeletingBranch, setIsDeletingBranch] = useState(false);

  // Staff management state
  const [showEditEmployeeDialog, setShowEditEmployeeDialog] = useState(false);
  const [editEmployee, setEditEmployee] = useState<any | null>(null);
  const [editEmployeeName, setEditEmployeeName] = useState("");
  const [editEmployeeEmail, setEditEmployeeEmail] = useState("");
  const [isSavingEmployee, setIsSavingEmployee] = useState(false);
  const [isDeletingEmployee, setIsDeletingEmployee] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetPasswordEmployee, setResetPasswordEmployee] = useState<any | null>(null);
  const [newEmployeePassword, setNewEmployeePassword] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // Branch filter for attendance log ("" = all branches)
  const [attendanceBranchFilter, setAttendanceBranchFilter] = useState<string>("");

  // Map default position state
  const [defaultLatLng, setDefaultLatLng] = useState<[number, number]>([0, 0]);
  const [geoReady, setGeoReady] = useState(false);

  // Get user's current location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setDefaultLatLng([pos.coords.latitude, pos.coords.longitude]);
          setNewBranchLat(pos.coords.latitude);
          setNewBranchLng(pos.coords.longitude);
          setGeoReady(true);
        },
        () => {
          // Fallback: Lagos, Nigeria
          setDefaultLatLng([6.5244, 3.3792]);
          setNewBranchLat(6.5244);
          setNewBranchLng(3.3792);
          setGeoReady(true);
        }
      );
    } else {
      setDefaultLatLng([6.5244, 3.3792]);
      setNewBranchLat(6.5244);
      setNewBranchLng(3.3792);
      setGeoReady(true);
    }
  }, []);

  const attendanceFilterInitialized = useRef(false);
  const attendanceBranchFilterRef = useRef(attendanceBranchFilter);
  attendanceBranchFilterRef.current = attendanceBranchFilter;

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/org/login");
      return;
    }

    fetchOrgInfo();
    fetchBranches();
    fetchEmployees();
    fetchAttendanceRecords();

    // Refresh records every 30 seconds (use ref so current filter is used)
    const interval = setInterval(() => {
      fetchAttendanceRecords(attendanceBranchFilterRef.current || undefined);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Refetch attendance when branch filter changes (skip first run to avoid double fetch on mount)
  useEffect(() => {
    if (!attendanceFilterInitialized.current) {
      attendanceFilterInitialized.current = true;
      return;
    }
    setLoading(true);
    fetchAttendanceRecords(attendanceBranchFilter || undefined);
  }, [attendanceBranchFilter]);

  const fetchOrgInfo = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const { data, error } = await supabase.auth.getUser(token!);
      if (data?.user) {
        setOrgId(data.user.id);
      }
    } catch (error) {
      console.error("Error fetching org info:", error);
    }
  };

  const fetchBranches = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/branches`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setBranches(data.branches || []);
      }
    } catch (error) {
      console.error("Error fetching branches:", error);
    }
  };

  const createBranch = async () => {
    if (!newBranchName) return;
    setIsCreatingBranch(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/branches`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: newBranchName,
            address: newBranchAddress,
            latitude: newBranchLat,
            longitude: newBranchLng,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("Branch created successfully");
        setBranches([...branches, data.branch]);
        setShowCreateBranchDialog(false);
        setNewBranchName("");
        setNewBranchAddress("");
        setNewBranchLat(defaultLatLng[0]);
        setNewBranchLng(defaultLatLng[1]);
      } else {
        toast.error(data.error || "Failed to create branch");
      }
    } catch (error) {
      console.error("Error creating branch:", error);
      toast.error("Failed to create branch");
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const openEditBranch = (branch: Branch) => {
    setEditBranch(branch);
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address || "");
    setEditBranchLat(branch.latitude ?? defaultLatLng[0]);
    setEditBranchLng(branch.longitude ?? defaultLatLng[1]);
    setShowEditBranchDialog(true);
  };

  const saveBranch = async () => {
    if (!editBranch || !editBranchName) return;
    setIsSavingBranch(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/branches/${editBranch.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editBranchName,
            address: editBranchAddress,
            latitude: editBranchLat,
            longitude: editBranchLng,
          }),
        }
      );

      const data = await response.json();
      if (response.ok) {
        toast.success("Branch updated successfully");
        setBranches(branches.map((b) => (b.id === editBranch.id ? data.branch : b)));
        setShowEditBranchDialog(false);
      } else {
        toast.error(data.error || "Failed to update branch");
      }
    } catch (error) {
      console.error("Error updating branch:", error);
      toast.error("Failed to update branch");
    } finally {
      setIsSavingBranch(false);
    }
  };

  const showBranchQr = async (branch: Branch) => {
    setSelectedBranch(branch);
    try {
      const url = await QRCode.toDataURL(branch.qrCode, {
        width: 300,
        margin: 2,
      });
      setQrCodeUrl(url);
      setShowQrDialog(true);
    } catch (error) {
      console.error("Error generating QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const fetchEmployees = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/employees`,
        {
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) return;
        if (data.error) console.error("Fetch employees error:", data.error);
        return;
      }

      setEmployees(data.employees || []);
    } catch (error: any) {
      if (error && error.message) {
        console.error("Fetch employees error:", error.message);
      }
    }
  };

  const openResetPassword = (emp: any) => {
    setResetPasswordEmployee(emp);
    setNewEmployeePassword("");
    setShowResetPasswordDialog(true);
  };

  const handleResetPassword = async () => {
    if (!resetPasswordEmployee || !newEmployeePassword) return;
    if (newEmployeePassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setIsResettingPassword(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/employees/${resetPasswordEmployee.id}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ password: newEmployeePassword }),
        }
      );

      if (response.ok) {
        toast.success(`Password reset for ${resetPasswordEmployee.name}`);
        setShowResetPasswordDialog(false);
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reset password");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      toast.error("Failed to reset password");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const openEditEmployee = (emp: any) => {
    setEditEmployee(emp);
    setEditEmployeeName(emp.name);
    setEditEmployeeEmail(emp.email);
    setShowEditEmployeeDialog(true);
  };

  const saveEmployee = async () => {
    if (!editEmployee || !editEmployeeName) return;
    setIsSavingEmployee(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/employees/${editEmployee.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editEmployeeName,
            email: editEmployeeEmail,
          }),
        }
      );

      let data;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Server response was not JSON:", responseText);
        throw new Error(`Server returned status ${response.status}: ${responseText}`);
      }

      if (response.ok) {
        toast.success("Employee updated successfully");
        setEmployees(employees.map((e) => (e.id === editEmployee.id ? { ...e, name: editEmployeeName, email: editEmployeeEmail } : e)));
        setShowEditEmployeeDialog(false);
      } else {
        console.error("Update failed:", data);
        toast.error(data.error || `Update failed: ${response.status}`);
      }
    } catch (error) {
      console.error("Error updating employee:", error);
      toast.error("Failed to update employee");
    } finally {
      setIsSavingEmployee(false);
    }
  };

  const deleteEmployee = async (id: string) => {
    if (!confirm("Are you sure you want to delete this employee? This will also disconnect their account from your organization.")) return;
    setIsDeletingEmployee(true);
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/org/employees/${id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        toast.success("Employee deleted successfully");
        setEmployees(employees.filter((e) => e.id !== id));
      } else {
        let data;
        try {
          data = await response.json();
          toast.error(data.error || "Failed to delete employee");
        } catch (e) {
          toast.error(`Deletion failed: ${response.status}`);
        }
      }
    } catch (error) {
      console.error("Error deleting employee:", error);
      toast.error("Failed to delete employee");
    } finally {
      setIsDeletingEmployee(false);
    }
  };

  const fetchAttendanceRecords = async (branchIdFilter?: string) => {
    const token = localStorage.getItem("accessToken");
    const url = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/attendance/records`);
    if (branchIdFilter) url.searchParams.set("branchId", branchIdFilter);
    try {
      const response = await fetch(url.toString(), {
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${publicAnonKey}`,
          "X-Authorization": `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          setLoading(false);
          return;
        }
        if (data.error) {
          console.error("Fetch records error:", data.error);
        }
        setLoading(false);
        return;
      }

      setRecords(data.records || []);
    } catch (error: any) {
      if (error && error.message) {
        console.error("Fetch records error:", error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userType");
    navigate("/org/login");
    toast.success("Logged out successfully");
  };

  const downloadQrCode = () => {
    const link = document.createElement("a");
    link.download = `qr-${selectedBranch?.name || 'branch'}.png`;
    link.href = qrCodeUrl;
    link.click();
  };

  // Group records by employee
  const employeeStats = records.reduce((acc, record) => {
    if (!acc[record.employeeId]) {
      acc[record.employeeId] = {
        name: record.employeeName,
        number: record.employeeNumber,
        count: 0,
        lastClockIn: record.timestamp,
      };
    }
    acc[record.employeeId].count++;
    if (new Date(record.timestamp) > new Date(acc[record.employeeId].lastClockIn)) {
      acc[record.employeeId].lastClockIn = record.timestamp;
    }
    return acc;
  }, {} as Record<string, { name: string; number: string; count: number; lastClockIn: string }>);

  // Get today's records
  const today = new Date().toISOString().split("T")[0];
  const todayRecords = records.filter((r) =>
    r.timestamp.startsWith(today)
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-indigo-900">
            Attendix Dashboard
          </h1>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900">
                  {employees.length}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Today's Check-ins</p>
                <p className="text-3xl font-bold text-gray-900">
                  {todayRecords.length}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <Clock className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Branches</p>
                <p className="text-3xl font-bold text-gray-900">
                  {branches.length}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <Building2 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Branches Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Building2 className="w-5 h-5" />
            Branches
          </h2>
          <Button
            onClick={() => setShowCreateBranchDialog(true)}
            className="bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Branch
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {branches.map((branch) => (
            <Card key={branch.id} className="p-6 bg-white border-l-4 border-l-indigo-500">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{branch.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{branch.address || "No address provided"}</span>
                  </div>
                </div>
                <div className="bg-indigo-50 p-2 rounded-lg">
                  <QrCode className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => showBranchQr(branch)}
                  className="flex-1"
                >
                  View QR
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditBranch(branch)}
                  className="flex-1"
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const link = document.createElement("a");
                    link.download = `qr-${branch.name}.png`;
                    const url = await QRCode.toDataURL(branch.qrCode, { width: 300 });
                    link.href = url;
                    link.click();
                  }}
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}
          {branches.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 border-2 border-dashed rounded-xl">
              <p className="text-gray-500">No branches added yet. Click "Add Branch" to start.</p>
            </div>
          )}
        </div>

        {/* Organization Info Card */}
        <Card className="p-6 mb-8 bg-white text-indigo-900">
          <h2 className="text-xl font-semibold mb-2">Organization Configuration</h2>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <p className="text-sm font-semibold mb-1">
              Organization Public ID:
            </p>
            <code className="text-sm text-indigo-800 bg-white px-2 py-1 rounded border border-indigo-300 inline-block font-mono">
              {orgId || "Loading..."}
            </code>
            <p className="text-xs text-indigo-700 mt-2">
              Employees must enter this ID when creating their account to join your organization.
            </p>
          </div>
        </Card>

        {/* Staff Management Section */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Staff Management
          </h2>
        </div>

        <Card className="p-6 mb-8 bg-white">
          {employees.length === 0 ? (
            <p className="text-center py-8 text-gray-500">No employees registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-gray-600">
                    <th className="text-left py-3 px-4 font-semibold">Name</th>
                    <th className="text-left py-3 px-4 font-semibold">Employee ID</th>
                    <th className="text-left py-3 px-4 font-semibold">Email</th>
                    <th className="text-right py-3 px-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((emp) => (
                    <tr key={emp.id} className="border-b hover:bg-gray-50 group">
                      <td className="py-3 px-4 font-medium text-gray-900">{emp.name}</td>
                      <td className="py-3 px-4 text-gray-600 font-mono text-sm">{emp.employeeId}</td>
                      <td className="py-3 px-4 text-gray-600">{emp.email}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditEmployee(emp)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            title="Edit Profile"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openResetPassword(emp)}
                            className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEmployee(emp.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Attendance Records Table */}
        <Card className="p-6 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-semibold">Attendance Log</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Branch:</span>
              <select
                value={attendanceBranchFilter}
                onChange={(e) => setAttendanceBranchFilter(e.target.value)}
                className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <p className="text-center py-8 text-gray-500">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No attendance records yet
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Employee
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Check-in Time
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      Branch
                    </th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">
                      GPS Coords
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-medium text-gray-900">{record.employeeName}</div>
                        <div className="text-xs text-gray-500">ID: {record.employeeNumber}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm">
                          {format(new Date(record.timestamp), "MMM dd, yyyy")}
                        </div>
                        <div className="text-sm font-semibold text-indigo-600">
                          {format(new Date(record.timestamp), "hh:mm a")}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                          {record.branchName || "Main Branch"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-gray-500">
                        {record.latitude.toFixed(4)}, {record.longitude.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedBranch?.name || "Branch"} QR Code</DialogTitle>
            <DialogDescription>
              Display this QR code at the entrance of this branch.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center py-6">
            {qrCodeUrl && (
              <img
                src={qrCodeUrl}
                alt="Branch QR Code"
                className="w-64 h-64 border-2 border-gray-200 rounded-lg p-2 bg-white"
              />
            )}
            <div className="mt-6 flex flex-col items-center gap-2">
              <Button onClick={downloadQrCode} className="flex items-center gap-2 w-full">
                <Download className="w-4 h-4" />
                Download Image
              </Button>
              <p className="text-xs text-gray-500">
                Resolution: 300x300 pixels
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Branch Dialog */}
      <Dialog open={showCreateBranchDialog} onOpenChange={setShowCreateBranchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Branch</DialogTitle>
            <DialogDescription>
              Create a distinct branch with its own trackable QR code. Drag the pin or click the map to set the branch location.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Downtown Pharmacy"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. 456 Central Ave"
                value={newBranchAddress}
                onChange={(e) => setNewBranchAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Pin Location (drag or click)
              </label>
              {geoReady && showCreateBranchDialog && (
                <MapPicker
                  lat={newBranchLat}
                  lng={newBranchLng}
                  onMove={(lat, lng) => { setNewBranchLat(lat); setNewBranchLng(lng); }}
                />
              )}
              <p className="text-xs text-gray-400">Lat: {newBranchLat.toFixed(5)}, Lng: {newBranchLng.toFixed(5)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowCreateBranchDialog(false)} disabled={isCreatingBranch}>
              Cancel
            </Button>
            <Button
              onClick={createBranch}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!newBranchName || isCreatingBranch}
            >
              {isCreatingBranch ? "Creating..." : "Create Branch"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Branch Dialog */}
      <Dialog open={showEditBranchDialog} onOpenChange={setShowEditBranchDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Branch</DialogTitle>
            <DialogDescription>
              Update the branch name, address, or reposition the location pin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                value={editBranchName}
                onChange={(e) => setEditBranchName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                value={editBranchAddress}
                onChange={(e) => setEditBranchAddress(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                Pin Location (drag or click)
              </label>
              {showEditBranchDialog && (
                <MapPicker
                  lat={editBranchLat}
                  lng={editBranchLng}
                  onMove={(lat, lng) => { setEditBranchLat(lat); setEditBranchLng(lng); }}
                />
              )}
              <p className="text-xs text-gray-400">Lat: {editBranchLat.toFixed(5)}, Lng: {editBranchLng.toFixed(5)}</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEditBranchDialog(false)} disabled={isSavingBranch}>
              Cancel
            </Button>
            <Button
              onClick={saveBranch}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!editBranchName || isSavingBranch}
            >
              {isSavingBranch ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditEmployeeDialog} onOpenChange={setShowEditEmployeeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Employee Information</DialogTitle>
            <DialogDescription>
              Update the profile details for {editEmployee?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                value={editEmployeeName}
                onChange={(e) => setEditEmployeeName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <input
                type="email"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                value={editEmployeeEmail}
                onChange={(e) => setEditEmployeeEmail(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowEditEmployeeDialog(false)} disabled={isSavingEmployee}>
              Cancel
            </Button>
            <Button
              onClick={saveEmployee}
              className="bg-indigo-600 hover:bg-indigo-700"
              disabled={!editEmployeeName || isSavingEmployee}
            >
              {isSavingEmployee ? "Saving..." : "Update Profile"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Employee Password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {resetPasswordEmployee?.name}.
              The employee will be able to log in with this new password immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input
                type="text"
                className="w-full p-2 border rounded-md focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="At least 6 characters"
                value={newEmployeePassword}
                onChange={(e) => setNewEmployeePassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowResetPasswordDialog(false)} disabled={isResettingPassword}>
              Cancel
            </Button>
            <Button
              onClick={handleResetPassword}
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={!newEmployeePassword || isResettingPassword}
            >
              {isResettingPassword ? "Resetting..." : "Reset Password"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}