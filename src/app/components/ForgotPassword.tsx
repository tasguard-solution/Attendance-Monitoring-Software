import { useState } from "react";
import { Link } from "react-router";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "../lib/supabase";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email address");
            return;
        }

        setIsLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });

            if (error) {
                toast.error(error.message);
            } else {
                setIsSubmitted(true);
                toast.success("Password reset link sent!");
            }
        } catch (error: any) {
            toast.error("An error occurred. Please try again.");
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
            <div className="sm:mx-auto sm:w-full sm:max-w-md">
                <div className="flex justify-center">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center">
                        <span className="text-white text-2xl font-bold">A</span>
                    </div>
                </div>
                <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
                    Reset your password
                </h2>
                <p className="mt-2 text-center text-sm text-gray-600">
                    Enter your email and we'll send you a reset link.
                </p>
            </div>

            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <Card className="py-8 px-4 shadow-xl sm:rounded-xl sm:px-10 bg-white border-t-4 border-t-indigo-600">
                    {isSubmitted ? (
                        <div className="text-center space-y-4">
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Check your inbox</h3>
                            <p className="text-sm text-gray-500">
                                We've sent a password reset link to <span className="font-semibold">{email}</span>.
                            </p>
                            <div className="mt-6">
                                <Link to="/">
                                    <Button variant="outline" className="w-full">
                                        Return to home
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form className="space-y-6" onSubmit={handleResetPassword}>
                            <div>
                                <Label htmlFor="email" className="text-gray-700">Email address</Label>
                                <div className="mt-2">
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        autoComplete="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="focus:ring-indigo-500 focus:border-indigo-500"
                                        placeholder="Enter your registered email"
                                    />
                                </div>
                            </div>

                            <div>
                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-semibold transition-all shadow-md hover:shadow-lg"
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Sending link..." : "Send reset link"}
                                </Button>
                            </div>

                            <div className="flex items-center justify-center mt-6">
                                <Link
                                    to="/"
                                    className="flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Back to login
                                </Link>
                            </div>
                        </form>
                    )}
                </Card>
            </div>
        </div>
    );
}
