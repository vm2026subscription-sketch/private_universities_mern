import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { AiChatProvider } from './context/AiChatContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import AiChatWidget from './components/common/AiChatWidget';
import ProtectedRoute from './components/common/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileNav from './components/layout/MobileNav';
import Home from './pages/Home';
import Universities from './pages/Universities';
import UniversityDetail from './pages/UniversityDetail';
import Courses from './pages/Courses';
import Exams from './pages/Exams';
import News from './pages/News';
import UniversityComparison from './pages/UniversityComparison';
import Loans from './pages/Loans';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import OpenChatRoute from './pages/OpenChatRoute';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AiChatProvider>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px' } }} />
            <div className="min-h-screen bg-white dark:bg-dark-bg text-light-text dark:text-dark-text">
              <Navbar />
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/universities" element={<Universities />} />
                <Route path="/universities/:slug" element={<UniversityDetail />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/exams" element={<Exams />} />
                <Route path="/news" element={<News />} />
                <Route path="/compare-universities" element={<UniversityComparison />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/ask" element={<OpenChatRoute />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <Footer />
              <MobileNav />
              <AiChatWidget />
            </div>
          </AiChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
