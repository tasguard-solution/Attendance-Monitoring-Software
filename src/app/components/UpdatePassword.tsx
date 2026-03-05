import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { supabase } from "../lib/supabase";

export function UpdatePassword() {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [errorSession, setErrorSession] = useState(false);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // Check if we have an error parameter in the URL (e.g., expired token)
        const errorParam = searchParams.get("error");
        const errorDescription = searchParams.get("error_description");

        if (errorParam) {
            setErrorSession(true);
            toast.error(errorDescription ? decodeURIComponent(errorDescription.replace(/\+/g, ' ')) : "Invalid or expired recovery link");
        }
    }, [searchParams]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!password) {
            toast.error("Please enter a new password");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success("Password successfully updated!");
                // Clear local storage just in case they were partially logged in
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userType");

                // Redirect to home/login
                setTimeout(() => {
                    navigate("/");
                }, 1500);
            }
        } catch (error: any) {
            toast.error("An error occurred. Please try again.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    if (errorSession) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-md">
                    <Card className="py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 bg-white border-t-4 border-t-red-600 text-center">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Invalid Link</h2>
                        <p className="text-gray-600 mb-6">
                            This password reset link is invalid or has expired. Please request a new one.
                        </p>
                        <Button onClick={() => navigate("/forgot-password")} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            Request New Link
                        </Button>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <Lock className="w-6 h-6 text-white" />
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Set new password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Please enter your new password below.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card className="py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 bg-white border-t-4 border-t-indigo-600">
                    <form className="space-y-6" onSubmit={handleUpdatePassword}>
                        <div>
                            <Label htmlFor="password" className="text-gray-700">New Password</Label>
                            <div className="mt-2">
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="At least 6 characters"
                                    minLength={6}
                                />
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="confirmPassword" className="text-gray-700">Confirm New Password</Label>
                            <div className="mt-2">
                                <Input
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Confirm your new password"
                                />
                            </div>
                        </div>

                        <div>
                            <Button
                                type="submit"
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-semibold transition-all shadow-md hover:shadow-lg"
                                disabled={isLoading}
                            >
                                {isLoading ? "Updating..." : "Update Password"}
                            </Button>
                        </div>
                    </form>
                </Card>
            </div>
        </div>
    );
}
