import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import {
  LogOut,
  QrCode,
  MapPin,
  CheckCircle,
  Camera,
  Clock,
} from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";
import { Html5Qrcode } from "html5-qrcode";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";

interface ClockInRecord {
  timestamp: string;
  latitude: number;
  longitude: number;
}

export function EmployeeScanner() {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [lastClockIn, setLastClockIn] = useState<ClockInRecord | null>(null);
  const [userName, setUserName] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/employee/login");
      return;
    }

    fetchUserInfo();

    return () => {
      stopScanning();
    };
  }, []);

  const fetchUserInfo = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      const { data, error } = await supabase.auth.getUser(token!);
      if (data?.user) {
        setUserName(data.user.user_metadata.name || "Employee");
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
    }
  };

  const startScanning = async () => {
    setCameraError("");
    setScanning(true);

    try {
      // Wait for the next tick to ensure the DOM element is rendered
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Check if element exists
      const element = document.getElementById("qr-reader");
      if (!element) {
        throw new Error("HTML Element with id=qr-reader not found");
      }

      // Initialize scanner
      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode("qr-reader");
      }

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      };

      // Try back camera first, fall back to any available camera
      try {
        await html5QrCodeRef.current.start(
          { facingMode: "environment" },
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (backCameraError) {
        console.log(
          "Back camera not available, trying any available camera:",
          backCameraError
        );
        // Try with any available camera
        await html5QrCodeRef.current.start(
          { facingMode: "user" },
          config,
          onScanSuccess,
          onScanFailure
        );
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(
        "Unable to access camera. Please grant camera permissions and try again."
      );
      setScanning(false);
      toast.error("Camera access denied");
    }
  };

  const stopScanning = async () => {
    if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
      try {
        await html5QrCodeRef.current.stop();
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code scanned:", decodedText);

    // Stop scanning immediately
    await stopScanning();

    // Get GPS location
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await clockIn(decodedText, latitude, longitude);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Unable to get location. Please enable location services.");
      }
    );
  };

  const onScanFailure = (error: any) => {
    // This is called frequently during scanning, so we don't log it
  };

  const clockIn = async (qrCode: string, latitude: number, longitude: number) => {
    const token = localStorage.getItem("accessToken");

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/attendance/clockin`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${publicAnonKey}`,
            "X-Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            qrCode,
            latitude,
            longitude,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Clock in failed");
      }

      setLastClockIn({
        timestamp: data.attendance.timestamp,
        latitude,
        longitude,
      });

      toast.success("Successfully clocked in!");
    } catch (error: any) {
      console.error("Clock in error:", error);
      toast.error(error.message || "Clock in failed");
    }
  };

  const handleLogout = () => {
    stopScanning();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userType");
    navigate("/employee/login");
    toast.success("Logged out successfully");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-green-900">
              Attendix Check-In
            </h1>
            <p className="text-sm text-gray-600">Welcome, {userName}</p>
          </div>
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

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Scanner Card */}
        <Card className="p-8 mb-6 bg-white">
          <div className="text-center mb-6">
            <div className="bg-green-100 p-4 rounded-full inline-block mb-4">
              <QrCode className="w-12 h-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold mb-2">Scan QR Code</h2>
            <p className="text-gray-600">
              Scan the QR code at your office entrance to check in
            </p>
          </div>

          {!scanning && (
            <div className="flex justify-center">
              <Button
                onClick={startScanning}
                size="lg"
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                Start Scanning
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div
                id="qr-reader"
                ref={scannerRef}
                className="rounded-lg overflow-hidden"
              ></div>
              <div className="flex justify-center">
                <Button
                  onClick={stopScanning}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Stop Scanning
                </Button>
              </div>
            </div>
          )}

          {cameraError && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{cameraError}</p>
            </div>
          )}
        </Card>

        {/* Last Check-In Card */}
        {lastClockIn && (
          <Card className="p-6 bg-white border-2 border-green-500">
            <div className="flex items-center gap-4">
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Successfully Checked In!
                </h3>
                <div className="space-y-1 text-sm text-gray-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>
                      {format(
                        new Date(lastClockIn.timestamp),
                        "MMM dd, yyyy hh:mm a"
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {lastClockIn.latitude.toFixed(4)},{" "}
                      {lastClockIn.longitude.toFixed(4)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions Card */}
        <Card className="p-6 mt-6 bg-blue-50 border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-3">How to Check In:</h3>
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2">
              <span className="font-semibold">1.</span>
              <span>Click "Start Scanning" to activate your camera</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">2.</span>
              <span>
                Point your camera at the QR code displayed at your office
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">3.</span>
              <span>
                Allow location access when prompted to verify your presence
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>
                Your attendance will be recorded with timestamp and location
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}