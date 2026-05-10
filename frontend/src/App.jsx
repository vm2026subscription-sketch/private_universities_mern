import { Suspense, lazy } from 'react';
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

const Home = lazy(() => import('./pages/Home'));
const Universities = lazy(() => import('./pages/Universities'));
const ForeignUniversities = lazy(() => import('./pages/ForeignUniversities'));
const UniversityDetail = lazy(() => import('./pages/UniversityDetail'));
const Courses = lazy(() => import('./pages/Courses'));
const Exams = lazy(() => import('./pages/Exams'));
const UniversityComparison = lazy(() => import('./pages/UniversityComparison'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const Profile = lazy(() => import('./pages/Profile'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const OpenChatRoute = lazy(() => import('./pages/OpenChatRoute'));
const RankPredictor = lazy(() => import('./pages/RankPredictor'));
const NotFound = lazy(() => import('./pages/NotFound'));
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const UsersManager = lazy(() => import('./pages/admin/UsersManager'));
const UniversitiesManager = lazy(() => import('./pages/admin/UniversitiesManager'));
const CoursesManager = lazy(() => import('./pages/admin/CoursesManager'));
const ExamsManager = lazy(() => import('./pages/admin/ExamsManager'));
const NewsManager = lazy(() => import('./pages/admin/NewsManager'));
const BannersManager = lazy(() => import('./pages/admin/BannersManager'));
const TestimonialsManager = lazy(() => import('./pages/admin/TestimonialsManager'));
const PagesManager = lazy(() => import('./pages/admin/PagesManager'));
const FAQManager = lazy(() => import('./pages/admin/FAQManager'));
const ContactManager = lazy(() => import('./pages/admin/ContactManager'));
const NotificationsManager = lazy(() => import('./pages/admin/NotificationsManager'));
const NewsletterManager = lazy(() => import('./pages/admin/NewsletterManager'));
const SiteSettingsManager = lazy(() => import('./pages/admin/SiteSettingsManager'));
const AuditLogViewer = lazy(() => import('./pages/admin/AuditLogViewer'));

function PageLoader() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="card p-6 text-sm text-light-muted dark:text-dark-muted">Loading page...</div>
    </div>
  );
}

function PublicLayout() {
  return (
    <div className="min-h-screen bg-transparent text-light-text dark:text-dark-text relative">
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
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
      <MobileNav />
      <AccessibilityWidget />
      <AiChatWidget />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AiChatProvider>
            <Toaster position="top-right" toastOptions={{ style: { borderRadius: '12px' } }} />
            <Suspense fallback={<PageLoader />}>
              <Routes>
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

                <Route path="/admin-legacy" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
                <Route path="*" element={<PublicLayout />} />
              </Routes>
            </Suspense>
          </AiChatProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
