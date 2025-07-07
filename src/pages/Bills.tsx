import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Receipt, CheckCircle, Clock, AlertTriangle, Calendar, Filter } from 'lucide-react';
import toast from 'react-hot-toast';

const Bills: React.FC = () => {
  const { storeDeliveries, individualDeliveries, returns, refreshData } = useApp();
  const [bills, setBills] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'paid', label: 'Lunas' },
    { value: 'overdue', label: 'Terlambat' }
  ];

  const typeOptions = [
    { value: 'store', label: 'Toko' },
    { value: 'individual', label: 'Perorangan' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const generateBills = () => {
    const generatedBills: any[] = [];
    
    // Generate bills from deliveries with specific statuses: invoiced, pending, delivered
    const eligibleStoreDeliveries = storeDeliveries.filter((delivery: any) => 
      ['invoiced', 'pending', 'delivered'].includes(delivery.status)
    );
    
    const eligibleIndividualDeliveries = individualDeliveries.filter((delivery: any) => 
      ['pending', 'completed'].includes(delivery.status)
    );
    
    // Process store deliveries
    eligibleStoreDeliveries.forEach((delivery: any) => {
      const deliveryType = 'store';
      
      // Calculate return amount for this delivery
      const returnAmount = returns
        .filter((r: any) => 
          r.delivery_id === delivery.id && 
          r.delivery_type === deliveryType &&
          r.status === 'completed'
        )
        .reduce((sum: number, r: any) => sum + r.total_amount, 0);

      // Calculate due date (30 days from delivery)
      const deliveryDate = new Date(delivery.delivery_date);
      const dueDate = new Date(deliveryDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const bill = {
        id: `${deliveryType}-${delivery.id}`,
        delivery_type: deliveryType,
        delivery_id: delivery.id,
        delivery_info: delivery.store_name,
        city_name: delivery.city_name || '',
        delivery_date: delivery.delivery_date,
        due_date: dueDate.toISOString().split('T')[0],
        original_amount: delivery.total_amount,
        return_amount: returnAmount,
        final_amount: delivery.total_amount - returnAmount,
        status: delivery.status === 'invoiced' ? 'pending' : 'pending',
        delivery_status: delivery.status
      };
      
      generatedBills.push(bill);
    });

    // Process individual deliveries
    eligibleIndividualDeliveries.forEach((delivery: any) => {
      const deliveryType = 'individual';
      
      // Calculate return amount for this delivery
      const returnAmount = returns
        .filter((r: any) => 
          r.delivery_id === delivery.id && 
          r.delivery_type === deliveryType &&
          r.status === 'completed'
        )
        .reduce((sum: number, r: any) => sum + r.total_amount, 0);

      // Calculate due date (30 days from purchase)
      const purchaseDate = new Date(delivery.purchase_date);
      const dueDate = new Date(purchaseDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const bill = {
        id: `${deliveryType}-${delivery.id}`,
        delivery_type: deliveryType,
        delivery_id: delivery.id,
        delivery_info: delivery.customer_name,
        city_name: '',
        delivery_date: delivery.purchase_date,
        due_date: dueDate.toISOString().split('T')[0],
        original_amount: delivery.total_amount,
        return_amount: returnAmount,
        final_amount: delivery.total_amount - returnAmount,
        status: delivery.status === 'completed' ? 'pending' : 'pending',
        delivery_status: delivery.status
      };
      
      generatedBills.push(bill);
    });

    return generatedBills;
  };

  React.useEffect(() => {
    const generatedBills = generateBills();
    setBills(generatedBills);
  }, [storeDeliveries, individualDeliveries, returns]);

  const handleStatusUpdate = async (billId: string, newStatus: string) => {
    try {
      setBills(prevBills => 
        prevBills.map(bill => 
          bill.id === billId ? { ...bill, status: newStatus } : bill
        )
      );
      toast.success('Status tagihan berhasil diperbarui');
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const getStatusBadge = (status: string, dueDate: string) => {
    const isOverdue = new Date(dueDate) < new Date() && status === 'pending';
    
    if (isOverdue) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertTriangle className="w-3 h-3 mr-1" />
          Terlambat
        </span>
      );
    }

    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending', icon: Clock },
      paid: { color: 'bg-green-100 text-green-800', label: 'Lunas', icon: CheckCircle }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getDeliveryTypeBadge = (type: string) => {
    const typeConfig = {
      store: { color: 'bg-blue-100 text-blue-800', label: 'Toko' },
      individual: { color: 'bg-purple-100 text-purple-800', label: 'Perorangan' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.store;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getDeliveryStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      delivered: { color: 'bg-blue-100 text-blue-800', label: 'Terkirim' },
      invoiced: { color: 'bg-purple-100 text-purple-800', label: 'Titip Nota' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Selesai' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredBills = bills.filter((bill: any) => {
    // Filter by status
    if (filterStatus === 'overdue') {
      const isOverdue = new Date(bill.due_date) < new Date() && bill.status === 'pending';
      if (!isOverdue) return false;
    } else if (filterStatus && bill.status !== filterStatus) {
      return false;
    }
    
    // Filter by type
    if (filterType && bill.delivery_type !== filterType) return false;
    
    // Filter by date range
    if (dateFilter.start && bill.delivery_date < dateFilter.start) return false;
    if (dateFilter.end && bill.delivery_date > dateFilter.end) return false;
    
    return true;
  });

  const totalAmount = filteredBills.reduce((sum: number, bill: any) => sum + bill.final_amount, 0);
  const pendingAmount = filteredBills
    .filter((bill: any) => bill.status === 'pending')
    .reduce((sum: number, bill: any) => sum + bill.final_amount, 0);
  const overdueCount = filteredBills
    .filter((bill: any) => new Date(bill.due_date) < new Date() && bill.status === 'pending')
    .length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Tagihan</h1>
          <p className="text-gray-600 mt-1">Kelola tagihan dari pengiriman yang telah selesai</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50 mr-4">
              <Receipt className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Tagihan</p>
              <p className="text-2xl font-bold text-gray-900">{filteredBills.length}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50 mr-4">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Nilai</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-yellow-50 mr-4">
              <Clock className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Belum Lunas</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(pendingAmount)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-red-50 mr-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Terlambat</p>
              <p className="text-2xl font-bold text-red-600">{overdueCount}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value.toString())}
            options={[{ value: '', label: 'Semua Status' }, ...statusOptions]}
          />
          <Select
            label="Filter Tipe"
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={[{ value: '', label: 'Semua Tipe' }, ...typeOptions]}
          />
          <Input
            label="Tanggal Mulai"
            type="date"
            value={dateFilter.start}
            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={dateFilter.end}
            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
          />
          <Button
            variant="secondary"
            icon={Filter}
            onClick={() => {
              setFilterStatus('');
              setFilterType('');
              setDateFilter({ start: '', end: '' });
            }}
          >
            Reset Filter
          </Button>
        </div>
      </Card>

      <Card padding={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID Pengiriman</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Tujuan</TableHead>
              <TableHead>Status Pengiriman</TableHead>
              <TableHead>Tanggal Kirim</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Tagihan Awal</TableHead>
              <TableHead>Retur</TableHead>
              <TableHead>Tagihan Akhir</TableHead>
              <TableHead>Status Tagihan</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredBills.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="text-center py-8">
                  <Receipt className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data tagihan</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredBills.map((bill: any) => (
                <TableRow key={bill.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Receipt className="h-4 w-4 text-gray-400 mr-2" />
                      #{bill.delivery_id}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDeliveryTypeBadge(bill.delivery_type)}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{bill.delivery_info}</p>
                      {bill.city_name && (
                        <p className="text-sm text-gray-500">{bill.city_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getDeliveryStatusBadge(bill.delivery_status)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(bill.delivery_date).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`${new Date(bill.due_date) < new Date() && bill.status === 'pending' ? 'text-red-600 font-medium' : ''}`}>
                      {new Date(bill.due_date).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(bill.original_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={bill.return_amount > 0 ? 'text-red-600 font-medium' : 'text-gray-500'}>
                      {bill.return_amount > 0 ? `-${formatCurrency(bill.return_amount)}` : '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      {formatCurrency(bill.final_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(bill.status, bill.due_date)}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {bill.status !== 'paid' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={CheckCircle}
                          onClick={() => handleStatusUpdate(bill.id, 'paid')}
                        >
                          Lunas
                        </Button>
                      )}
                      {bill.status === 'paid' && (
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Clock}
                          onClick={() => handleStatusUpdate(bill.id, 'pending')}
                        >
                          Pending
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default Bills;