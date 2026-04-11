import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { SubscriptionProvider, useSubscription } from "@/hooks/useSubscription";
import { useOnboardingStatus } from "@/hooks/useOnboarding";
import { LocationFilterProvider } from "@/hooks/useLocationFilter";
import { useHasSeenVerseToday } from "@/hooks/useVerseSeen";
import AppLayout from "@/components/AppLayout";
import AuthPage from "@/pages/AuthPage";
import Dashboard from "@/pages/Dashboard";
import CheckinPage from "@/pages/CheckinPage";

import WeeklyReportPage from "@/pages/WeeklyReportPage";
import SettingsPage from "@/pages/SettingsPage";
import SubscriptionPage from "@/pages/SubscriptionPage";
import InsightsPage from "@/pages/InsightsPage";
import InstitucionalPage from "@/pages/InstitucionalPage";
import OnboardingPage from "@/pages/OnboardingPage";
import VersePage from "@/pages/VersePage";
import MedicalNewsPage from "@/pages/MedicalNewsPage";

import IdeaPage from "@/pages/IdeaPage";
import CalculadoraPage from "@/pages/CalculadoraPage";
import ReferralPage from "@/pages/ReferralPage";
import NotFound from "./pages/NotFound";
import RedefinirSenhaPage from "@/pages/RedefinirSenhaPage";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();
  const { data: onboardingCompleted, isLoading } = useOnboardingStatus();
  const { hasSeen: verseSeenToday, isLoading: verseLoading } = useHasSeenVerseToday();
  
  if (loading || isLoading) return null;
  
  if (!user) return <Navigate to="/auth" replace />;
  
  if (onboardingCompleted === false) {
    return <Navigate to="/onboarding" replace />;
  }

  if (verseLoading) return null;

  if (!verseSeenToday) {
    return <Navigate to="/versiculo" replace />;
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/checkin" element={<CheckinPage />} />
        <Route path="/noticias" element={<MedicalNewsPage />} />
        
        <Route path="/idea" element={<IdeaPage />} />
        
        <Route path="/relatorio" element={<WeeklyReportPage />} />
        <Route path="/insights" element={<InsightsPage />} />
        <Route path="/indicar" element={<ReferralPage />} />
        <Route path="/config" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AppLayout>
  );
}

function VerseRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  return <VersePage />;
}

function OnboardingRoute() {
  const { user, loading } = useAuth();
  const { data: onboardingCompleted, isLoading } = useOnboardingStatus();
  if (loading || isLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (onboardingCompleted) return <Navigate to="/" replace />;
  return <OnboardingPage />;
}

function SubscriptionRoute() {
  const { user, loading } = useAuth();
  const { subscribed, subscriptionStatus, loading: subLoading } = useSubscription();
  if (loading || subLoading) return null;
  if (!user) return <Navigate to="/auth" replace />;
  if (subscribed) return <Navigate to="/" replace />;
  return <SubscriptionPage reason={subscriptionStatus} />;
}

function AuthRoute() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <AuthPage />;
}

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <SubscriptionProvider>
              <LocationFilterProvider>
              <Routes>
                <Route path="/auth" element={<AuthRoute />} />
                <Route path="/onboarding" element={<OnboardingRoute />} />
                <Route path="/versiculo" element={<VerseRoute />} />
                <Route path="/assinatura" element={<SubscriptionRoute />} />
                <Route path="/institucional" element={<InstitucionalPage />} />
                <Route path="/redefinir-senha" element={<RedefinirSenhaPage />} />
                <Route path="/calculadora" element={<CalculadoraPage />} />
                <Route path="/*" element={<ProtectedRoutes />} />
              </Routes>
              </LocationFilterProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
