// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Index from "./pages/Index";
// import NotFound from "./pages/NotFound";
// import { Dashboard } from "./pages/Dashboard";
// import FinishSignIn from "./components/auth/FinishSignIn";
// import SendLink from "./components/auth/SendLink";

// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Index />} />
//           <Route path="/dashboard" element={<Dashboard />} />
//           <Route path="/sendLink" element={<SendLink />} />
//           <Route path="/finishSignIn" element={<FinishSignIn />} />
//           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;


import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { Dashboard } from "./pages/Dashboard";
import FinishSignIn from "./components/auth/FinishSignIn";
import SendLink from "./components/auth/SendLink";
import { EmailVerificationChecker } from "./components/auth/EmailVerificationChecker";
import { VerifyEmail } from "./pages/VerifyEmail";
import { auth } from "./components/auth/firebase";
import { useAuthState } from "react-firebase-hooks/auth";

const queryClient = new QueryClient();

// Auth protection component
const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <div>Loading...</div>; // Or your loading component
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          
          {/* Email link authentication routes */}
          <Route path="/sendLink" element={<SendLink />} />
          <Route path="/finishSignIn" element={<FinishSignIn />} />
          
          {/* Protected dashboard route with email verification */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <EmailVerificationChecker>
                  <Dashboard />
                </EmailVerificationChecker>
              </ProtectedRoute>
            } 
          />
          
          {/* Verification page */}
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;