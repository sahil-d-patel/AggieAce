/**
 * Account Page
 *
 * Displays user's calendar history with download options
 *
 * @module app/account
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Download, Trash2, Clock, BookOpen } from 'lucide-react';
import { getCalendarHistory, downloadCalendarFromHistory, deleteCalendarFromHistory } from '@/lib/api';
import { getAccessToken, isAuthenticated, getUserInfo } from '@/lib/storage';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [calendars, setCalendars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    // Check authentication
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }

    const userInfo = getUserInfo();
    setUser(userInfo);

    // Load calendar history
    loadCalendarHistory();
  }, [router]);

  const loadCalendarHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const accessToken = getAccessToken();

      console.log('Access token:', accessToken ? 'Present' : 'Missing');

      const response = await getCalendarHistory(accessToken);
      setCalendars(response.data.calendars);
    } catch (err) {
      console.error('Error loading calendar history:', err);
      console.error('Error details:', err.response?.data || err.message);

      // Show more specific error message
      const errorMessage = err.response?.data?.message || err.message || 'Failed to load calendar history. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (calendar) => {
    try {
      const accessToken = getAccessToken();
      const blob = await downloadCalendarFromHistory(calendar.id, accessToken);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${calendar.course_name.replace(/[^a-z0-9]/gi, '_')}_${calendar.section_number}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading calendar:', err);
      alert('Failed to download calendar. Please try again.');
    }
  };

  const handleDelete = async (calendarId) => {
    if (!confirm('Are you sure you want to delete this calendar from your history?')) {
      return;
    }

    try {
      setDeletingId(calendarId);
      const accessToken = getAccessToken();
      await deleteCalendarFromHistory(calendarId, accessToken);

      // Remove from local state
      setCalendars(calendars.filter(cal => cal.id !== calendarId));
    } catch (err) {
      console.error('Error deleting calendar:', err);
      alert('Failed to delete calendar. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCreatedAt = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-tamu-maroon to-tamu-maroon-dark">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/')}
            className="text-white hover:text-tamu-gray mb-4 flex items-center space-x-2"
          >
            <span>←</span>
            <span>Back to Home</span>
          </button>
          <div className="flex items-center space-x-4">
            <div className="bg-tamu-white text-tamu-maroon w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">{user?.name || 'User'}</h1>
              <p className="text-tamu-white/80">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Calendar History */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="flex items-center space-x-3 mb-6">
            <Calendar className="text-tamu-maroon" size={32} />
            <h2 className="text-2xl font-bold text-tamu-maroon">Calendar History</h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-tamu-maroon"></div>
              <p className="mt-4 text-gray-600">Loading your calendars...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600">{error}</p>
              <button
                onClick={loadCalendarHistory}
                className="mt-4 bg-tamu-maroon text-white px-6 py-2 rounded-lg hover:bg-tamu-maroon-dark"
              >
                Try Again
              </button>
            </div>
          ) : calendars.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-600 text-lg">No calendars yet</p>
              <p className="text-gray-500 mt-2">
                Convert a syllabus to create your first calendar!
              </p>
              <button
                onClick={() => router.push('/')}
                className="mt-6 bg-tamu-maroon text-white px-6 py-3 rounded-lg hover:bg-tamu-maroon-dark transition-all duration-200 font-semibold"
              >
                Create Calendar
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {calendars.map((calendar) => (
                <div
                  key={calendar.id}
                  className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <BookOpen className="text-tamu-maroon" size={24} />
                        <h3 className="text-xl font-bold text-tamu-maroon">
                          {calendar.course_name}
                        </h3>
                        <span className="bg-tamu-maroon text-white px-3 py-1 rounded-full text-sm font-semibold">
                          Section {calendar.section_number}
                        </span>
                      </div>

                      <div className="ml-9 space-y-1 text-gray-600">
                        <p className="flex items-center space-x-2">
                          <Calendar size={16} />
                          <span>
                            {formatDate(calendar.semester_start)} - {formatDate(calendar.semester_end)}
                          </span>
                        </p>
                        <p className="flex items-center space-x-2">
                          <Clock size={16} />
                          <span className="text-sm">
                            Created on {formatCreatedAt(calendar.created_at)}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => handleDownload(calendar)}
                        className="flex items-center space-x-2 bg-tamu-maroon text-white px-4 py-2 rounded-lg hover:bg-tamu-maroon-dark transition-all duration-200 font-semibold"
                        title="Download ICS file"
                      >
                        <Download size={18} />
                        <span>Download</span>
                      </button>
                      <button
                        onClick={() => handleDelete(calendar.id)}
                        disabled={deletingId === calendar.id}
                        className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all duration-200 font-semibold disabled:opacity-50"
                        title="Delete from history"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
