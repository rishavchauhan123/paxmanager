import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import {
  formatCurrency,
  formatDateTime,
  getStatusColor,
  getStatusLabel,
  calculateTotalPaid,
  calculateBalance
} from '../utils/helpers';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function BookingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchBooking = useCallback(async () => {
    try {
      const response = await axios.get(`/bookings/${id}`);
      setBooking(response.data);
    } catch (error) {
      toast.error('Error loading booking');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  const handleSubmit = async () => {
    try {
      await axios.put(`/bookings/${id}/submit`);
      toast.success('Booking submitted for verification');
      fetchBooking();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error submitting booking');
    }
  };

  const handleAccountVerify = async () => {
    try {
      await axios.put(`/bookings/${id}/verify-account`);
      toast.success('Booking verified by Account');
      fetchBooking();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error verifying booking');
    }
  };

  const handleAdminVerify = async () => {
    try {
      await axios.put(`/bookings/${id}/verify-admin`);
      toast.success('Booking verified by Admin');
      fetchBooking();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error verifying booking');
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  const totalPaid = calculateTotalPaid(booking?.installments);
  const balance = calculateBalance(booking?.sale_price, booking?.installments);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Booking Details
            </h1>
            <p className="text-sm text-slate-600 mt-1 font-mono">
              {booking?.pnr}
            </p>
          </div>
          <Badge className={getStatusColor(booking?.status)}>
            {getStatusLabel(booking?.status)}
          </Badge>
        </div>

        {/* Actions */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-4">
              {user?.role === 'agent1' && booking?.status === 'draft' && (
                <Button onClick={handleSubmit}>
                  Submit for Verification
                </Button>
              )}

              {(user?.role === 'account' || user?.role === 'admin') &&
                booking?.status === 'pending_verification' && (
                  <Button onClick={handleAccountVerify}>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Verify (Account)
                  </Button>
                )}

              {user?.role === 'admin' &&
                booking?.status === 'account_verified' && (
                  <Button onClick={handleAdminVerify}>
                    <CheckCircle2 className="h-5 w-5 mr-2" />
                    Verify (Admin)
                  </Button>
                )}
            </div>
          </CardContent>
        </Card>

        {/* rest of your JSX remains unchanged */}
      </div>
    </DashboardLayout>
  );
}
