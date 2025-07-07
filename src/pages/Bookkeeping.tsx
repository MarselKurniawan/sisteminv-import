import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, BookOpen, TrendingUp, TrendingDown, DollarSign, FileText, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const Bookkeeping: React.FC = () => {
  const { storeDeliveries, individualDeliveries, returns, refreshData } = useApp();
  const [entries, setEntries] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({});
  const [showForm, setShowForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [reportData, setReportData] = useState<any>(null);
  const [reportFilter, setReportFilter] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Get user role from localStorage
  const userRole = localStorage.getItem('userRole') || 'kasir';
  
  const [formData, setFormData] = useState({
    date: '',
    type: 'income',
    category: 'primer',
    description: '',
    amount: 0
  });

  const typeOptions = [
    { value: 'income', label: 'Pemasukan' },
    { value: 'expense', label: 'Pengeluaran' }
  ];

  const categoryOptions = [
    { value: 'primer', label: 'Primer' },
    { value: 'sekunder', label: 'Sekunder' },
    { value: 'tersier', label: 'Tersier' }
  ];

  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadData = async () => {
    try {
      const [entriesData, summaryData] = await Promise.all([
        db.getBookkeepingEntries(),
        userRole === 'admin' ? db.getBookkeepingSummary() : Promise.resolve({})
      ]);
      
      // Add automatic entries from deliveries (after returns) - only for admin view
      const autoEntries = userRole === 'admin' ? generateAutoEntries() : [];
      const allEntries = [...entriesData, ...autoEntries];
      
      setEntries(allEntries);
      
      // Recalculate summary with auto entries - only for admin
      if (userRole === 'admin') {
        const newSummary = calculateSummary(allEntries);
        setSummary(newSummary);
      }
    } catch (error) {
      console.error('Error loading bookkeeping data:', error);
    }
  };

  const generateAutoEntries = () => {
    const autoEntries: any[] = [];
    
    // Add income from completed deliveries (after returns)
    [...storeDeliveries, ...individualDeliveries].forEach((delivery: any) => {
      if (delivery.status === 'completed') {
        const deliveryType = delivery.store_id ? 'store' : 'individual';
        
        // Calculate return amount for this delivery
        const returnAmount = returns
          .filter((r: any) => 
            r.delivery_id === delivery.id && 
            r.delivery_type === deliveryType &&
            r.status === 'completed'
          )
          .reduce((sum: number, r: any) => sum + r.total_amount, 0);
        
        const finalAmount = delivery.total_amount - returnAmount;
        
        if (finalAmount > 0) {
          autoEntries.push({
            id: `auto-${deliveryType}-${delivery.id}`,
            date: delivery.delivery_date || delivery.purchase_date,
            type: 'income',
            category: 'primer',
            description: `Penjualan ${deliveryType === 'store' ? 'Toko' : 'Perorangan'} - ${delivery.store_name || delivery.customer_name}`,
            amount: finalAmount,
            is_auto: true,
            created_at: delivery.created_at
          });
        }
      }
    });
    
    return autoEntries;
  };

  const calculateSummary = (allEntries: any[]) => {
    const summary = {
      total_income: 0,
      total_expense: 0,
      net_profit: 0,
      primer: { income: 0, expense: 0 },
      sekunder: { income: 0, expense: 0 },
      tersier: { income: 0, expense: 0 }
    };

    allEntries.forEach((entry: any) => {
      if (entry.type === 'income') {
        summary.total_income += entry.amount;
        summary[entry.category as keyof typeof summary].income += entry.amount;
      } else {
        summary.total_expense += entry.amount;
        summary[entry.category as keyof typeof summary].expense += entry.amount;
      }
    });

    summary.net_profit = summary.total_income - summary.total_expense;
    return summary;
  };

  const generateReport = async () => {
    if (!reportFilter.startDate || !reportFilter.endDate) {
      toast.error('Pilih tanggal mulai dan akhir');
      return;
    }

    try {
      const report = await db.getBookkeepingReport(reportFilter.startDate, reportFilter.endDate);
      setReportData(report);
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [storeDeliveries, individualDeliveries, returns, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingEntry) {
        await db.updateBookkeepingEntry(editingEntry.id, formData);
        toast.success('Entri berhasil diperbarui');
      } else {
        await db.addBookkeepingEntry(
          formData.date,
          formData.type,
          formData.category,
          formData.description,
          formData.amount
        );
        toast.success('Entri berhasil ditambahkan');
      }
      
      resetForm();
      loadData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (entry: any) => {
    if (entry.is_auto) {
      toast.error('Entri otomatis tidak dapat diedit');
      return;
    }
    
    setEditingEntry(entry);
    setFormData({
      date: entry.date,
      type: entry.type,
      category: entry.category,
      description: entry.description,
      amount: entry.amount
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    const entry = entries.find(e => e.id === id);
    if (entry?.is_auto) {
      toast.error('Entri otomatis tidak dapat dihapus');
      return;
    }
    
    if (window.confirm('Yakin ingin menghapus entri ini?')) {
      try {
        await db.deleteBookkeepingEntry(id);
        toast.success('Entri berhasil dihapus');
        loadData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      type: 'income',
      category: 'primer',
      description: '',
      amount: 0
    });
    setEditingEntry(null);
    setShowForm(false);
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = {
      income: { color: 'bg-green-100 text-green-800', label: 'Pemasukan', icon: TrendingUp },
      expense: { color: 'bg-red-100 text-red-800', label: 'Pengeluaran', icon: TrendingDown }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig = {
      primer: { color: 'bg-blue-100 text-blue-800', label: 'Primer' },
      sekunder: { color: 'bg-purple-100 text-purple-800', label: 'Sekunder' },
      tersier: { color: 'bg-orange-100 text-orange-800', label: 'Tersier' }
    };
    
    const config = categoryConfig[category as keyof typeof categoryConfig];
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const filteredEntries = entries.filter((entry: any) => {
    if (filterType && entry.type !== filterType) return false;
    if (filterCategory && entry.category !== filterCategory) return false;
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentEntries = filteredEntries.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pembukuan</h1>
          <p className="text-gray-600 mt-1">
            {userRole === 'admin' 
              ? 'Kelola catatan keuangan dengan sinkronisasi otomatis' 
              : 'Input data keuangan manual'
            }
          </p>
        </div>
        <div className="flex gap-3">
          {userRole === 'admin' && (
            <Button
              onClick={() => setShowReportModal(true)}
              icon={FileText}
              variant="secondary"
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              Laporan
            </Button>
          )}
          <Button
            onClick={() => setShowForm(true)}
            icon={Plus}
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Tambah Entri Manual
          </Button>
        </div>
      </div>

      {/* Summary Cards - Only visible for admin */}
      {userRole === 'admin' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-50 mr-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pemasukan</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(summary.total_income || 0)}</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-red-50 mr-4">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Pengeluaran</p>
                  <p className="text-xl font-bold text-red-600">{formatCurrency(summary.total_expense || 0)}</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className={`p-3 rounded-lg mr-4 ${(summary.net_profit || 0) >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <DollarSign className={`h-6 w-6 ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Laba Bersih</p>
                  <p className={`text-xl font-bold ${(summary.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(summary.net_profit || 0)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-50 mr-4">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Entri</p>
                  <p className="text-xl font-bold text-blue-600">{entries.length}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Category Breakdown - Only visible for admin */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {['primer', 'sekunder', 'tersier'].map((category) => (
              <Card key={category}>
                <CardHeader>
                  <CardTitle className="capitalize">{category}</CardTitle>
                </CardHeader>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pemasukan:</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(summary[category]?.income || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Pengeluaran:</span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(summary[category]?.expense || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-t pt-3">
                    <span className="text-sm font-medium text-gray-900">Net:</span>
                    <span className={`font-bold ${(summary[category]?.income || 0) - (summary[category]?.expense || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency((summary[category]?.income || 0) - (summary[category]?.expense || 0))}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Report Modal - Only for admin */}
      {userRole === 'admin' && (
        <Modal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          title="Laporan Pembukuan"
          size="2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Tanggal Mulai"
                type="date"
                value={reportFilter.startDate}
                onChange={(e) => setReportFilter({ ...reportFilter, startDate: e.target.value })}
                required
              />
              <Input
                label="Tanggal Akhir"
                type="date"
                value={reportFilter.endDate}
                onChange={(e) => setReportFilter({ ...reportFilter, endDate: e.target.value })}
                required
              />
              <div className="flex items-end">
                <Button
                  onClick={generateReport}
                  icon={Calendar}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Generate Laporan
                </Button>
              </div>
            </div>

            {reportData && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Pemasukan</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(reportData.total_income)}</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Pengeluaran</p>
                      <p className="text-xl font-bold text-red-600">{formatCurrency(reportData.total_expense)}</p>
                    </div>
                  </Card>
                  <Card>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Laba Bersih</p>
                      <p className={`text-xl font-bold ${reportData.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(reportData.net_profit)}
                      </p>
                    </div>
                  </Card>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tipe</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Deskripsi</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.entries.map((entry: any) => (
                        <tr key={entry.id}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {new Date(entry.date).toLocaleDateString('id-ID')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {getTypeBadge(entry.type)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {getCategoryBadge(entry.category)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">
                            {entry.description}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className={`font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                              {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingEntry ? 'Edit Entri' : 'Tambah Entri Manual'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tanggal"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Select
                label="Tipe"
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value.toString() })}
                options={typeOptions}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Kategori"
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value.toString() })}
                options={categoryOptions}
                required
              />
              <Input
                label="Jumlah"
                type="number"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                min={0}
                required
              />
            </div>
            
            <Input
              label="Deskripsi"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Masukkan deskripsi transaksi"
              required
            />
            
            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingEntry ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Filters & Pagination */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <Select
            label="Filter Tipe"
            value={filterType}
            onChange={(value) => setFilterType(value.toString())}
            options={[{ value: '', label: 'Semua Tipe' }, ...typeOptions]}
            className="flex-1"
          />
          <Select
            label="Filter Kategori"
            value={filterCategory}
            onChange={(value) => setFilterCategory(value.toString())}
            options={[{ value: '', label: 'Semua Kategori' }, ...categoryOptions]}
            className="flex-1"
          />
          <Select
            label="Items per Halaman"
            value={itemsPerPage}
            onChange={(value) => {
              setItemsPerPage(parseInt(value.toString()));
              setCurrentPage(1);
            }}
            options={itemsPerPageOptions}
            className="flex-1"
          />
          <Button
            variant="secondary"
            onClick={() => {
              setFilterType('');
              setFilterCategory('');
              setCurrentPage(1);
            }}
          >
            Reset Filter
          </Button>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredEntries.length)} dari {filteredEntries.length} entri
          </div>
          
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
            >
              Sebelumnya
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    size="sm"
                    variant={currentPage === page ? "primary" : "secondary"}
                    onClick={() => setCurrentPage(page)}
                    className="w-8 h-8"
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-500">...</span>
                  <Button
                    size="sm"
                    variant={currentPage === totalPages ? "primary" : "secondary"}
                    onClick={() => setCurrentPage(totalPages)}
                    className="w-8 h-8"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      </Card>

      <Card padding={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Deskripsi</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Sumber</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data pembukuan</p>
                </TableCell>
              </TableRow>
            ) : (
              currentEntries.map((entry: any) => (
                <TableRow key={entry.id}>
                  <TableCell>
                    {new Date(entry.date).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {getTypeBadge(entry.type)}
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(entry.category)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <p className="max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </p>
                      {entry.is_auto && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          Auto
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className={`font-medium ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                      {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.is_auto ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {entry.is_auto ? 'Otomatis' : 'Manual'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      {!entry.is_auto && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={Edit}
                            onClick={() => handleEdit(entry)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={() => handleDelete(entry.id)}
                          >
                            Hapus
                          </Button>
                        </>
                      )}
                      {entry.is_auto && (
                        <span className="text-xs text-gray-500 px-2 py-1">
                          Entri otomatis
                        </span>
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

export default Bookkeeping;