import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Building2, UserCircle } from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-indigo-900 mb-4">Attendix</h1>
          <p className="text-xl text-gray-700">
            Smart Attendance & Presence Monitoring
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <Card className="p-8 hover:shadow-xl transition-shadow bg-white">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-indigo-100 p-6 rounded-full">
                <Building2 className="w-16 h-16 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Organization Portal
              </h2>
              <p className="text-gray-600">
                Monitor attendance, track employee presence, and manage your team
                in real-time.
              </p>
              <Button
                size="lg"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                onClick={() => navigate("/org/login")}
              >
                Login as Organization
              </Button>
            </div>
          </Card>

          <Card className="p-8 hover:shadow-xl transition-shadow bg-white">
            <div className="flex flex-col items-center text-center space-y-6">
              <div className="bg-green-100 p-6 rounded-full">
                <UserCircle className="w-16 h-16 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900">
                Employee Portal
              </h2>
              <p className="text-gray-600">
                Quick and easy check-in using QR code scanning with GPS
                verification.
              </p>
              <Button
                size="lg"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => navigate("/employee/login")}
              >
                Login as Employee
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
