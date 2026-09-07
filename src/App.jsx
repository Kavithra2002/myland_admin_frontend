import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AdminLayout from './layout/AdminLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReviewAuthorizer from './pages/ReviewAuthorizer.jsx';
import BlogListing from './pages/BlogListing.jsx';
import ManageListings from './pages/ManageListings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Inquiries from './pages/Inquiries.jsx';
import Login from './pages/Login.jsx';

function Splash() {
  return (
    <div className="min-h-screen bg-myland-cream flex items-center justify-center text-sm text-myland-slate">
      Loading workspace…
    </div>
  );
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  const location = useLocation();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/reviews" element={<ReviewAuthorizer />} />
        <Route path="/blogs" element={<BlogListing />} />
        <Route path="/listings" element={<ManageListings />} />
        <Route
          path="/users"
          element={
            <ProtectedRoute adminOnly>
              <UserManagement />
            </ProtectedRoute>
          }
        />
        <Route path="/inquiries" element={<Inquiries />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
