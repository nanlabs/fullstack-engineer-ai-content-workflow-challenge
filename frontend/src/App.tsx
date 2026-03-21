import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTheme } from './hooks/useTheme';
import { useEventSource } from './hooks/useEventSource';
import { AuthProvider, useAuth } from './lib/auth';
import Dashboard from './pages/Dashboard';
import CampaignDetail from './pages/CampaignDetail';
import ContentDetail from './pages/ContentDetail';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false } },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppLayout() {
  const { isDark, toggle } = useTheme();
  const { isAuthenticated, user, logout } = useAuth();
  useEventSource();

  return (
    <div className="min-h-screen flex flex-col pt-16">
      {isAuthenticated && (
        <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 z-50">
          <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2 font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                <svg viewBox="0 0 76 65" fill="currentColor" xmlns="http://www.w3.org/2000/svg" className="w-6 h-6"><path d="M37.5274 0L75.0548 65H0L37.5274 0Z"/></svg>
                <span>ACME</span>
              </a>
              <span className="text-zinc-300 dark:text-zinc-600">/</span>
              <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Content Workflow</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide">BETA</span>
              {user && (
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {user.name || user.email}
                </span>
              )}
              <button
                onClick={logout}
                className="text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Logout
              </button>
              <button
                onClick={toggle}
                aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                className="p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                {isDark ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </header>
      )}
      <main className={`flex-1 max-w-5xl mx-auto w-full px-6 py-8 ${!isAuthenticated ? 'pt-0' : ''}`}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/campaigns/:id" element={<ProtectedRoute><CampaignDetail /></ProtectedRoute>} />
          <Route path="/content/:id" element={<ProtectedRoute><ContentDetail /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppLayout />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
