import { useState, useEffect } from "react";
import { auth } from "@/components/auth/firebase";
import { sendEmailVerification, User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const VerifyEmail = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [countdown, setCountdown] = useState(30);
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(auth.currentUser);

    // Keep user reference updated
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    const handleResend = async () => {
        if (!user) return;

        setIsLoading(true);
        try {
            await sendEmailVerification(user);
            setCountdown(30);
            alert("Verification email resent!");
        } catch (error) {
            console.error("Error resending verification:", error);
            alert("Failed to resend verification email");
        }
        setIsLoading(false);
    };

    const checkVerification = async () => {
        if (!user) {
            navigate("/");
            return false;
        }

        try {
            // Force refresh the user's ID token which contains verification status
            await user.getIdToken(true);
            await user.reload();
            
            // Get the fresh user object
            const refreshedUser = auth.currentUser;
            if (refreshedUser?.emailVerified) {
                navigate("/dashboard");
                return true;
            }
            return false;
        } catch (error) {
            console.error("Error checking verification:", error);
            return false;
        }
    };

    // Auto-redirect when verified
    useEffect(() => {
        if (!user) {
            navigate("/");
            return;
        }

        const interval = setInterval(async () => {
            const isVerified = await checkVerification();
            if (isVerified) {
                clearInterval(interval);
            }
        }, 2000);

        const timer = setInterval(() => {
            setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);

        return () => {
            clearInterval(interval);
            clearInterval(timer);
        };
    }, [user, navigate]);

    return (
        <div className="max-w-md mx-auto p-6 space-y-6 text-center">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold">Verify Your Email</h1>
                <p className="text-muted-foreground">
                    We've sent a verification link to <strong>{user?.email}</strong>
                </p>
            </div>

            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Please check your inbox and click the link to verify your account.
                </p>

                <Button
                    onClick={handleResend}
                    disabled={isLoading || countdown > 0}
                    className="w-full"
                >
                    {isLoading
                        ? "Sending..."
                        : countdown > 0
                            ? `Resend in ${countdown}s`
                            : "Resend Verification Email"}
                </Button>

                <Button
                    variant="outline"
                    onClick={async () => {
                        const isVerified = await checkVerification();
                        if (!isVerified) {
                            alert("Please verify your email first by clicking the link we sent you. If you just verified, try again in a few seconds.");
                        }
                    }}
                    className="w-full"
                >
                    I've verified my email
                </Button>
            </div>
        </div>
    );
};