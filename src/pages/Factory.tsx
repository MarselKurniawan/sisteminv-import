import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Factory as FactoryIcon, Wheat } from 'lucide-react';
import toast from 'react-hot-toast';

const Factory: React.FC = () => {
  const { factoryProductions, employees, products, rawMaterials, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingProduction, setEditingProduction] = useState<any>(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    product_id: '',
    production_date: '',
    quantity_produced: 0,
    notes: ''
  });
  const [materials, setMaterials] = useState<any[]>([]);
  const [productRecipes, setProductRecipes] = useState<any[]>([]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const loadProductRecipes = async (productId: number) => {
    try {
      const recipes = await db.getProductRecipes(productId);
      setProductRecipes(recipes);
      
      // Auto-fill materials based on recipes
      const autoMaterials = recipes.map((recipe: any) => ({
        raw_material_id: recipe.raw_material_id,
        quantity_used: recipe.quantity_needed * formData.quantity_produced,
        material_name: recipe.material_name,
        material_unit: recipe.material_unit,
        stock_available: recipe.stock_available,
        original_unit: recipe.original_unit
      }));
      
      setMaterials(autoMaterials);
    } catch (error) {
      console.error('Error loading recipes:', error);
      setProductRecipes([]);
      setMaterials([]);
    }
  };

  const handleProductChange = (productId: string) => {
    setFormData({ ...formData, product_id: productId });
    if (productId) {
      loadProductRecipes(parseInt(productId));
    } else {
      setProductRecipes([]);
      setMaterials([]);
    }
  };

  const handleQuantityChange = (quantity: number) => {
    setFormData({ ...formData, quantity_produced: quantity });
    
    // Update material quantities based on recipes
    if (productRecipes.length > 0) {
      const updatedMaterials = productRecipes.map((recipe: any) => ({
        raw_material_id: recipe.raw_material_id,
        quantity_used: recipe.quantity_needed * quantity,
        material_name: recipe.material_name,
        material_unit: recipe.material_unit,
        stock_available: recipe.stock_available,
        original_unit: recipe.original_unit
      }));
      setMaterials(updatedMaterials);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const productionData = {
        ...formData,
        employee_id: parseInt(formData.employee_id),
        product_id: parseInt(formData.product_id)
      };

      if (editingProduction) {
        await db.updateFactoryProduction(editingProduction.id, productionData, materials);
        toast.success('Produksi berhasil diperbarui');
      } else {
        await db.addFactoryProduction(productionData, materials);
        toast.success('Produksi berhasil ditambahkan dan stok produk telah diperbarui');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (production: any) => {
    setEditingProduction(production);
    setFormData({
      employee_id: production.employee_id.toString(),
      product_id: production.product_id.toString(),
      production_date: production.production_date,
      quantity_produced: production.quantity_produced,
      notes: production.notes || ''
    });
    setMaterials(production.materials || []);
    setShowForm(true);
    
    // Load recipes for this product
    loadProductRecipes(production.product_id);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus data produksi ini? Stok produk dan bahan baku akan disesuaikan.')) {
      try {
        await db.deleteFactoryProduction(id);
        toast.success('Data produksi berhasil dihapus dan stok telah disesuaikan');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const updateMaterial = (index: number, field: string, value: any) => {
    const newMaterials = [...materials];
    newMaterials[index] = { ...newMaterials[index], [field]: value };
    setMaterials(newMaterials);
  };

  const resetForm = () => {
    setFormData({
      employee_id: '',
      product_id: '',
      production_date: '',
      quantity_produced: 0,
      notes: ''
    });
    setMaterials([]);
    setProductRecipes([]);
    setEditingProduction(null);
    setShowForm(false);
  };

  const employeeOptions = employees?.map((employee: any) => ({
    value: employee.id,
    label: employee.name
  })) || [];

  // Filter only single products (not packages)
  const productOptions = products
    ?.filter((product: any) => product.product_type === 'single')
    .map((product: any) => ({
      value: product.id,
      label: `${product.name} - ${product.packaging} ${product.size}`
    })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Pabrik</h1>
          <p className="text-gray-600 mt-1">Kelola produksi roti di pabrik dengan sinkronisasi bahan baku</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
        >
          Tambah Produksi
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduction ? 'Edit Produksi' : 'Tambah Produksi Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Karyawan Pembuat"
                value={formData.employee_id}
                onChange={(value) => setFormData({ ...formData, employee_id: value.toString() })}
                options={employeeOptions}
                placeholder="Pilih karyawan"
                required
              />
              <Select
                label="Produk"
                value={formData.product_id}
                onChange={(value) => handleProductChange(value.toString())}
                options={productOptions}
                placeholder="Pilih produk"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Tanggal Produksi"
                type="date"
                value={formData.production_date}
                onChange={(e) => setFormData({ ...formData, production_date: e.target.value })}
                required
              />
              <Input
                label="Jumlah Diproduksi"
                type="number"
                value={formData.quantity_produced}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                min={1}
                required
              />
            </div>
            
            <Input
              label="Catatan"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Catatan produksi (opsional)"
            />

            {/* Materials Used */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Bahan Baku yang Digunakan</h3>
              </div>
              
              {productRecipes.length === 0 && formData.product_id && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800">
                    Produk ini belum memiliki resep. Silakan tambahkan resep di menu Produk terlebih dahulu.
                  </p>
                </div>
              )}
              
              <div className="space-y-4">
                {materials.map((material, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bahan Baku</label>
                      <div className="px-3 py-2 border rounded-lg bg-gray-50">
                        <div className="flex items-center">
                          <Wheat className="h-4 w-4 text-emerald-500 mr-2" />
                          <span>{material.material_name}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Jumlah Digunakan ({material.material_unit})
                      </label>
                      <div className="px-3 py-2 border rounded-lg bg-gray-50">
                        <span>{material.quantity_used}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Stok Tersedia</label>
                      <div className={`flex items-center px-3 py-2 border rounded-lg ${
                        material.stock_available === 0 ? 'bg-red-50 border-red-300' : 
                        material.stock_available < material.quantity_used ? 'bg-red-50 border-red-300' :
                        material.stock_available < 10 ? 'bg-yellow-50 border-yellow-300' : 
                        'bg-green-50 border-green-300'
                      }`}>
                        <Wheat className="h-4 w-4 text-gray-400 mr-2" />
                        <span className={`text-sm font-medium ${
                          material.stock_available === 0 ? 'text-red-700' : 
                          material.stock_available < material.quantity_used ? 'text-red-700' :
                          material.stock_available < 10 ? 'text-yellow-700' : 
                          'text-green-700'
                        }`}>
                          {material.stock_available} {material.original_unit}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <div className={`px-3 py-2 border rounded-lg ${
                        material.stock_available < material.quantity_used ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'
                      }`}>
                        <span className={`text-sm font-medium ${
                          material.stock_available < material.quantity_used ? 'text-red-700' : 'text-green-700'
                        }`}>
                          {material.stock_available < material.quantity_used ? 'Stok Tidak Cukup' : 'Stok Cukup'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {formData.product_id && (
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-800">
                  <strong>Info:</strong> Setelah produksi disimpan:
                </p>
                <ul className="text-sm text-green-800 mt-2 list-disc list-inside">
                  <li>Stok produk akan bertambah sebanyak {formData.quantity_produced} unit</li>
                  <li>Stok bahan baku akan berkurang sesuai jumlah yang digunakan</li>
                </ul>
              </div>
            )}
            
            <div className="flex gap-3">
              <Button type="submit">
                {editingProduction ? 'Perbarui' : 'Simpan'}
              </Button>
              <Button variant="secondary" onClick={resetForm}>
                Batal
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card padding={false}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Karyawan</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Tanggal Produksi</TableHead>
              <TableHead>Jumlah</TableHead>
              <TableHead>Bahan Digunakan</TableHead>
              <TableHead>Catatan</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!factoryProductions || factoryProductions.length === 0) ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <FactoryIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">Belum ada data produksi</p>
                </TableCell>
              </TableRow>
            ) : (
              factoryProductions.map((production: any) => (
                <TableRow key={production.id}>
                  <TableCell>{production.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <FactoryIcon className="h-4 w-4 text-gray-400 mr-2" />
                      {production.employee_name}
                    </div>
                  </TableCell>
                  <TableCell>{production.product_name}</TableCell>
                  <TableCell>
                    {new Date(production.production_date).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{production.quantity_produced}</span>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {production.materials?.length || 0} bahan
                      {production.materials?.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {production.materials.slice(0, 2).map((m: any, i: number) => (
                            <div key={i}>
                              {rawMaterials?.find((rm: any) => rm.id === m.raw_material_id)?.name}: {m.quantity_used}
                            </div>
                          ))}
                          {production.materials.length > 2 && (
                            <div>+{production.materials.length - 2} lainnya</div>
                          )}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-gray-600 max-w-xs truncate">
                      {production.notes || '-'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(production)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(production.id)}
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

export default Factory;