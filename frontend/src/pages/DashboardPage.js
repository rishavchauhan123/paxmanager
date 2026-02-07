import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/helpers';
import {
  PlaneTakeoff,
  Clock,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { logError } from '../lib/logger';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await axios.get('/dashboard/stats');
        setStats(response.data);
      } catch (error) {
        logError('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Bookings',
      value: stats?.total_bookings || 0,
      icon: PlaneTakeoff,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Pending Verification',
      value: stats?.pending_verification || 0,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Verified',
      value: (stats?.account_verified || 0) + (stats?.admin_verified || 0),
      icon: CheckCircle2,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.total_revenue || 0),
      icon: DollarSign,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      title: 'Total Margin',
      value: formatCurrency(stats?.total_margin || 0),
      icon: TrendingUp,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Outstanding Balance',
      value: formatCurrency(stats?.outstanding_balance || 0),
      icon: AlertCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Welcome back, {user?.name}
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Here's what's happening with your bookings today.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <Card key={index} className="border-slate-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-md ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} strokeWidth={1.5} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick actions */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-slate-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {user?.role === 'agent1' && (
                <a
                  href="/bookings/create"
                  data-testid="create-booking-quick-action"
                  className="flex items-center p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <PlaneTakeoff className="h-5 w-5 mr-3 text-blue-600" />
                  <span className="text-sm font-medium text-slate-900">Create Booking</span>
                </a>
              )}
              <a
                href="/bookings"
                data-testid="view-bookings-quick-action"
                className="flex items-center p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
              >
                <PlaneTakeoff className="h-5 w-5 mr-3 text-slate-600" />
                <span className="text-sm font-medium text-slate-900">View Bookings</span>
              </a>
              {(user?.role === 'account' || user?.role === 'admin') && (
                <a
                  href="/reports"
                  data-testid="view-reports-quick-action"
                  className="flex items-center p-4 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                >
                  <TrendingUp className="h-5 w-5 mr-3 text-purple-600" />
                  <span className="text-sm font-medium text-slate-900">View Reports</span>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
