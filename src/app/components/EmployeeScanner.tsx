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
  const [scanPhase, setScanPhase] = useState<"IDLE" | "QR" | "FACE">("IDLE");
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [cameraError, setCameraError] = useState("");
  const [lastClockIn, setLastClockIn] = useState<ClockInRecord | null>(null);
  const [userName, setUserName] = useState("");
  const [isFaceModelLoading, setIsFaceModelLoading] = useState(true);
  const [processingScan, setProcessingScan] = useState("");
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const faceDetectorRef = useRef<FaceDetector | null>(null);
  const frontVideoRef = useRef<HTMLVideoElement>(null);
  const qrLockedRef = useRef(false);

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
        runningMode: "VIDEO",
      });
      setIsFaceModelLoading(false);
    } catch (e) {
      console.error("Failed to load face detector:", e);
      toast.error("Failed to initialize Face Detection");
    }
  };

  const startFrontCamera = async () => {
    try {
      setScanPhase("FACE");
      setTimeLeft(10);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
      });
      if (frontVideoRef.current) {
        setProcessingScan("Starting face camera...");
        frontVideoRef.current.srcObject = stream;
        await new Promise((resolve) => {
          frontVideoRef.current!.onloadedmetadata = () => resolve(true);
        });
        await frontVideoRef.current.play();
        setProcessingScan("");
      }
    } catch (err) {
      console.error("Front camera error:", err);
      toast.error("Could not access front camera for face detection");
      await resetScanner();
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
    setScanPhase("QR");
    setQrPayload(null);

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

      // Try back camera first ("environment")
      try {
        await html5QrCodeRef.current.start(
          { facingMode: { exact: "environment" } },
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (backCameraError) {
        console.log(
          "Strict back camera not available, falling back to general environment or any:",
          backCameraError
        );
        try {
          // Fallback to preferred environment
          await html5QrCodeRef.current.start(
            { facingMode: "environment" },
            config,
            onScanSuccess,
            onScanFailure
          );
        } catch (generalError) {
          console.log("No back camera found, falling back to any camera", generalError);
          // Ultimate fallback
          await html5QrCodeRef.current.start(
            { facingMode: "user" },
            config,
            onScanSuccess,
            onScanFailure
          );
        }
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
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear(); // Important: releases camera hardware completely
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  const resetScanner = async () => {
    await stopScanning();
    stopFrontCamera();
    setScanning(false);
    setScanPhase("IDLE");
    setQrPayload(null);
    setProcessingScan("");
    qrLockedRef.current = false;
  };

  const onScanSuccess = async (decodedText: string) => {
    // If we already have a payload or aren't in QR phase, ignore
    if (scanPhase !== "QR" || qrPayload === decodedText) return;

    setQrPayload(decodedText);
    setProcessingScan("QR Code Detected! Tap 'Proceed to Face Scan' below.");
  };

  const proceedToFaceScan = async () => {
    if (!qrPayload || qrLockedRef.current) return;
    qrLockedRef.current = true; // Prevent double clicks on the button

    setProcessingScan("Switching camera...");
    await stopScanning(); // Now safe, we are outside the html5-qrcode hook loop!

    // Give browser time to release hardware
    await new Promise((r) => setTimeout(r, 400));

    // Switch to face scan phase
    await startFrontCamera();
    setProcessingScan("");
  };

  // Face Detection Loop
  useEffect(() => {
    let timerId: NodeJS.Timeout;
    let detectionId: number;

    const checkFace = async () => {
      const frontVideoElement = frontVideoRef.current;

      if (scanPhase === "FACE" && frontVideoElement && faceDetectorRef.current && frontVideoElement.readyState >= 2 && !processingScan) {

        const results = faceDetectorRef.current.detectForVideo(frontVideoElement, performance.now());

        if (results.detections.length > 0) {
          // Face found!
          setProcessingScan("Capturing photo...");

          const canvas = document.createElement("canvas");
          canvas.width = frontVideoElement.videoWidth;
          canvas.height = frontVideoElement.videoHeight;
          const ctx = canvas.getContext("2d");

          let photoData = null;
          if (ctx) {
            ctx.drawImage(frontVideoElement, 0, 0, canvas.width, canvas.height);
            photoData = canvas.toDataURL("image/jpeg", 0.7);
          }

          // Complete the sequence
          stopFrontCamera();
          finalizeClockIn(photoData);
          return; // Stop loop
        }
      }

      // Keep checking but throttle to ~6 FPS to save resources
      if (scanPhase === "FACE") {
        setTimeout(() => {
          detectionId = requestAnimationFrame(checkFace);
        }, 150);
      }
    };

    if (scanPhase === "FACE") {
      // Start 10 timer
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Timeout reached!
            toast.error("Face scan timed out! Please try again.");
            resetScanner();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start detection loop
      checkFace();
    }

    return () => {
      clearInterval(timerId);
      cancelAnimationFrame(detectionId);
    };
  }, [scanPhase, processingScan]);

  const finalizeClockIn = async (photoData: string | null) => {
    if (!qrPayload) {
      toast.error("QR Code data lost. Please try again.");
      await resetScanner();
      return;
    }

    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      await resetScanner();
      return;
    }

    toast.loading("Getting location...", { id: "clockin" });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        await clockIn(qrPayload, latitude, longitude, photoData);
        await resetScanner(); // Reset view to start after completion
      },
      async (error) => {
        console.error("Geolocation error:", error);
        toast.dismiss("clockin");
        toast.error("Unable to get location. Please enable location services.");
        await resetScanner();
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

  const handleLogout = async () => {
    await resetScanner();
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
                {isFaceModelLoading ? "Loading AI..." : "Start Sequence"}
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
                {scanPhase === "QR" && (
                  <div className="flex flex-col items-center">
                    <div
                      id="qr-reader"
                      ref={scannerRef}
                      className="rounded-lg overflow-hidden w-full"
                    ></div>
                    {qrPayload && (
                      <Button
                        onClick={proceedToFaceScan}
                        className="mt-4 w-full bg-green-600 hover:bg-green-700 h-14 text-lg animate-in slide-in-from-bottom-2 shadow-lg"
                      >
                        <CheckCircle className="w-6 h-6 mr-2" />
                        Proceed to Face Scan
                      </Button>
                    )}
                  </div>
                )}

                {scanPhase === "FACE" && (
                  <div className="relative rounded-lg overflow-hidden border-4 border-emerald-400 bg-black aspect-square max-w-sm mx-auto flex items-center justify-center">
                    <video
                      ref={frontVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-4 left-0 right-0 text-center">
                      <span className="bg-black/50 text-white px-4 py-2 rounded-full font-mono text-lg font-bold">
                        {timeLeft}s
                      </span>
                    </div>
                    <div className="absolute bottom-4 left-0 right-0 text-center text-white font-medium bg-black/40 py-2">
                      Please look directly at the camera
                    </div>
                  </div>
                )}
              </div>
              <div className="flex justify-center">
                <Button
                  onClick={resetScanner}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  Cancel Sequence
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