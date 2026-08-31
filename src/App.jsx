import { Routes, Route } from 'react-router-dom';
import AdminLayout from './layout/AdminLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ReviewAuthorizer from './pages/ReviewAuthorizer.jsx';
import BlogListing from './pages/BlogListing.jsx';
import ManageListings from './pages/ManageListings.jsx';
import UserManagement from './pages/UserManagement.jsx';
import Inquiries from './pages/Inquiries.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/reviews" element={<ReviewAuthorizer />} />
        <Route path="/blogs" element={<BlogListing />} />
        <Route path="/listings" element={<ManageListings />} />
        <Route path="/users" element={<UserManagement />} />
        <Route path="/inquiries" element={<Inquiries />} />
      </Route>
    </Routes>
  );
}
