/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { eventService } from '../services/eventService';
import { Event, UserProfile } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Check, X, Eye, Edit, Trash2, AlertTriangle, Users, Calendar } from 'lucide-react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function Dashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventToDelete, setEventToDelete] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'users'>('events');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!profile) return;
      
      try {
        if (profile.role === 'admin') {
          const eventsData = await eventService.getAllEvents();
          setEvents(eventsData);
          
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const usersData = usersSnapshot.docs.map(doc => doc.data() as UserProfile);
          setUsers(usersData);
        } else if (profile.role === 'panitia') {
          const data = await eventService.getEventsByOrganizer(profile.uid);
          setEvents(data);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [profile]);

  const handleAction = async (id: string, status: 'approved' | 'rejected') => {
    setActionError('');
    try {
      await eventService.updateEvent(id, { status });
      setEvents(events.map(e => e.id === id ? { ...e, status } : e));
    } catch (err) {
      console.error(err);
      setActionError('Gagal memperbarui status event. Silakan coba lagi.');
    }
  };

  const confirmDelete = async () => {
    if (eventToDelete) {
      setActionError('');
      try {
        await eventService.deleteEvent(eventToDelete);
        setEvents(events.filter(e => e.id !== eventToDelete));
        setEventToDelete(null);
      } catch (err) {
        console.error(err);
        setActionError('Gagal menghapus event. Silakan coba lagi.');
        setEventToDelete(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-campus-blue border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h2 className="editorial-title text-4xl font-bold text-campus-blue">Management Dashboard</h2>
          <p className="text-gray-500">Kelola event dan permintaan Anda.</p>
        </div>
        
        {profile?.role === 'admin' && (
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'events' ? 'bg-blue-50 text-campus-blue' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Calendar size={18} />
              Events
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                activeTab === 'users' ? 'bg-blue-50 text-campus-blue' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <Users size={18} />
              Users
            </button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
          {actionError}
        </div>
      )}

      {activeTab === 'events' ? (
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-xl shadow-blue-900/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Event</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Tanggal</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Status</th>
                  <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-8 py-6">
                      <p className="font-bold text-gray-900 line-clamp-1">{event.title}</p>
                      <p className="text-xs text-gray-400">{event.category}</p>
                    </td>
                    <td className="px-8 py-6 text-sm text-gray-500 whitespace-nowrap">
                      {format(new Date(event.date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-8 py-6 whitespace-nowrap">
                      <Badge variant={event.status === 'approved' ? 'green' : event.status === 'pending' ? 'blue' : 'red'}>
                        {event.status}
                      </Badge>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        <Link to={`/event/${event.id}`}>
                          <Button variant="outline" size="sm" className="p-2" title="Lihat">
                            <Eye size={16} />
                          </Button>
                        </Link>
                        {(profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId)) && (
                          <Link to={`/edit-event/${event.id}`}>
                            <Button variant="outline" size="sm" className="p-2" title="Edit">
                              <Edit size={16} />
                            </Button>
                          </Link>
                        )}
                        {profile?.role === 'admin' && event.status === 'pending' && (
                          <>
                            <Button 
                              onClick={() => handleAction(event.id, 'approved')} 
                              size="sm" 
                              className="p-2 bg-green-600 hover:bg-green-700"
                              title="Approve"
                            >
                              <Check size={16} />
                            </Button>
                            <Button 
                              onClick={() => handleAction(event.id, 'rejected')} 
                              size="sm" 
                              className="p-2 bg-red-600 hover:bg-red-700"
                              title="Reject"
                            >
                              <X size={16} />
                            </Button>
                          </>
                        )}
                        {(profile?.role === 'admin' || (profile?.role === 'panitia' && profile?.uid === event.organizerId)) && (
                          <Button 
                            onClick={() => setEventToDelete(event.id)} 
                            size="sm" 
                            variant="ghost"
                            className="p-2 text-red-500 hover:bg-red-50"
                            title="Delete Event"
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {events.length === 0 && (
            <div className="p-20 text-center text-gray-400 italic">Tidak ada event ditemukan.</div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden shadow-xl shadow-blue-900/5">
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-gray-50 border-b border-gray-100">
                   <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">User</th>
                   <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Role</th>
                   <th className="px-8 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest whitespace-nowrap">Tanggal Bergabung</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-50">
                 {users.map((user) => (
                   <tr key={user.uid} className="hover:bg-gray-50 transition-colors">
                     <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border border-gray-100 shrink-0">
                           <img src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.name}`} alt={user.name} referrerPolicy="no-referrer" />
                         </div>
                         <div>
                           <p className="font-bold text-gray-900 line-clamp-1">{user.name}</p>
                           <p className="text-xs text-gray-400">{user.email}</p>
                         </div>
                       </div>
                     </td>
                     <td className="px-8 py-6 whitespace-nowrap">
                       <Badge variant={user.role === 'admin' ? 'red' : user.role === 'panitia' ? 'purple' : 'blue'}>
                         {user.role}
                       </Badge>
                     </td>
                     <td className="px-8 py-6 text-sm text-gray-500 whitespace-nowrap">
                       {format(new Date(user.createdAt), 'MMM d, yyyy')}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           </div>
           {users.length === 0 && (
             <div className="p-20 text-center text-gray-400 italic">Belum ada users.</div>
           )}
        </div>
      )}

      {eventToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full space-y-6 shadow-2xl">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                <AlertTriangle size={32} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Event?</h3>
                <p className="text-sm text-gray-500">Tindakan ini tidak dapat dibatalkan. Event dan semua RSVP-nya akan dihapus permanen.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setEventToDelete(null)}
              >
                Cancel
              </Button>
              <Button 
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
