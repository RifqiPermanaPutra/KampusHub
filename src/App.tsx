/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { Layout } from './components/Layout';
import { Guard } from './components/Guard';
import { PageLoader } from './components/PageLoader';

/*
 * Tiap halaman dimuat terpisah (code splitting). Halaman berat seperti scanner
 * (html5-qrcode), form event (AI), dan sertifikat (jsPDF) baru diunduh saat
 * dibuka, sehingga kunjungan pertama jauh lebih ringan.
 */
const Home = lazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const ExploreEvents = lazy(() => import('./pages/ExploreEvents').then(m => ({ default: m.ExploreEvents })));
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const CompleteProfile = lazy(() => import('./pages/CompleteProfile').then(m => ({ default: m.CompleteProfile })));
const EventDetail = lazy(() => import('./pages/EventDetail').then(m => ({ default: m.EventDetail })));
const CreateEvent = lazy(() => import('./pages/CreateEvent').then(m => ({ default: m.CreateEvent })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const MyRSVPs = lazy(() => import('./pages/MyRSVPs').then(m => ({ default: m.MyRSVPs })));
const SavedEvents = lazy(() => import('./pages/SavedEvents').then(m => ({ default: m.SavedEvents })));
const TicketScanner = lazy(() => import('./pages/TicketScanner').then(m => ({ default: m.TicketScanner })));
const EventAnalytics = lazy(() => import('./pages/EventAnalytics').then(m => ({ default: m.EventAnalytics })));
const VerifyCertificate = lazy(() => import('./pages/VerifyCertificate').then(m => ({ default: m.VerifyCertificate })));

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
        <Suspense fallback={<PageLoader />}>
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
            <Route path="/saved" element={<Guard><SavedEvents /></Guard>} />
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
        </Suspense>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}
