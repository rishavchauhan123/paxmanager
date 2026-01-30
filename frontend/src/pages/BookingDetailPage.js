import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from '../utils/axios';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel, calculateTotalPaid, calculateBalance } from '../utils/helpers';
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

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const fetchBooking = async () => {
    try {
      const response = await axios.get(`/bookings/${id}`);
      setBooking(response.data);
    } catch (error) {
      toast.error('Error loading booking');
      navigate('/bookings');
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Booking Details</h1>
            <p className="text-sm text-slate-600 mt-1 font-mono">{booking?.pnr}</p>
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
                <Button onClick={handleSubmit} data-testid="submit-booking-btn">
                  Submit for Verification
                </Button>
              )}
              {(user?.role === 'account' || user?.role === 'admin') && booking?.status === 'pending_verification' && (
                <Button onClick={handleAccountVerify} data-testid="account-verify-btn">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Verify (Account)
                </Button>
              )}
              {user?.role === 'admin' && booking?.status === 'account_verified' && (
                <Button onClick={handleAdminVerify} data-testid="admin-verify-btn">
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Verify (Admin)
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Passenger & Contact Details */}
        <Card>
          <CardHeader>
            <CardTitle>Passenger & Contact Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Passenger Name</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{booking?.pax_name}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Contact Person</p>
              <p className="text-sm text-slate-900 mt-1">{booking?.contact_person || 'N/A'}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Contact Number</p>
              <p className="text-sm font-mono text-slate-900 mt-1">{booking?.contact_number}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">PNR</p>
              <p className="text-sm font-mono font-medium text-slate-900 mt-1">{booking?.pnr}</p>
            </div>
          </CardContent>
        </Card>

        {/* Travel Details */}
        <Card>
          <CardHeader>
            <CardTitle>Travel Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Airline</p>
              <p className="text-sm font-medium text-slate-900 mt-1">{booking?.airline}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase mb-2">Travel Legs</p>
              {booking?.travel_details?.legs?.map((leg, index) => (
                <div key={index} className="p-3 bg-slate-50 rounded-md mb-2">
                  <p className="text-sm text-slate-900">
                    {leg.from_location} → {leg.to_location} on {leg.travel_date}
                    {leg.return_date && ` (Return: ${leg.return_date})`}
                  </p>
                </div>
              ))}
            </div>
            {booking?.travel_details?.note && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Note</p>
                <p className="text-sm text-slate-600 mt-1">{booking.travel_details.note}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commercial Details */}
        <Card>
          <CardHeader>
            <CardTitle>Commercial Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Our Cost</p>
              <p className="text-sm font-mono font-medium text-slate-900 mt-1">{formatCurrency(booking?.our_cost)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Sale Price</p>
              <p className="text-sm font-mono font-medium text-slate-900 mt-1">{formatCurrency(booking?.sale_price)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Total Paid</p>
              <p className="text-sm font-mono font-medium text-green-600 mt-1">{formatCurrency(totalPaid)}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Balance</p>
              <p className="text-sm font-mono font-medium text-red-600 mt-1">{formatCurrency(balance)}</p>
            </div>
          </CardContent>
        </Card>

        {/* Timestamps */}
        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase">Created At</p>
              <p className="text-sm text-slate-900 mt-1">{formatDateTime(booking?.created_at)}</p>
            </div>
            {booking?.submitted_at && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Submitted At</p>
                <p className="text-sm text-slate-900 mt-1">{formatDateTime(booking.submitted_at)}</p>
              </div>
            )}
            {booking?.account_verified_at && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Account Verified At</p>
                <p className="text-sm text-slate-900 mt-1">{formatDateTime(booking.account_verified_at)}</p>
              </div>
            )}
            {booking?.admin_verified_at && (
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase">Admin Verified At</p>
                <p className="text-sm text-slate-900 mt-1">{formatDateTime(booking.admin_verified_at)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
