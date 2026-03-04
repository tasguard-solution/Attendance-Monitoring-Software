import { useEffect, useState, useRef, useMemo, useCallback } from "react";
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
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import QRCode from "qrcode";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon for Leaflet + bundlers
const defaultIcon = new L.Icon({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Draggable marker that calls onMove after drag ends
function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (lat: number, lng: number) => void }) {
  const markerRef = useRef<L.Marker>(null);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current;
        if (marker) {
          const { lat, lng } = marker.getLatLng();
          onMoveRef.current(lat, lng);
        }
      },
    }),
    []
  );

  return <Marker draggable position={position} ref={markerRef} eventHandlers={eventHandlers} icon={defaultIcon} />;
}

// Component to handle click-to-place and re-centering
function MapInteraction({ onMove, center }: { onMove: (lat: number, lng: number) => void; center: [number, number] }) {
  const map = useMap();
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
  const initialCenter = useRef(center);

  // Fly to center once on mount
  useEffect(() => {
    map.setView(initialCenter.current, 15);
  }, [map]);

  // Attach click handler
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => {
      onMoveRef.current(e.latlng.lat, e.latlng.lng);
    };
    map.on("click", handler);
    return () => { map.off("click", handler); };
  }, [map]);

  return null;
}

interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  employeeNumber: string;
  timestamp: string;
  latitude: number;
  longitude: number;
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

    // Refresh records every 30 seconds
    const interval = setInterval(fetchAttendanceRecords, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const fetchAttendanceRecords = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/attendance/records`,
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

        {/* Attendance Records Table */}
        <Card className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Attendance Log</h2>
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
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 250 }}>
                  <MapContainer center={[newBranchLat, newBranchLng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DraggableMarker position={[newBranchLat, newBranchLng]} onMove={(lat, lng) => { setNewBranchLat(lat); setNewBranchLng(lng); }} />
                    <MapInteraction center={[newBranchLat, newBranchLng]} onMove={(lat, lng) => { setNewBranchLat(lat); setNewBranchLng(lng); }} />
                  </MapContainer>
                </div>
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
                <div className="rounded-lg overflow-hidden border border-gray-200" style={{ height: 250 }}>
                  <MapContainer center={[editBranchLat, editBranchLng]} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <DraggableMarker position={[editBranchLat, editBranchLng]} onMove={(lat, lng) => { setEditBranchLat(lat); setEditBranchLng(lng); }} />
                    <MapInteraction center={[editBranchLat, editBranchLng]} onMove={(lat, lng) => { setEditBranchLat(lat); setEditBranchLng(lng); }} />
                  </MapContainer>
                </div>
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
    </div>
  );
}