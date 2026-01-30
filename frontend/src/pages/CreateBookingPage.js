import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../components/DashboardLayout';
import axios from '../utils/axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { SECTOR_TYPES, PAYMENT_TYPES, PAYMENT_MODES } from '../utils/constants';

export default function CreateBookingPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  
  const [formData, setFormData] = useState({
    pax_name: '',
    contact_person: '',
    contact_number: '',
    pnr: '',
    airline: '',
    supplier_id: '',
    our_cost: '',
    sale_price: '',
    sector_type: SECTOR_TYPES.ONE_WAY,
    payment_type: PAYMENT_TYPES.FULL_PAYMENT,
    travel_legs: [{ travel_date: '', from_location: '', to_location: '', return_date: '' }],
    note: '',
    installments: []
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await axios.get('/suppliers');
      setSuppliers(response.data);
    } catch (error) {
      toast.error('Error loading suppliers');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLegChange = (index, field, value) => {
    const newLegs = [...formData.travel_legs];
    newLegs[index][field] = value;
    setFormData(prev => ({ ...prev, travel_legs: newLegs }));
  };

  const addTravelLeg = () => {
    setFormData(prev => ({
      ...prev,
      travel_legs: [...prev.travel_legs, { travel_date: '', from_location: '', to_location: '', return_date: '' }]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const bookingData = {
        pax_name: formData.pax_name,
        contact_person: formData.contact_person || null,
        contact_number: formData.contact_number,
        pnr: formData.pnr,
        airline: formData.airline,
        supplier_id: formData.supplier_id,
        our_cost: parseFloat(formData.our_cost),
        sale_price: parseFloat(formData.sale_price),
        payment_type: formData.payment_type,
        travel_details: {
          sector_type: formData.sector_type,
          legs: formData.travel_legs.filter(leg => leg.travel_date && leg.from_location && leg.to_location),
          note: formData.note || null
        },
        installments: formData.payment_type === PAYMENT_TYPES.INSTALLMENTS ? formData.installments : null
      };

      await axios.post('/bookings', bookingData);
      toast.success('Booking created successfully!');
      navigate('/bookings');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error creating booking');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Create Booking</h1>
          <p className="text-sm text-slate-600 mt-1">Fill in the booking details</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Passenger Details */}
          <Card>
            <CardHeader>
              <CardTitle>Passenger & Contact Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pax_name">Passenger Name *</Label>
                <Input
                  id="pax_name"
                  name="pax_name"
                  required
                  value={formData.pax_name}
                  onChange={handleInputChange}
                  data-testid="pax-name-input"
                />
              </div>
              <div>
                <Label htmlFor="contact_person">Contact Person</Label>
                <Input
                  id="contact_person"
                  name="contact_person"
                  value={formData.contact_person}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="contact_number">Contact Number *</Label>
                <Input
                  id="contact_number"
                  name="contact_number"
                  required
                  value={formData.contact_number}
                  onChange={handleInputChange}
                  data-testid="contact-number-input"
                />
              </div>
              <div>
                <Label htmlFor="pnr">PNR *</Label>
                <Input
                  id="pnr"
                  name="pnr"
                  required
                  value={formData.pnr}
                  onChange={handleInputChange}
                  className="font-mono"
                  data-testid="pnr-input"
                />
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
                <Label>Sector Type *</Label>
                <RadioGroup
                  value={formData.sector_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, sector_type: value }))}
                  className="flex gap-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={SECTOR_TYPES.ONE_WAY} id="one_way" />
                    <Label htmlFor="one_way" className="font-normal cursor-pointer">One Way</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={SECTOR_TYPES.ROUND_TRIP} id="round_trip" />
                    <Label htmlFor="round_trip" className="font-normal cursor-pointer">Round Trip</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={SECTOR_TYPES.MULTIPLE} id="multiple" />
                    <Label htmlFor="multiple" className="font-normal cursor-pointer">Multiple</Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.travel_legs.map((leg, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-slate-200 rounded-md">
                  <div>
                    <Label>Travel Date *</Label>
                    <Input
                      type="date"
                      value={leg.travel_date}
                      onChange={(e) => handleLegChange(index, 'travel_date', e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label>From *</Label>
                    <Input
                      value={leg.from_location}
                      onChange={(e) => handleLegChange(index, 'from_location', e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  <div>
                    <Label>To *</Label>
                    <Input
                      value={leg.to_location}
                      onChange={(e) => handleLegChange(index, 'to_location', e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                  {formData.sector_type === SECTOR_TYPES.ROUND_TRIP && (
                    <div>
                      <Label>Return Date</Label>
                      <Input
                        type="date"
                        value={leg.return_date}
                        onChange={(e) => handleLegChange(index, 'return_date', e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}

              {formData.sector_type === SECTOR_TYPES.MULTIPLE && (
                <Button type="button" variant="outline" onClick={addTravelLeg}>
                  Add More Leg
                </Button>
              )}

              <div>
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  name="note"
                  value={formData.note}
                  onChange={handleInputChange}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Commercial Details */}
          <Card>
            <CardHeader>
              <CardTitle>Commercial Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="airline">Airline *</Label>
                <Input
                  id="airline"
                  name="airline"
                  required
                  value={formData.airline}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="supplier_id">Supplier *</Label>
                <Select
                  value={formData.supplier_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, supplier_id: value }))}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="our_cost">Our Cost *</Label>
                <Input
                  id="our_cost"
                  name="our_cost"
                  type="number"
                  step="0.01"
                  required
                  value={formData.our_cost}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <Label htmlFor="sale_price">Sale Price *</Label>
                <Input
                  id="sale_price"
                  name="sale_price"
                  type="number"
                  step="0.01"
                  required
                  value={formData.sale_price}
                  onChange={handleInputChange}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate('/bookings')}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} data-testid="submit-booking-btn">
              {loading ? 'Creating...' : 'Create Booking'}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
