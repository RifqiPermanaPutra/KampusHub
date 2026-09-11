/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/Layout';
import { Guard } from './components/Guard';

// Pages
import { Home } from './pages/Home';
import { ExploreEvents } from './pages/ExploreEvents';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { CompleteProfile } from './pages/CompleteProfile';
import { EventDetail } from './pages/EventDetail';
import { CreateEvent } from './pages/CreateEvent';
import { Profile } from './pages/Profile';
import { Notifications } from './pages/Notifications';
import { Dashboard } from './pages/Dashboard';
import { MyRSVPs } from './pages/MyRSVPs';
import { TicketScanner } from './pages/TicketScanner';
import { EventAnalytics } from './pages/EventAnalytics';
import { VerifyCertificate } from './pages/VerifyCertificate';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<Guard><CompleteProfile /></Guard>} />

          {/* Protected Routes */}
          <Route element={<Layout />}>
            <Route path="/" element={<Guard><Home /></Guard>} />
            <Route path="/explore" element={<Guard><ExploreEvents /></Guard>} />
            <Route path="/event/:id" element={<Guard><EventDetail /></Guard>} />
            <Route path="/my-rsvps" element={<Guard><MyRSVPs /></Guard>} />
            <Route path="/profile" element={<Guard><Profile /></Guard>} />
            <Route path="/notifications" element={<Guard><Notifications /></Guard>} />
            <Route path="/dashboard" element={<Guard allowedRoles={['admin', 'panitia']}><Dashboard /></Guard>} />
            <Route path="/event/:id/scanner" element={<Guard allowedRoles={['admin', 'panitia']}><TicketScanner /></Guard>} />
            <Route path="/event/:id/analytics" element={<Guard allowedRoles={['admin', 'panitia']}><EventAnalytics /></Guard>} />
            <Route path="/verify/:code" element={<Guard><VerifyCertificate /></Guard>} />
            
            {/* Panitia / Admin only */}
            <Route 
              path="/create-event" 
              element={
                <Guard allowedRoles={['admin', 'panitia']}>
                  <CreateEvent />
                </Guard>
              } 
            />
            <Route 
              path="/edit-event/:id" 
              element={
                <Guard allowedRoles={['admin', 'panitia']}>
                  <CreateEvent />
                </Guard>
              } 
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
