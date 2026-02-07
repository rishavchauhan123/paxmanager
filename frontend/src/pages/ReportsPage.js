import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Download } from 'lucide-react';
import { logError } from '../lib/logger';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
  });
  const [outstandingBalance, setOutstandingBalance] = useState([]);

  useEffect(() => {
    const fetchOutstandingBalance = async () => {
      try {
        const response = await axios.get('/reports/outstanding-balance');
        setOutstandingBalance(response.data);
      } catch (error) {
        logError('Error fetching outstanding balance:', error);
      }
    };

    fetchOutstandingBalance();
  }, []);

  const handleDownloadPDF = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/reports/bookings/pdf', filters, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bookings_report.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF report downloaded');
    } catch (error) {
      toast.error('Error downloading PDF report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    setLoading(true);
    try {
      const response = await axios.post('/reports/bookings/excel', filters, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bookings_report.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Excel report downloaded');
    } catch (error) {
      toast.error('Error downloading Excel report');
    } finally {
      setLoading(false);
    }
  };

  const totalOutstanding = outstandingBalance.reduce((sum, item) => sum + item.balance, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Reports</h1>
          <p className="text-sm text-slate-600 mt-1">Generate and download booking reports</p>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Report Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_date">Start Date</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="end_date">End Date</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={handleDownloadPDF} disabled={loading} data-testid="download-pdf-btn">
                <Download className="h-5 w-5 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handleDownloadExcel} disabled={loading} variant="outline" data-testid="download-excel-btn">
                <Download className="h-5 w-5 mr-2" />
                Download Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outstanding Balance */}
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Balance Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">PNR</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Passenger</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Supplier</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Sale Price</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Total Paid</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-700 uppercase">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {outstandingBalance.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                        No outstanding balances
                      </td>
                    </tr>
                  ) : (
                    outstandingBalance.map((item) => (
                      <tr key={item.booking_id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-mono font-medium text-slate-900">{item.pnr}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.pax_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-900">{item.supplier_name}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right text-slate-900">${item.sale_price.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right text-green-600">${item.total_paid.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-mono text-right text-red-600 font-medium">${item.balance.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                  {outstandingBalance.length > 0 && (
                    <tr className="bg-slate-50 font-semibold">
                      <td colSpan="5" className="px-4 py-3 text-sm text-right text-slate-900">Total Outstanding:</td>
                      <td className="px-4 py-3 text-sm font-mono text-right text-red-600 font-bold">${totalOutstanding.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
