import { useState } from 'react';
import { NavBar } from './components/layout/NavBar';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { theme } from './utils/theme';

export type View = 'home' | 'login';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');

  return (
    <div className="font-[Poppins] text-slate-800 min-h-screen bg-[#F5F5F5] selection:bg-[#D6A2AD] selection:text-white">
      <div className="fixed inset-0 bg-gradient-to-br from-[#F5F5F5] via-[#FAFAFA] to-[#F0FDF4] -z-50" />

      <NavBar onNavigate={setCurrentView} />

      <main className="min-h-screen pt-6">
        {currentView === 'home' && <HomePage />}
        {currentView === 'login' && <LoginPage onBack={() => setCurrentView('home')} />}
      </main>

      {currentView === 'home' && <Footer />}
      <style>{`
        :root { font-family: ${theme.font}; }
      `}</style>
    </div>
  );
}
