import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Building, Calendar, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const Assets: React.FC = () => {
  const [assets, setAssets] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingAsset, setEditingAsset] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    purchase_date: '',
    purchase_price: 0,
    useful_life_years: 5,
    maintenance_cost_yearly: 0,
    current_value: 0,
    condition: 'good',
    location: '',
    notes: ''
  });

  const categoryOptions = [
    { value: 'equipment', label: 'Peralatan' },
    { value: 'machinery', label: 'Mesin' },
    { value: 'vehicle', label: 'Kendaraan' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'building', label: 'Bangunan' },
    { value: 'technology', label: 'Teknologi' },
    { value: 'other', label: 'Lainnya' }
  ];

  const conditionOptions = [
    { value: 'excellent', label: 'Sangat Baik' },
    { value: 'good', label: 'Baik' },
    { value: 'fair', label: 'Cukup' },
    { value: 'poor', label: 'Buruk' },
    { value: 'damaged', label: 'Rusak' }
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

  const loadAssets = async () => {
    try {
      const assetsData = await db.getAssets();
      setAssets(assetsData);
    } catch (error) {
      console.error('Error loading assets:', error);
    }
  };

  React.useEffect(() => {
    loadAssets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const assetData = {
        ...formData,
        current_value: formData.current_value || formData.purchase_price
      };

      if (editingAsset) {
        await db.updateAsset(editingAsset.id, assetData);
        toast.success('Aset berhasil diperbarui');
      } else {
        await db.addAsset(assetData);
        toast.success('Aset berhasil ditambahkan');
      }
      
      resetForm();
      loadAssets();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (asset: any) => {
    setEditingAsset(asset);
    setFormData({
      name: asset.name,
      category: asset.category,
      purchase_date: asset.purchase_date,
      purchase_price: asset.purchase_price,
      useful_life_years: asset.useful_life_years,
      maintenance_cost_yearly: asset.maintenance_cost_yearly,
      current_value: asset.current_value,
      condition: asset.condition,
      location: asset.location || '',
      notes: asset.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus aset ini?')) {
      try {
        await db.deleteAsset(id);
        toast.success('Aset berhasil dihapus');
        loadAssets();
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
      purchase_date: '',
      purchase_price: 0,
      useful_life_years: 5,
      maintenance_cost_yearly: 0,
      current_value: 0,
      condition: 'good',
      location: '',
      notes: ''
    });
    setEditingAsset(null);
    setShowForm(false);
  };

  const getCategoryBadge = (category: string) => {
    const categoryConfig: { [key: string]: { color: string, label: string } } = {
      equipment: { color: 'bg-blue-100 text-blue-800', label: 'Peralatan' },
      machinery: { color: 'bg-purple-100 text-purple-800', label: 'Mesin' },
      vehicle: { color: 'bg-green-100 text-green-800', label: 'Kendaraan' },
      furniture: { color: 'bg-yellow-100 text-yellow-800', label: 'Furniture' },
      building: { color: 'bg-red-100 text-red-800', label: 'Bangunan' },
      technology: { color: 'bg-indigo-100 text-indigo-800', label: 'Teknologi' },
      other: { color: 'bg-gray-100 text-gray-800', label: 'Lainnya' }
    };
    
    const config = categoryConfig[category] || categoryConfig.other;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getConditionBadge = (condition: string) => {
    const conditionConfig: { [key: string]: { color: string, label: string } } = {
      excellent: { color: 'bg-emerald-100 text-emerald-800', label: 'Sangat Baik' },
      good: { color: 'bg-green-100 text-green-800', label: 'Baik' },
      fair: { color: 'bg-yellow-100 text-yellow-800', label: 'Cukup' },
      poor: { color: 'bg-orange-100 text-orange-800', label: 'Buruk' },
      damaged: { color: 'bg-red-100 text-red-800', label: 'Rusak' }
    };
    
    const config = conditionConfig[condition] || conditionConfig.good;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const totalAssetValue = assets.reduce((sum, asset) => sum + (asset.current_value || asset.purchase_price), 0);
  const totalPurchaseValue = assets.reduce((sum, asset) => sum + asset.purchase_price, 0);
  const totalMaintenanceCost = assets.reduce((sum, asset) => sum + asset.maintenance_cost_yearly, 0);

  // Pagination
  const totalPages = Math.ceil(assets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentAssets = assets.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Aset</h1>
          <p className="text-gray-600 mt-1">Kelola aset perusahaan dan biaya perawatan</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
          className="bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          Tambah Aset
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-blue-50 mr-4">
              <Building className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Total Aset</p>
              <p className="text-2xl font-bold text-gray-900">{assets.length}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-green-50 mr-4">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Nilai Pembelian</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPurchaseValue)}</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-indigo-50 mr-4">
              <DollarSign className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Nilai Saat Ini</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAssetValue)}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-center">
            <div className="p-3 rounded-lg bg-orange-50 mr-4">
              <DollarSign className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Biaya Perawatan/Tahun</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(totalMaintenanceCost)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pagination Controls */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
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
        </div>
        
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Menampilkan {startIndex + 1}-{Math.min(endIndex, assets.length)} dari {assets.length} aset
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

      {showForm && (
        <Card className="border-indigo-200">
          <CardHeader className="bg-indigo-50">
            <CardTitle className="text-indigo-800">
              {editingAsset ? 'Edit Aset' : 'Tambah Aset Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Aset"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama aset"
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
              <Input
                label="Tanggal Pembelian"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
              <Input
                label="Harga Pembelian"
                type="number"
                value={formData.purchase_price}
                onChange={(e) => setFormData({ ...formData, purchase_price: parseFloat(e.target.value) || 0 })}
                min={0}
                required
              />
              <Input
                label="Nilai Saat Ini"
                type="number"
                value={formData.current_value}
                onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                min={0}
                placeholder="Kosongkan jika sama dengan harga beli"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Masa Pakai (Tahun)"
                type="number"
                value={formData.useful_life_years}
                onChange={(e) => setFormData({ ...formData, useful_life_years: parseInt(e.target.value) || 0 })}
                min={1}
                max={50}
                required
              />
              <Input
                label="Biaya Perawatan per Tahun"
                type="number"
                value={formData.maintenance_cost_yearly}
                onChange={(e) => setFormData({ ...formData, maintenance_cost_yearly: parseFloat(e.target.value) || 0 })}
                min={0}
              />
              <Select
                label="Kondisi"
                value={formData.condition}
                onChange={(value) => setFormData({ ...formData, condition: value.toString() })}
                options={conditionOptions}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Lokasi"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Lokasi aset"
              />
              <Input
                label="Catatan"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Catatan tambahan"
              />
            </div>
            
            <div className="flex gap-3">
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                {editingAsset ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false} className="border-indigo-200">
        <Table>
          <TableHeader>
            <TableRow className="bg-indigo-50">
              <TableHead className="text-indigo-700">ID</TableHead>
              <TableHead className="text-indigo-700">Nama Aset</TableHead>
              <TableHead className="text-indigo-700">Kategori</TableHead>
              <TableHead className="text-indigo-700">Tanggal Beli</TableHead>
              <TableHead className="text-indigo-700">Harga Beli</TableHead>
              <TableHead className="text-indigo-700">Nilai Saat Ini</TableHead>
              <TableHead className="text-indigo-700">Kondisi</TableHead>
              <TableHead className="text-indigo-700">Lokasi</TableHead>
              <TableHead className="text-indigo-700">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentAssets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data aset</p>
                </TableCell>
              </TableRow>
            ) : (
              currentAssets.map((asset: any) => (
                <TableRow key={asset.id} className="hover:bg-indigo-50">
                  <TableCell>{asset.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Building className="h-4 w-4 text-indigo-500 mr-2" />
                      <div>
                        <p className="font-medium">{asset.name}</p>
                        <p className="text-xs text-gray-500">
                          {asset.useful_life_years} tahun masa pakai
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {getCategoryBadge(asset.category)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      {new Date(asset.purchase_date).toLocaleDateString('id-ID')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(asset.purchase_price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-indigo-600">
                      {formatCurrency(asset.current_value || asset.purchase_price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    {getConditionBadge(asset.condition)}
                  </TableCell>
                  <TableCell>
                    {asset.location || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(asset)}
                        className="text-indigo-600 hover:text-indigo-700"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(asset.id)}
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

export default Assets;