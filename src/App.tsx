
import { BrowserRouter as Router, Routes, Route, useLocation, Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { HomePage } from './pages/principal/HomePage';
import { TutorialPage } from './pages/principal/TutorialPage';
import { FormPage } from './pages/principal/FormPage';
import { ThemeSwitch } from './components/ThemeSwitch';
import { LoginPage } from './pages/admin/LoginPage';
import { DashboardPage } from './pages/admin/DashboardPage';
import { ParticipantsPage } from './pages/admin/ParticipantsPage';
import { PasswordResetPage } from './pages/admin/PasswordResetPage';
import { AcceptInvitePage } from './pages/admin/AcceptInvitePage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CoursesPage } from './pages/principal/CoursesPage';
import { LearnerProvider } from './context/LearnerContext';
import Navigation from './components/Navigation';
import { useAuth } from './hooks/useAuth';

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<HomePage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="/criar-cv" element={<FormPage />} />
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/admin" element={<LoginPage />} />
        <Route path="/resetar-senha" element={<PasswordResetPage />} />
        <Route path="/aceitar-convite" element={<AcceptInvitePage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/participants" element={<ParticipantsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function AppShell() {
  const location = useLocation();
  const pathname = location.pathname;
  const hideNav = pathname === '/admin' || pathname === '/resetar-senha' || pathname === '/aceitar-convite';
  const showReturnHome = hideNav; // mesmas telas sem navegação
  const isAdminView = pathname.startsWith('/dashboard');
  const { signOut, user } = useAuth();

  const handleAdminSignOut = async () => {
    void signOut();
  };

  return (
    <div className="min-h-[100svh] bg-theme-base transition-colors duration-300">
      {!isAdminView && <ThemeSwitch />}
      {showReturnHome && (
        <Link
          to="/"
          className="fixed top-4 right-24 md:top-6 md:right-32 z-30 inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-theme bg-theme-base/80 backdrop-blur text-sm font-medium text-theme-primary hover:bg-theme-surface transition-colors"
        >
          <span aria-hidden="true">←</span>
          Voltar para o site
        </Link>
      )}
      {isAdminView && user && (
        <div className="fixed top-4 right-4 md:top-6 md:right-6 z-30 flex items-center gap-2">
          <ThemeSwitch fixed={false} />
          <motion.button
            onClick={handleAdminSignOut}
            className="px-4 py-2 rounded-xl border border-theme text-theme-secondary hover:text-white hover:bg-red-500 hover:border-red-500 transition-all duration-300 text-sm font-medium flex items-center gap-2 group"
            whileHover={{
              scale: 1.05,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
            whileTap={{
              scale: 0.95,
              transition: { type: "spring", stiffness: 400, damping: 25 }
            }}
          >
            <svg
              className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </motion.button>
        </div>
      )}
      {!hideNav && <Navigation />}
      <main className={`bg-transparent transition-all duration-500 ${!hideNav ? 'md:pl-24' : ''}`}>
        <AnimatedRoutes />
      </main>
    </div>
  );
}

function normalizeBasename(value: string) {
  if (!value) return '/';
  if (value === '/' || value === './' || value === '.') return '/';
  const trimmed = value.endsWith('/') ? value.slice(0, -1) : value;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function App() {
  const basename = normalizeBasename(import.meta.env.BASE_URL);

  return (
    <Router basename={basename}>
      <AuthProvider>
        <LearnerProvider>
          <AppShell />
        </LearnerProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
