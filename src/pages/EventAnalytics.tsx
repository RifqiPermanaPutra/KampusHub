/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, UserCheck, Hourglass, Percent } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { rsvpService } from '../services/rsvpService';
import { buildEventAnalytics, EventAnalytics as Analytics } from '../lib/analytics';
import { Event } from '../types';
import { SimpleBarChart, TimelineChart } from '../components/charts/SimpleBarChart';
import { usePageTitle } from '../lib/usePageTitle';

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent: string }) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${accent}`}>
        {icon}
      </div>
      <p className="text-3xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">{label}</p>
    </div>
  );
}

export function EventAnalytics() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [event, setEvent] = useState<Event | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  usePageTitle('Analitik Event');

  useEffect(() => {
    if (!id || !profile) return;
    const load = async () => {
      const e = await eventService.getEventById(id);
      if (!e) {
        setLoading(false);
        return;
      }
      if (profile.role !== 'admin' && profile.uid !== e.organizerId) {
        navigate('/'); // bukan penyelenggara event ini
        return;
      }
      setEvent(e);
      const rsvps = await rsvpService.getRSVPsForEvent(id);
      setAnalytics(buildEventAnalytics(rsvps));
      setLoading(false);
    };
    load();
  }, [id, profile, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  if (!event || !analytics) {
    return <div className="text-center p-20 text-gray-400">Event tidak ditemukan.</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <div>
          <h2 className="editorial-title text-4xl font-bold text-campus-blue">Analitik Event</h2>
          <p className="text-gray-500 font-medium">{event.title}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<Users size={20} />} label="Terdaftar" value={analytics.registered} accent="bg-blue-50 text-campus-blue" />
        <StatCard icon={<UserCheck size={20} />} label="Check-in" value={analytics.checkedIn} accent="bg-green-50 text-green-600" />
        <StatCard icon={<Percent size={20} />} label="Tingkat Kehadiran" value={`${analytics.attendanceRate}%`} accent="bg-purple-50 text-purple-600" />
        <StatCard icon={<Hourglass size={20} />} label="Daftar Tunggu" value={analytics.waitlist} accent="bg-amber-50 text-amber-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Peserta per Fakultas</h3>
          <SimpleBarChart data={analytics.byFakultas} />
        </div>
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-lg text-gray-900 mb-6">Peserta per Angkatan</h3>
          <SimpleBarChart data={analytics.byAngkatan} color="bg-purple-500" />
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <h3 className="font-bold text-lg text-gray-900 mb-6">Timeline Pendaftaran</h3>
        <TimelineChart data={analytics.timeline} />
      </div>
    </div>
  );
}
