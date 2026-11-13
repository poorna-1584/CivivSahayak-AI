import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { AppProvider, PROTECTED_CITIZEN_ROUTES, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatbotPage } from './pages/ChatbotPage';
import { SchemesPage } from './pages/SchemesPage';
import { SchemeDetailsPage } from './pages/SchemeDetailsPage';
import { EligibilityPage } from './pages/EligibilityPage';
import { ChecklistPage } from './pages/ChecklistPage';
import { PdfAssistantPage } from './pages/PdfAssistantPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AuthPage } from './pages/AuthPage';
import { AboutPage } from './pages/AboutPage';
import { HelplinesPage } from './pages/HelplinesPage';
import { LatestScholarshipsModal } from './components/LatestScholarshipsModal';
import { OfflineIndicator } from './components/OfflineIndicator';

function ActiveView() {
  const { route, citizenUser, citizenAuthChecked } = useApp();

  const renderPage = () => {
    if (!citizenUser && PROTECTED_CITIZEN_ROUTES.has(route)) {
      if (!citizenAuthChecked) {
        return (
          <div className="max-w-3xl mx-auto px-4 py-20 text-center text-sm text-slate-500">
            Loading session...
          </div>
        );
      }
      return <AuthPage />;
    }

    switch (route) {
      case 'home':
        return <HomePage />;
      case 'dashboard':
        return <DashboardPage />;
      case 'chat':
        return <ChatbotPage />;
      case 'schemes':
        return <SchemesPage />;
      case 'scheme-details':
        return <SchemeDetailsPage />;
      case 'eligibility':
        return <EligibilityPage />;
      case 'checklist':
        return <ChecklistPage />;
      case 'pdf-assistant':
        return <PdfAssistantPage />;
      case 'auth':
        return <AuthPage />;
      case 'helplines':
        return <HelplinesPage />;
      case 'admin-login':
        return <AdminLoginPage />;
      case 'admin-dashboard':
        return <AdminDashboardPage />;
      case 'about':
        return <AboutPage />;
      default:
        return <HomePage />;
    }
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={route}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      >
        {renderPage()}
      </motion.div>
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <AppProvider>
        <div className="min-h-screen flex flex-col bg-[#F6F8F7] text-slate-900">
          <Navbar />
          <main className="flex-1">
            <ActiveView />
          </main>
          <Footer />
          <LatestScholarshipsModal />
          <OfflineIndicator />
        </div>
      </AppProvider>
    </MotionConfig>
  );
}

