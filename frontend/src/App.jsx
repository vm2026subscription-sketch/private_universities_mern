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
import AccessibilityWidget from './components/layout/AccessibilityWidget';
import Home from './pages/Home';
import Universities from './pages/Universities';
import ForeignUniversities from './pages/ForeignUniversities';
import UniversityDetail from './pages/UniversityDetail';
import Courses from './pages/Courses';
import Exams from './pages/Exams';
import UniversityComparison from './pages/UniversityComparison';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AuthCallback from './pages/AuthCallback';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import OpenChatRoute from './pages/OpenChatRoute';
import RankPredictor from './pages/RankPredictor';
import NotFound from './pages/NotFound';

// New modular admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminOverview from './pages/admin/AdminOverview';
import UsersManager from './pages/admin/UsersManager';
import UniversitiesManager from './pages/admin/UniversitiesManager';
import CoursesManager from './pages/admin/CoursesManager';
import ExamsManager from './pages/admin/ExamsManager';
import NewsManager from './pages/admin/NewsManager';
import BannersManager from './pages/admin/BannersManager';
import TestimonialsManager from './pages/admin/TestimonialsManager';
import PagesManager from './pages/admin/PagesManager';
import FAQManager from './pages/admin/FAQManager';
import ContactManager from './pages/admin/ContactManager';
import NotificationsManager from './pages/admin/NotificationsManager';
import NewsletterManager from './pages/admin/NewsletterManager';
import SiteSettingsManager from './pages/admin/SiteSettingsManager';
import AuditLogViewer from './pages/admin/AuditLogViewer';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AiChatProvider>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px' } }} />
            <Routes>
              {/* Admin panel routes — no Navbar/Footer */}
              <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminOverview />} />
                <Route path="universities" element={<UniversitiesManager />} />
                <Route path="courses" element={<CoursesManager />} />
                <Route path="exams" element={<ExamsManager />} />
                <Route path="news" element={<NewsManager />} />
                <Route path="users" element={<UsersManager />} />
                <Route path="banners" element={<BannersManager />} />
                <Route path="testimonials" element={<TestimonialsManager />} />
                <Route path="pages" element={<PagesManager />} />
                <Route path="faqs" element={<FAQManager />} />
                <Route path="contacts" element={<ContactManager />} />
                <Route path="notifications" element={<NotificationsManager />} />
                <Route path="newsletter" element={<NewsletterManager />} />
                <Route path="settings" element={<SiteSettingsManager />} />
                <Route path="audit-logs" element={<AuditLogViewer />} />
              </Route>

              {/* Legacy admin (full editor for content) */}
              <Route path="/admin-legacy" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />

              {/* Public routes with Navbar/Footer */}
              <Route path="*" element={
                <div className="min-h-screen bg-transparent text-light-text dark:text-dark-text relative">
                  {/* Global Animated Background */}
                  <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#f8fafc] dark:bg-dark-bg transition-colors duration-500">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[100px] animate-blob mix-blend-multiply dark:mix-blend-screen" />
                    <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-orange-400/20 rounded-full blur-[120px] animate-blob animation-delay-2000 mix-blend-multiply dark:mix-blend-screen" />
                    <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-blue-400/15 rounded-full blur-[150px] animate-blob animation-delay-4000 mix-blend-multiply dark:mix-blend-screen" />
                  </div>

                  <Navbar />
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/universities" element={<Universities />} />
                    <Route path="/foreign-universities" element={<ForeignUniversities />} />
                    <Route path="/universities/:slug" element={<UniversityDetail />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/exams" element={<Exams />} />
                    <Route path="/compare-universities" element={<UniversityComparison />} />
                    <Route path="/rank-predictor" element={<RankPredictor />} />
                    <Route path="/ask" element={<OpenChatRoute />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/verify-email" element={<VerifyEmail />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Footer />
                  <MobileNav />
                  <AccessibilityWidget />
                  <AiChatWidget />
                </div>
              } />
            </Routes>
          </AiChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
