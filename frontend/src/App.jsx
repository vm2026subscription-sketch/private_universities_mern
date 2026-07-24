  import { Suspense, lazy, useEffect, useState } from 'react';
  import { Routes, Route, Navigate } from 'react-router-dom';
  import { Toaster } from 'react-hot-toast';
  import { ThemeProvider } from './context/ThemeContext';
  import { AuthProvider } from './context/AuthContext';
  import { AiChatProvider } from './context/AiChatContext';
  import ErrorBoundary from './components/common/ErrorBoundary';
  import ProtectedRoute from './components/common/ProtectedRoute';
  import Navbar from './components/layout/Navbar';
  import Footer from './components/layout/Footer';
  import MobileNav from './components/layout/MobileNav';
  import StickyBottomBanner from './components/ads/StickyBottomBanner';
  import SocialFloatButtons from './components/layout/SocialFloatButtons';
  import FeedbackWidget from './components/layout/FeedbackWidget';
  import PreferencesModal from './components/common/PreferencesModal';

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
  const OpenChatRoute = lazy(() => import('./pages/OpenChatRoute'));
  const RankPredictor = lazy(() => import('./pages/RankPredictor'));
  const NotFound = lazy(() => import('./pages/NotFound'));
  const Contact = lazy(() => import('./pages/Contact'));
  const About = lazy(() => import('./pages/About'));
  const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
  const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions'));
  const RefundPolicy = lazy(() => import('./pages/RefundPolicy'));
  const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
  const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
  const UsersManager = lazy(() => import('./pages/admin/UsersManager'));
  const LeadsManager = lazy(() => import('./pages/admin/LeadsManager'));
  const UniversitiesManager = lazy(() => import('./pages/admin/UniversitiesManager'));
  const CoursesManager = lazy(() => import('./pages/admin/CoursesManager'));
  const ExamsManager = lazy(() => import('./pages/admin/ExamsManager'));
  const NewsManager = lazy(() => import('./pages/admin/NewsManager'));
  const BannersManager = lazy(() => import('./pages/admin/BannersManager'));
  const BannerAnalytics = lazy(() => import('./pages/admin/BannerAnalytics'));
  const TestimonialsManager = lazy(() => import('./pages/admin/TestimonialsManager'));
  const PagesManager = lazy(() => import('./pages/admin/PagesManager'));
  const FAQManager = lazy(() => import('./pages/admin/FAQManager'));
  const ContactManager = lazy(() => import('./pages/admin/ContactManager'));
  const NotificationsManager = lazy(() => import('./pages/admin/NotificationsManager'));
  const NewsletterManager = lazy(() => import('./pages/admin/NewsletterManager'));
  const SiteSettingsManager = lazy(() => import('./pages/admin/SiteSettingsManager'));
  const AuditLogViewer = lazy(() => import('./pages/admin/AuditLogViewer'));
  const PartnerDashboard = lazy(() => import('./pages/admin/PartnerDashboard'));
  const ExcelUploader = lazy(() => import('./pages/admin/ExcelUploader'));
  const AiChatWidget = lazy(() => import('./components/common/AiChatWidget'));

  function PageLoader() {
    return (
      <div className="max-w-7xl mx-auto px-4 py-10 space-y-6" role="status" aria-busy="true" aria-label="Loading page">
        <div className="h-40 skeleton rounded-2xl w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-52 skeleton rounded-2xl" />
          <div className="h-52 skeleton rounded-2xl" />
          <div className="h-52 skeleton rounded-2xl" />
        </div>
        <span className="sr-only">Loading page…</span>
      </div>
    );
  }

  function DeferredAiChatWidget() {
    const [enabled, setEnabled] = useState(false);

    useEffect(() => {
      if (typeof window === 'undefined') return undefined;

      const enableWidget = () => setEnabled(true);

      if ('requestIdleCallback' in window) {
        const idleId = window.requestIdleCallback(enableWidget, { timeout: 2500 });
        return () => window.cancelIdleCallback?.(idleId);
      }

      const timeoutId = window.setTimeout(enableWidget, 1800);
      return () => window.clearTimeout(timeoutId);
    }, []);

    if (!enabled) return null;

    return (
      <Suspense fallback={null}>
        <AiChatWidget />
      </Suspense>
    );
  }

  function PublicLayout() {
    return (
      <div className="min-h-screen bg-transparent text-light-text dark:text-dark-text relative">
        <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#f8fafc] dark:bg-dark-bg transition-colors duration-500" />

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[200] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-primary focus:text-white focus:shadow-lg"
        >
          Skip to content
        </a>

        <Navbar />
        <main id="main-content" className="pb-16 md:pb-0">
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
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-and-conditions" element={<TermsAndConditions />} />
          <Route path="/refund-cancellation" element={<RefundPolicy />} />
          <Route path="/uploadxl" element={<ProtectedRoute adminOnly><ExcelUploader /></ProtectedRoute>} />

          <Route path="*" element={<NotFound />} />
        </Routes>
        </main>
        <Footer />
        <MobileNav />
        <StickyBottomBanner page="home" />
        <SocialFloatButtons />
        <FeedbackWidget />
        <DeferredAiChatWidget />
        <PreferencesModal />
      </div>
    );
  }

  export default function App() {
    return (
      <ErrorBoundary>
        <ThemeProvider>
          <AuthProvider>
            <AiChatProvider>
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3500,
                  style: {
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 500,
                    padding: '10px 14px',
                    boxShadow: '0 10px 30px -10px rgba(15,23,42,0.25)',
                  },
                  success: { iconTheme: { primary: '#10B981', secondary: '#ffffff' } },
                  error: { iconTheme: { primary: '#EF4444', secondary: '#ffffff' } },
                }}
              />
              <Suspense fallback={<PageLoader />}>
                <Routes>

                  <Route path="/admin" element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
                    <Route index element={<AdminOverview />} />
                    <Route path="universities" element={<UniversitiesManager />} />
                    <Route path="leads" element={<LeadsManager />} />
                    <Route path="courses" element={<CoursesManager />} />
                    <Route path="exams" element={<ExamsManager />} />
                    <Route path="news" element={<NewsManager />} />
                    <Route path="users" element={<UsersManager />} />
                    <Route path="banners" element={<BannersManager />} />
                    <Route path="banner-analytics" element={<BannerAnalytics />} />
                    <Route path="testimonials" element={<TestimonialsManager />} />
                    <Route path="pages" element={<PagesManager />} />
                    <Route path="faqs" element={<FAQManager />} />
                    <Route path="contacts" element={<ContactManager />} />
                    <Route path="notifications" element={<NotificationsManager />} />
                    <Route path="newsletter" element={<NewsletterManager />} />
                    <Route path="settings" element={<SiteSettingsManager />} />
                    <Route path="audit-logs" element={<AuditLogViewer />} />
                    <Route path="data-import" element={<ExcelUploader />} />
                    <Route path="partner/:universityId" element={<PartnerDashboard />} />
                  </Route>

                  <Route path="/admin-legacy" element={<Navigate to="/admin" replace />} />
                  <Route path="*" element={<PublicLayout />} />
                </Routes>
              </Suspense>
            </AiChatProvider>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    );
  }
