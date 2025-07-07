import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, RotateCcw, CheckCircle, Printer, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

interface ReturnItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const Returns: React.FC = () => {
  const { returns, storeDeliveries, individualDeliveries, products, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);
  const [editingReturn, setEditingReturn] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  
  const [formData, setFormData] = useState({
    delivery_type: 'store',
    delivery_id: '',
    return_date: '',
    reason: '',
    return_location: '',
    status: 'pending'
  });
  
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [availableItems, setAvailableItems] = useState<any[]>([]);

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'processed', label: 'Diproses' },
    { value: 'completed', label: 'Selesai' }
  ];

  const deliveryTypeOptions = [
    { value: 'store', label: 'Pengiriman Toko' },
    { value: 'individual', label: 'Pengiriman Perorangan' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const calculateTotal = () => {
    return returnItems.reduce((sum, item) => sum + item.total_price, 0);
  };

  const getDeliveryOptions = () => {
    if (formData.delivery_type === 'store') {
      return storeDeliveries
        .filter((delivery: any) => delivery.status === 'completed')
        .map((delivery: any) => ({
          value: delivery.id,
          label: `#${delivery.id} - ${delivery.store_name} (${new Date(delivery.delivery_date).toLocaleDateString('id-ID')})`
        }));
    } else {
      return individualDeliveries
        .filter((delivery: any) => delivery.status === 'completed')
        .map((delivery: any) => ({
          value: delivery.id,
          label: `#${delivery.id} - ${delivery.customer_name} (${new Date(delivery.purchase_date).toLocaleDateString('id-ID')})`
        }));
    }
  };

  const handleDeliveryChange = (deliveryId: string) => {
    setFormData({ ...formData, delivery_id: deliveryId });
    
    // Get available items from selected delivery
    let selectedDelivery;
    if (formData.delivery_type === 'store') {
      selectedDelivery = storeDeliveries.find((d: any) => d.id === parseInt(deliveryId));
    } else {
      selectedDelivery = individualDeliveries.find((d: any) => d.id === parseInt(deliveryId));
    }
    
    if (selectedDelivery && selectedDelivery.items) {
      // Calculate already returned quantities
      const existingReturns = returns.filter((r: any) => 
        r.delivery_id === parseInt(deliveryId) && 
        r.delivery_type === formData.delivery_type &&
        r.status === 'completed'
      );
      
      const items = selectedDelivery.items.map((item: any) => {
        const returnedQty = existingReturns.reduce((sum: number, ret: any) => {
          const returnedItem = ret.items?.find((ri: any) => ri.product_id === item.product_id);
          return sum + (returnedItem?.quantity || 0);
        }, 0);
        
        return {
          ...item,
          max_quantity: Math.max(0, item.quantity - returnedQty),
          original_quantity: item.quantity,
          returned_quantity: returnedQty
        };
      }).filter((item: any) => item.max_quantity > 0);
      
      setAvailableItems(items);
    } else {
      setAvailableItems([]);
    }
    
    // Reset return items when delivery changes
    setReturnItems([]);
  };

  const addReturnItem = () => {
    setReturnItems([...returnItems, {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      total_price: 0
    }]);
  };

  const updateReturnItem = (index: number, field: string, value: any) => {
    const newItems = [...returnItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'product_id') {
      const availableItem = availableItems.find((item: any) => item.product_id === parseInt(value));
      if (availableItem) {
        newItems[index].unit_price = availableItem.unit_price;
        newItems[index].quantity = Math.min(newItems[index].quantity, availableItem.max_quantity);
        newItems[index].total_price = newItems[index].unit_price * newItems[index].quantity;
      }
    } else if (field === 'quantity') {
      const availableItem = availableItems.find((item: any) => item.product_id === newItems[index].product_id);
      if (availableItem && parseInt(value) > availableItem.max_quantity) {
        toast.error(`Maksimal retur untuk produk ini: ${availableItem.max_quantity}`);
        return;
      }
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    } else if (field === 'unit_price') {
      newItems[index].total_price = newItems[index].quantity * newItems[index].unit_price;
    }
    
    setReturnItems(newItems);
  };

  const removeReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const getAvailableProductOptions = () => {
    return availableItems.map((item: any) => ({
      value: item.product_id,
      label: `${item.product_name} (Tersedia: ${item.max_quantity})`
    }));
  };

  const getMaxQuantity = (productId: number) => {
    const availableItem = availableItems.find((item: any) => item.product_id === productId);
    return availableItem ? availableItem.max_quantity : 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (returnItems.length === 0) {
      toast.error('Tambahkan minimal satu item retur');
      return;
    }

    try {
      const returnData = {
        ...formData,
        delivery_id: parseInt(formData.delivery_id),
        total_amount: calculateTotal()
      };

      if (editingReturn) {
        await db.updateReturn(editingReturn.id, returnData, returnItems);
        toast.success('Retur berhasil diperbarui');
      } else {
        await db.addReturn(returnData, returnItems);
        toast.success('Retur berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (returnItem: any) => {
    setEditingReturn(returnItem);
    setFormData({
      delivery_type: returnItem.delivery_type,
      delivery_id: returnItem.delivery_id.toString(),
      return_date: returnItem.return_date,
      reason: returnItem.reason,
      return_location: returnItem.return_location || '',
      status: returnItem.status
    });
    
    // Load available items for this delivery
    handleDeliveryChange(returnItem.delivery_id.toString());
    
    setReturnItems(returnItem.items || []);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus retur ini?')) {
      try {
        await db.deleteReturn(id);
        toast.success('Retur berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleStatusUpdate = async (id: number, newStatus: string) => {
    try {
      const returnItem = returns.find((r: any) => r.id ===id);
      if (returnItem) {
        const returnData = {
          ...returnItem,
          status: newStatus
        };
        await db.updateReturn(id, returnData, returnItem.items);
        toast.success('Status berhasil diperbarui');
        refreshData();
      }
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handlePrintReturn = (returnItem: any) => {
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Nota Retur - ${returnItem.id}</title>
            <style>
              body { font-family: "DM Sans", sans-serif; margin: 20px; font-size: 12px; }
              .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #000; padding-bottom: 10px; }
              .logo { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
              .company-info { font-size: 10px; line-height: 1.4; }
              .return-info { margin: 20px 0; }
              .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              .items-table th, .items-table td { border: 1px solid #000; padding: 8px; text-align: left; }
              .items-table th { background-color: #f0f0f0; font-weight: bold; }
              .total-section { margin-top: 20px; text-align: right; }
              .grand-total { font-weight: bold; font-size: 14px; border-top: 2px solid #000; padding-top: 5px; }
              @media print { body { margin: 0; } }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="logo">🍞 RISNA COOKIES</div>
              <div class="company-info">
                DEP. KES. RI. P-IRT NO. 2053374020970-28<br>
                TELP (024) 8442782 SEMARANG<br>
                ADMIN. 0822 5758 8586
              </div>
            </div>
            
            <div class="return-info">
              <strong>NOTA RETUR</strong><br>
              No. Retur: ${returnItem.id}<br>
              Tanggal: ${new Date(returnItem.return_date).toLocaleDateString('id-ID')}<br>
              Pengiriman: #${returnItem.delivery_id}<br>
              Tipe: ${returnItem.delivery_type === 'store' ? 'Toko' : 'Perorangan'}<br>
              Alasan: ${returnItem.reason}<br>
              ${returnItem.return_location ? `Lokasi: ${returnItem.return_location}` : ''}
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Produk</th>
                  <th>Qty</th>
                  <th>Harga Satuan</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                ${returnItem.items?.map((item: any, index: number) => `
                  <tr>
                    <td>${index + 1}</td>
                    <td>${item.product_name}</td>
                    <td>${item.quantity}</td>
                    <td>${formatCurrency(item.unit_price)}</td>
                    <td>${formatCurrency(item.total_price)}</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>
            
            <div class="total-section">
              <div class="grand-total">TOTAL RETUR: ${formatCurrency(returnItem.total_amount)}</div>
            </div>
            
            <div style="margin-top: 40px; text-align: center; font-size: 10px;">
              Terima kasih atas kerjasamanya
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const resetForm = () => {
    setFormData({
      delivery_type: 'store',
      delivery_id: '',
      return_date: '',
      reason: '',
      return_location: '',
      status: 'pending'
    });
    setReturnItems([]);
    setAvailableItems([]);
    setEditingReturn(null);
    setShowForm(false);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      processed: { color: 'bg-blue-100 text-blue-800', label: 'Diproses' },
      completed: { color: 'bg-emerald-100 text-emerald-800', label: 'Selesai' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
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

  const filteredReturns = returns.filter((returnItem: any) => {
    if (filterStatus && returnItem.status !== filterStatus) return false;
    if (filterType && returnItem.delivery_type !== filterType) return false;
    return true;
  });

  const totalAmount = filteredReturns.reduce((sum: number, returnItem: any) => sum + returnItem.total_amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Retur Produk</h1>
          <p className="text-gray-600 mt-1">Kelola retur produk dari pengiriman</p>
        </div>
        <Button onClick={() => setShowForm(true)} icon={Plus} className="btn-primary">
          Tambah Retur
        </Button>
      </div>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title={`Detail Retur #${selectedReturn?.id}`}
        size="2xl"
      >
        {selectedReturn && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Informasi Retur</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{selectedReturn.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Pengiriman:</span>
                    <span className="font-medium">#{selectedReturn.delivery_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipe:</span>
                    <span>{getDeliveryTypeBadge(selectedReturn.delivery_type)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tanggal Retur:</span>
                    <span className="font-medium">{new Date(selectedReturn.return_date).toLocaleDateString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span>{getStatusBadge(selectedReturn.status)}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Detail Tambahan</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Lokasi Retur:</span>
                    <span className="font-medium">{selectedReturn.return_location || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total:</span>
                    <span className="font-medium text-lg">{formatCurrency(selectedReturn.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Item Retur</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Satuan</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedReturn.items?.map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.total_price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-2">Alasan Retur</h4>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedReturn.reason}</p>
            </div>
          </div>
        )}
      </Modal>

      {/* Filters */}
      <Card className="border-indigo-200">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Select
            label="Filter Tipe"
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={[{ value: '', label: 'Semua Tipe' }, ...deliveryTypeOptions]}
            className="flex-1"
          />
          <Select
            label="Filter Status"
            value={filterStatus}
            onChange={(value) => setFilterStatus(value.toString())}
            options={[{ value: '', label: 'Semua Status' }, ...statusOptions]}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setFilterType('');
              setFilterStatus('');
            }}
          >
            Reset Filter
          </Button>
        </div>
        
        <div className="mt-4 flex flex-col sm:flex-row gap-4 text-sm text-gray-600">
          <div>Total Retur: <span className="font-medium">{filteredReturns.length}</span></div>
          <div>Total Nilai: <span className="font-medium">{formatCurrency(totalAmount)}</span></div>
        </div>
      </Card>

      {showForm && (
        <Card className="border-purple-200">
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-purple-800">
              {editingReturn ? 'Edit Retur' : 'Tambah Retur Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Tipe Pengiriman"
                value={formData.delivery_type}
                onChange={(value) => {
                  setFormData({ ...formData, delivery_type: value.toString(), delivery_id: '' });
                  setAvailableItems([]);
                  setReturnItems([]);
                }}
                options={deliveryTypeOptions}
                required
              />
              <Select
                label="Pengiriman"
                value={formData.delivery_id}
                onChange={(value) => handleDeliveryChange(value.toString())}
                options={getDeliveryOptions()}
                placeholder="Pilih pengiriman"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Tanggal Retur"
                type="date"
                value={formData.return_date}
                onChange={(e) => setFormData({ ...formData, return_date: e.target.value })}
                required
              />
              <Select
                label="Status"
                value={formData.status}
                onChange={(value) => setFormData({ ...formData, status: value.toString() })}
                options={statusOptions}
              />
              <Input
                label="Lokasi Retur"
                value={formData.return_location}
                onChange={(e) => setFormData({ ...formData, return_location: e.target.value })}
                placeholder="Contoh: Rumah, Toko, Gudang"
                required
              />
            </div>

            <Input
              label="Alasan Retur"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Masukkan alasan retur"
              required
            />

            {/* Return Items */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Item Retur</h3>
                <Button 
                  type="button" 
                  onClick={addReturnItem} 
                  size="sm"
                  disabled={!formData.delivery_id || availableItems.length === 0}
                  className="btn-success"
                >
                  Tambah Item
                </Button>
              </div>
              
              {!formData.delivery_id && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">Pilih pengiriman terlebih dahulu untuk menampilkan produk yang dapat diretur.</p>
                </div>
              )}
              
              <div className="space-y-4">
                {returnItems.map((item, index) => {
                  const maxQty = getMaxQuantity(item.product_id);
                  
                  return (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-5 gap-4 p-4 border border-gray-200 rounded-lg">
                      <Select
                        label="Produk"
                        value={item.product_id}
                        onChange={(value) => updateReturnItem(index, 'product_id', parseInt(value.toString()))}
                        options={getAvailableProductOptions()}
                        placeholder="Pilih produk"
                        required
                      />
                      <Input
                        label="Jumlah"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateReturnItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min={1}
                        max={maxQty}
                        required
                      />
                      <Input
                        label="Harga Satuan"
                        type="number"
                        value={item.unit_price}
                        disabled
                      />
                      <Input
                        label="Total Harga"
                        type="number"
                        value={item.total_price}
                        disabled
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => removeReturnItem(index)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {returnItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="text-right">
                    <p className="text-lg font-medium">Total: {formatCurrency(calculateTotal())}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button type="submit" className="btn-primary">
                {editingReturn ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false} className="border-gray-200">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Pengiriman</TableHead>
              <TableHead>Tanggal Retur</TableHead>
              <TableHead>Lokasi Retur</TableHead>
              <TableHead>Alasan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredReturns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <RotateCcw className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data retur</p>
                </TableCell>
              </TableRow>
            ) : (
              filteredReturns.map((returnItem: any) => (
                <TableRow key={returnItem.id}>
                  <TableCell>{returnItem.id}</TableCell>
                  <TableCell>
                    {getDeliveryTypeBadge(returnItem.delivery_type)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <RotateCcw className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <p className="font-medium">#{returnItem.delivery_id}</p>
                        <p className="text-sm text-gray-500">{returnItem.delivery_info}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(returnItem.return_date).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {returnItem.return_location || '-'}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm max-w-xs truncate" title={returnItem.reason}>
                      {returnItem.reason}
                    </p>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(returnItem.status)}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(returnItem.total_amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Eye}
                        onClick={() => {
                          setSelectedReturn(returnItem);
                          setShowDetailModal(true);
                        }}
                      >
                        Detail
                      </Button>
                      {returnItem.status !== 'completed' && (
                        <Button
                          size="sm"
                          variant="success"
                          icon={CheckCircle}
                          onClick={() => handleStatusUpdate(returnItem.id, 'completed')}
                        >
                          Selesai
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(returnItem)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Printer}
                        onClick={() => handlePrintReturn(returnItem)}
                      >
                        Cetak
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(returnItem.id)}
                      >
                        Hapus
                      </Button>
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

export default Returns;