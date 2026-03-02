import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { ShieldAlert, User, Lock } from "lucide-react";
import { projectId, publicAnonKey } from "../../../utils/supabase/info";

export function AdminLogin() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        password: "",
    });

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-f3cc8027/admin/login`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${publicAnonKey}`,
                    },
                    body: JSON.stringify(formData),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Login failed");
            }

            if (data.token) {
                localStorage.setItem("adminToken", data.token);
                localStorage.setItem("userType", "admin");
                toast.success("Welcome, Administrator");
                navigate("/admin/dashboard");
            }
        } catch (error: any) {
            console.error("Admin login error:", error);
            toast.error(error.message || "Invalid administrative credentials");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 bg-[#1e293b] border-[#334155] shadow-2xl">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-red-500/10 p-4 rounded-full mb-4 border border-red-500/20">
                        <ShieldAlert className="w-12 h-12 text-red-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                        Terminal Access
                    </h1>
                    <p className="text-slate-400 text-sm mt-2">
                        Restricted Administrative Portal
                    </p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-300 flex items-center gap-2">
                            <User className="w-4 h-4" />
                            Identifier
                        </Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder="Admin ID"
                            className="bg-[#0f172a] border-[#334155] text-white focus:ring-red-500/50"
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({ ...formData, username: e.target.value })
                            }
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-300 flex items-center gap-2">
                            <Lock className="w-4 h-4" />
                            Auth Key
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-[#0f172a] border-[#334155] text-white focus:ring-red-500/50"
                            value={formData.password}
                            onChange={(e) =>
                                setFormData({ ...formData, password: e.target.value })
                            }
                            required
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-6 shadow-lg shadow-red-900/20 transition-all hover:scale-[1.02]"
                        disabled={loading}
                    >
                        {loading ? "Decrypting..." : "Initialize Session"}
                    </Button>
                </form>

                <div className="mt-8 pt-6 border-t border-[#334155] text-center">
                    <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em]">
                        Authorized Personnel Only
                    </p>
                </div>
            </Card>
        </div>
    );
}
