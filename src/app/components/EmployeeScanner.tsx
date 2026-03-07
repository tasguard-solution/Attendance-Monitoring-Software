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
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

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
  const [isFaceModelLoading, setIsFaceModelLoading] = useState(true);
  const [processingScan, setProcessingScan] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      navigate("/employee/login");
      return;
    }

    fetchUserInfo();
    loadFaceDetector();

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

  const loadFaceDetector = async () => {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );
      faceDetectorRef.current = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: "/models/blaze_face_short_range.tflite",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
      });
      setIsFaceModelLoading(false);
    } catch (e) {
      console.error("Failed to load face detector:", e);
      toast.error("Failed to initialize Face Detection");
    }
  };

  const startFrontCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      if (frontVideoRef.current) {
        frontVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Front camera error:", err);
      toast.error("Could not access front camera for face detection");
    }
  };

  const stopFrontCamera = () => {
    if (frontVideoRef.current && frontVideoRef.current.srcObject) {
      const stream = frontVideoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      frontVideoRef.current.srcObject = null;
    }
  };

  const startScanning = async () => {
    setCameraError("");
    setScanning(true);

    await startFrontCamera();

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
    stopFrontCamera();
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
    if (processingScan) return; // Prevent multiple scans while processing

    // Face detection & photo capture
    const frontVideoElement = frontVideoRef.current;
    let photoData = null;

    if (frontVideoElement && faceDetectorRef.current && frontVideoElement.readyState >= 2) {
      setProcessingScan("Detecting face...");
      const results = faceDetectorRef.current.detect(frontVideoElement);

      if (results.detections.length === 0) {
        toast.error("No human face detected! Please look at the front camera.");
        setProcessingScan("");
        return; // Reject scan
      }

      // Face found! Capture frame & compress
      setProcessingScan("Capturing photo...");
      const canvas = document.createElement("canvas");
      canvas.width = frontVideoElement.videoWidth;
      canvas.height = frontVideoElement.videoHeight;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(frontVideoElement, 0, 0, canvas.width, canvas.height);
        // Compress JPEG to 70% quality
        photoData = canvas.toDataURL("image/jpeg", 0.7);
      }
    } else if (!faceDetectorRef.current) {
      toast.error("Face detection model still loading. Please wait.");
      return;
    } else if (frontVideoElement && frontVideoElement.readyState < 2) {
      toast.error("Front camera is not ready yet. Please wait.");
      return;
    }

    setProcessingScan("");

    // Stop scanning immediately upon successful capture
    await stopScanning();

    // Get GPS location
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await clockIn(decodedText, latitude, longitude, photoData);
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

  const clockIn = async (qrCode: string, latitude: number, longitude: number, photoData: string | null) => {
    const token = localStorage.getItem("accessToken");

    try {
      toast.loading("Recording attendance...", { id: "clockin" });
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
            photoData,
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

      toast.success("Successfully clocked in!", { id: "clockin" });
    } catch (error: any) {
      console.error("Clock in error:", error);
      toast.error(error.message || "Clock in failed", { id: "clockin" });
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
                disabled={isFaceModelLoading}
                className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
              >
                <Camera className="w-5 h-5" />
                {isFaceModelLoading ? "Loading AI..." : "Start Scanning"}
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              {processingScan && (
                <div className="text-center p-3 bg-blue-50 text-blue-700 rounded-md font-medium border border-blue-200">
                  {processingScan}
                </div>
              )}
              <div className="relative">
                <div
                  id="qr-reader"
                  ref={scannerRef}
                  className="rounded-lg overflow-hidden"
                ></div>
                {/* Front camera preview (PIP) */}
                <video
                  ref={frontVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute top-4 right-4 w-28 h-36 object-cover rounded-lg border-2 border-green-500 shadow-lg z-10 bg-black/50"
                />
              </div>
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
                Ensure your face is clearly visible to the camera
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">4.</span>
              <span>
                Allow location access when prompted to verify your presence
              </span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold">5.</span>
              <span>
                Your attendance and face secure capture will be recorded
              </span>
            </li>
          </ol>
        </Card>
      </div>
    </div>
  );
}