import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Package, AlertTriangle, Search } from 'lucide-react';
import toast from 'react-hot-toast';

const RawMaterials: React.FC = () => {
  const { rawMaterials, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    unit: '',
    purchase_quantity: 0,
    total_purchase_price: 0,
    supplier: '',
    minimum_stock: 0,
    expiry_date: ''
  });

  const categoryOptions = [
    { value: 'Bahan Utama', label: 'Bahan Utama' },
    { value: 'Pemanis', label: 'Pemanis' },
    { value: 'Lemak', label: 'Lemak' },
    { value: 'Protein', label: 'Protein' },
    { value: 'Pengembang', label: 'Pengembang' },
    { value: 'Perasa', label: 'Perasa' },
    { value: 'Pewarna', label: 'Pewarna' },
    { value: 'Pengawet', label: 'Pengawet' },
    { value: 'Kemasan', label: 'Kemasan' },
    { value: 'Stiker', label: 'Stiker' },
    { value: 'Stoples', label: 'Stoples' },
    { value: 'Solasi', label: 'Solasi' },
    { value: 'Alat', label: 'Alat' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  const unitOptions = [
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'liter', label: 'Liter (L)' },
    { value: 'ml', label: 'Mililiter (ml)' },
    { value: 'pcs', label: 'Pieces (pcs)' },
    { value: 'pack', label: 'Pack' },
    { value: 'botol', label: 'Botol' },
    { value: 'karung', label: 'Karung' },
    { value: 'roll', label: 'Roll' },
    { value: 'lembar', label: 'Lembar' },
    { value: 'meter', label: 'Meter' }
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

  const calculateUnitPrice = () => {
    if (formData.purchase_quantity > 0 && formData.total_purchase_price > 0) {
      return formData.total_purchase_price / formData.purchase_quantity;
    }
    return 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const unitPrice = calculateUnitPrice();
      
      if (editingMaterial) {
        await db.updateRawMaterial(
          editingMaterial.id,
          formData.name,
          formData.category,
          formData.unit,
          formData.purchase_quantity,
          unitPrice,
          formData.supplier,
          formData.minimum_stock,
          formData.expiry_date
        );
        toast.success('Setup bahan berhasil diperbarui');
      } else {
        await db.addRawMaterial(
          formData.name,
          formData.category,
          formData.unit,
          formData.purchase_quantity,
          unitPrice,
          formData.supplier,
          formData.minimum_stock,
          formData.expiry_date
        );
        toast.success('Setup bahan berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (material: any) => {
    setEditingMaterial(material);
    setFormData({
      name: material.name,
      category: material.category,
      unit: material.unit,
      purchase_quantity: material.stock_quantity,
      total_purchase_price: material.stock_quantity * material.unit_cost,
      supplier: material.supplier || '',
      minimum_stock: material.minimum_stock,
      expiry_date: material.expiry_date || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus setup bahan ini?')) {
      try {
        await db.deleteRawMaterial(id);
        toast.success('Setup bahan berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      unit: '',
      purchase_quantity: 0,
      total_purchase_price: 0,
      supplier: '',
      minimum_stock: 0,
      expiry_date: ''
    });
    setEditingMaterial(null);
    setShowForm(false);
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) {
      return { color: 'bg-red-100 text-red-800', label: 'Habis' };
    } else if (stock <= minStock) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Menipis' };
    }
    return { color: 'bg-green-100 text-green-800', label: 'Tersedia' };
  };

  // Filter materials based on search term
  const filteredMaterials = rawMaterials?.filter((material: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      material.name.toLowerCase().includes(searchLower) ||
      material.category.toLowerCase().includes(searchLower) ||
      material.supplier?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Pagination
  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentMaterials = filteredMaterials.slice(startIndex, endIndex);

  // Calculate total inventory value
  const totalInventoryValue = filteredMaterials.reduce((total: number, material: any) => {
    return total + (material.stock_quantity * material.unit_cost);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Setup Bahan</h1>
          <p className="text-gray-600 mt-1">Kelola semua bahan untuk produksi dan operasional</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Tambah Bahan
        </Button>
      </div>

      {/* Summary Card */}
      <Card className="border-emerald-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Item</p>
            <p className="text-2xl font-bold text-emerald-600">{filteredMaterials.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Total Nilai Inventori</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalInventoryValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Stok Menipis</p>
            <p className="text-2xl font-bold text-yellow-600">
              {filteredMaterials.filter((m: any) => m.stock_quantity <= m.minimum_stock && m.stock_quantity > 0).length}
            </p>
          </div>
        </div>
      </Card>

      {/* Search & Pagination */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Bahan
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Cari berdasarkan nama, kategori, atau supplier..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>
          </div>
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
              setSearchTerm('');
              setCurrentPage(1);
            }}
          >
            Reset
          </Button>
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredMaterials.length)} dari {filteredMaterials.length} bahan
            {searchTerm && ` (difilter dari ${rawMaterials?.length || 0} total)`}
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
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
          )}
        </div>
      </Card>

      {showForm && (
        <Card className="border-emerald-200">
          <CardHeader className="bg-emerald-50">
            <CardTitle className="text-emerald-800">
              {editingMaterial ? 'Edit Setup Bahan' : 'Tambah Setup Bahan Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Bahan"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Tepung Terigu, Stiker Label"
                required
              />
              <Select
                label="Kategori"
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value.toString() })}
                options={categoryOptions}
                placeholder="Pilih kategori"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Satuan"
                value={formData.unit}
                onChange={(value) => setFormData({ ...formData, unit: value.toString() })}
                options={unitOptions}
                placeholder="Pilih satuan"
                required
              />
              <Input
                label="Jumlah Pembelian"
                type="number"
                value={formData.purchase_quantity}
                onChange={(e) => setFormData({ ...formData, purchase_quantity: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
                placeholder="Contoh: 25 (untuk 25 kg)"
                required
              />
              <Input
                label="Total Harga Pembelian"
                type="number"
                value={formData.total_purchase_price}
                onChange={(e) => setFormData({ ...formData, total_purchase_price: parseFloat(e.target.value) || 0 })}
                min={0}
                placeholder="Contoh: 197000"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Supplier"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                placeholder="Nama supplier"
                required
              />
              <Input
                label="Stok Minimum"
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
                required
              />
              <Input
                label="Tanggal Kadaluarsa"
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              />
            </div>

            {formData.purchase_quantity > 0 && formData.total_purchase_price > 0 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-emerald-900 mb-2">Perhitungan Harga</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-emerald-700 font-medium">Jumlah Pembelian:</span>
                    <p className="text-emerald-800">{formData.purchase_quantity} {formData.unit}</p>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-medium">Total Harga:</span>
                    <p className="text-emerald-800">{formatCurrency(formData.total_purchase_price)}</p>
                  </div>
                  <div>
                    <span className="text-emerald-700 font-medium">Harga per {formData.unit}:</span>
                    <p className="text-emerald-800 font-bold">{formatCurrency(calculateUnitPrice())}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingMaterial ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false} className="border-emerald-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-emerald-50">
              <TableHead className="text-emerald-700">ID</TableHead>
              <TableHead className="text-emerald-700">Nama Bahan</TableHead>
              <TableHead className="text-emerald-700">Kategori</TableHead>
              <TableHead className="text-emerald-700">Stok</TableHead>
              <TableHead className="text-emerald-700">Harga/Satuan</TableHead>
              <TableHead className="text-emerald-700">Total Nilai</TableHead>
              <TableHead className="text-emerald-700">Supplier</TableHead>
              <TableHead className="text-emerald-700">Kadaluarsa</TableHead>
              <TableHead className="text-emerald-700">Status</TableHead>
              <TableHead className="text-emerald-700">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentMaterials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada bahan yang sesuai dengan pencarian' : 'Belum ada data setup bahan'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentMaterials.map((material: any) => {
                const stockStatus = getStockStatus(material.stock_quantity, material.minimum_stock);
                const totalValue = material.stock_quantity * material.unit_cost;
                
                return (
                  <TableRow key={material.id} className="hover:bg-emerald-50">
                    <TableCell>{material.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-emerald-500 mr-2" />
                        <div>
                          <p className="font-medium">{material.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        {material.category}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {material.stock_quantity <= material.minimum_stock && (
                          <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                        )}
                        <span className={material.stock_quantity === 0 ? 'text-red-600 font-medium' : ''}>
                          {material.stock_quantity} {material.unit}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(material.unit_cost)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(totalValue)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {material.supplier || '-'}
                    </TableCell>
                    <TableCell>
                      {material.expiry_date ? new Date(material.expiry_date).toLocaleDateString('id-ID') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit}
                          onClick={() => handleEdit(material)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDelete(material.id)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

export default RawMaterials;