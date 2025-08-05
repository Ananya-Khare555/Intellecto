<<<<<<< HEAD
=======
// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
// import { auth } from "@/components/auth/firebase";
// import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
// import { useNavigate } from "react-router-dom";
// import { Toast } from "@radix-ui/react-toast";

// interface SignupFormProps {
//   onSwitchToLogin: () => void;
// }

// export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
//   const [showPassword, setShowPassword] = useState(false);
//   const [showConfirmPassword, setShowConfirmPassword] = useState(false);
//   const [formData, setFormData] = useState({
//     fullName: "",
//     email: "",
//     password: "",
//     confirmPassword: ""
//   });
//   const [isLoading, setIsLoading] = useState(false);

//   const navigate = useNavigate();

//   const handleChange = (field: string, value: string) => {
//     setFormData((prev) => ({ ...prev, [field]: value }));
//   };

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     if (formData.password !== formData.confirmPassword) {
//       alert("Passwords do not match");
//       return;
//     }

//     setIsLoading(true);
//     try {
//       const userCredential = await createUserWithEmailAndPassword(
//         auth,
//         formData.email,
//         formData.password
//       );

//       await updateProfile(userCredential.user, {
//         displayName: formData.fullName
//       });
//       navigate("/dashboard"); // Redirect to dashboard
//       // Optionally, you can show a success message or toast here   
//       console.log("Signup successful:", userCredential.user);
      
//     } catch (error: any) {
//       console.error("Signup error:", error.message);
//       alert(error.message);
//     }
//     setIsLoading(false);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       <div className="text-center space-y-2">
//         <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
//           Create account
//         </h1>
//         <p className="text-muted-foreground">Join us and start your journey today</p>
//       </div>

//       <div className="space-y-4">
//         <div className="space-y-2">
//           <Label htmlFor="fullName">Full Name</Label>
//           <div className="relative">
//             <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               id="fullName"
//               type="text"
//               value={formData.fullName}
//               onChange={(e) => handleChange("fullName", e.target.value)}
//               placeholder="Enter your full name"
//               required
//               className="pl-10"
//             />
//           </div>
//         </div>

//         <div className="space-y-2">
//           <Label htmlFor="email">Email</Label>
//           <div className="relative">
//             <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               id="email"
//               type="email"
//               value={formData.email}
//               onChange={(e) => handleChange("email", e.target.value)}
//               placeholder="Enter your email"
//               required
//               className="pl-10"
//             />
//           </div>
//         </div>

//         <div className="space-y-2">
//           <Label htmlFor="password">Password</Label>
//           <div className="relative">
//             <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               id="password"
//               type={showPassword ? "text" : "password"}
//               value={formData.password}
//               onChange={(e) => handleChange("password", e.target.value)}
//               placeholder="Create a password"
//               required
//               className="pl-10 pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowPassword(!showPassword)}
//               className="absolute right-3 top-1/2 transform -translate-y-1/2"
//             >
//               {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//             </button>
//           </div>
//         </div>

//         <div className="space-y-2">
//           <Label htmlFor="confirmPassword">Confirm Password</Label>
//           <div className="relative">
//             <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//             <Input
//               id="confirmPassword"
//               type={showConfirmPassword ? "text" : "password"}
//               value={formData.confirmPassword}
//               onChange={(e) => handleChange("confirmPassword", e.target.value)}
//               placeholder="Confirm your password"
//               required
//               className="pl-10 pr-10"
//             />
//             <button
//               type="button"
//               onClick={() => setShowConfirmPassword(!showConfirmPassword)}
//               className="absolute right-3 top-1/2 transform -translate-y-1/2"
//             >
//               {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
//             </button>
//           </div>
//         </div>

//         <div className="text-sm">
//           <label className="flex items-start space-x-2">
//             <input type="checkbox" required className="mt-1" />
//             <span>
//               I agree to the{" "}
//               <button type="button" className="text-primary hover:underline">
//                 Terms of Service
//               </button>{" "}
//               and{" "}
//               <button type="button" className="text-primary hover:underline">
//                 Privacy Policy
//               </button>
//             </span>
//           </label>
//         </div>
//       </div>

//       <Button type="submit" disabled={isLoading} className="w-full">
//         {isLoading ? "Creating account..." : "Create account"}
//       </Button>

//       <div className="text-center">
//         <p>
//           Already have an account?{" "}
//           <button type="button" onClick={onSwitchToLogin} className="text-primary font-medium">
//             Sign in
//           </button>
//         </p>
//       </div>
//     </form>
//   );
// }


>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { auth } from "@/components/auth/firebase";
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from "firebase/auth";
import { useNavigate } from "react-router-dom";
<<<<<<< HEAD
import { Toast } from "@radix-ui/react-toast";
=======
>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

export function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [isLoading, setIsLoading] = useState(false);
<<<<<<< HEAD
=======
  const [verificationSent, setVerificationSent] = useState(false);
>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7

  const navigate = useNavigate();

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      // Create user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: formData.fullName
      });

      // Send verification email
      await sendEmailVerification(userCredential.user);
<<<<<<< HEAD
      
      // Navigate to verify email page
      navigate("/verify-email", { state: { email: formData.email } });
=======
      setVerificationSent(true);
      
      console.log("Verification email sent to:", userCredential.user.email);
>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7
      
    } catch (error: any) {
      console.error("Signup error:", error.message);
      alert(error.message);
    }
    setIsLoading(false);
  };

<<<<<<< HEAD
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
=======
  if (verificationSent) {
    return (
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Verify Your Email
          </h1>
          <p className="text-muted-foreground">
            We've sent a verification link to <strong>{formData.email}</strong>
          </p>
          <p className="text-sm text-muted-foreground">
            Please check your inbox and click the link to verify your account.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-sm">
            Didn't receive the email?{" "}
            <button 
              onClick={handleSubmit}
              className="text-primary font-medium hover:underline"
            >
              Resend verification
            </button>
          </p>
          
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => {
              // Check if user is verified
              if (auth.currentUser?.emailVerified) {
                navigate("/dashboard");
              } else {
                alert("Please verify your email first");
              }
            }}
          >
            I've verified my email
          </Button>
        </div>
      </div>
    );
  }

  return (
     <form onSubmit={handleSubmit} className="space-y-6">
>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Create account
        </h1>
        <p className="text-muted-foreground">Join us and start your journey today</p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="fullName"
              type="text"
              value={formData.fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              placeholder="Enter your full name"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              placeholder="Enter your email"
              required
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              placeholder="Create a password"
              required
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              placeholder="Confirm your password"
              required
              className="pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2"
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="text-sm">
          <label className="flex items-start space-x-2">
            <input type="checkbox" required className="mt-1" />
            <span>
              I agree to the{" "}
              <button type="button" className="text-primary hover:underline">
                Terms of Service
              </button>{" "}
              and{" "}
              <button type="button" className="text-primary hover:underline">
                Privacy Policy
              </button>
            </span>
          </label>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? "Creating account..." : "Create account"}
      </Button>

      <div className="text-center">
        <p>
          Already have an account?{" "}
          <button type="button" onClick={onSwitchToLogin} className="text-primary font-medium">
            Sign in
          </button>
        </p>
      </div>
    </form>
  );
<<<<<<< HEAD
}
=======
}
>>>>>>> f4ca06c4cc92bb74902126cdd1cbdea9eb4cbcc7
