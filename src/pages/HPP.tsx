import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { Modal } from '../components/ui/Modal';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Calculator, Package, Wheat, Info, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, customRound } from '../lib/utils';

const HPP: React.FC = () => {
  const { products, rawMaterials, refreshData } = useApp();
  const [hpps, setHpps] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingHPP, setEditingHPP] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    product_id: '',
    target_profit_percentage: 100,
    overhead_cost: 0,
    fee_channel_online: 0,
    rounding_enabled: true
  });

  const [recipeItems, setRecipeItems] = useState<any[]>([]);
  const [recipeData, setRecipeData] = useState({
    raw_material_id: '',
    recipe_quantity: 0
  });

  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  // Convert unit to smallest unit (e.g., kg to gram)
  const convertToSmallestUnit = (quantity: number, unit: string): { quantity: number, unit: string } => {
    const conversions: { [key: string]: { factor: number, smallestUnit: string } } = {
      'kg': { factor: 1000, smallestUnit: 'gram' },
      'liter': { factor: 1000, smallestUnit: 'ml' },
      'pack': { factor: 1, smallestUnit: 'pcs' },
      'karung': { factor: 25000, smallestUnit: 'gram' }, // assuming 25kg per karung
      'botol': { factor: 1, smallestUnit: 'pcs' },
      'roll': { factor: 1, smallestUnit: 'pcs' },
      'lembar': { factor: 1, smallestUnit: 'pcs' },
      'meter': { factor: 100, smallestUnit: 'cm' }
    };

    const conversion = conversions[unit.toLowerCase()];
    if (conversion) {
      return {
        quantity: quantity * conversion.factor,
        unit: conversion.smallestUnit
      };
    }
    return { quantity, unit };
  };

  const loadData = async () => {
    try {
      const hppsData = await db.getHPPs();
      setHpps(hppsData);
    } catch (error) {
      console.error('Error loading HPP data:', error);
    }
  };

  React.useEffect(() => {
    loadData();
  }, []);

  // Filter only single products (not packages)
  const productOptions = products
    ?.filter((product: any) => product.product_type === 'single')
    .map((product: any) => ({
      value: product.id,
      label: `${product.name} - ${product.packaging} ${product.size}`
    })) || [];

  const rawMaterialOptions = rawMaterials?.map((material: any) => ({
    value: material.id,
    label: material.name
  })) || [];

  const addRecipeItem = () => {
    if (!recipeData.raw_material_id || recipeData.recipe_quantity <= 0) {
      toast.error('Pilih bahan baku dan masukkan jumlah resep');
      return;
    }

    const material = rawMaterials?.find((m: any) => m.id === parseInt(recipeData.raw_material_id));
    if (!material) {
      toast.error('Bahan baku tidak ditemukan');
      return;
    }

    // Check if material already exists in recipe
    const existingIndex = recipeItems.findIndex(item => item.raw_material_id === parseInt(recipeData.raw_material_id));
    if (existingIndex !== -1) {
      toast.error('Bahan baku sudah ada dalam resep');
      return;
    }

    // Convert to smallest unit for calculation
    const converted = convertToSmallestUnit(material.stock_quantity, material.unit);
    const unitCostInSmallestUnit = material.unit_cost / converted.quantity * material.stock_quantity;
    const totalCost = unitCostInSmallestUnit * recipeData.recipe_quantity;

    const newItem = {
      raw_material_id: parseInt(recipeData.raw_material_id),
      material_name: material.name,
      material_unit: converted.unit,
      recipe_quantity: recipeData.recipe_quantity,
      purchase_price: material.unit_cost * material.stock_quantity,
      purchase_volume: material.stock_quantity,
      purchase_unit: material.unit,
      total_cost: totalCost
    };

    setRecipeItems([...recipeItems, newItem]);
    setRecipeData({ raw_material_id: '', recipe_quantity: 0 });
    toast.success('Bahan berhasil ditambahkan ke resep');
  };

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index));
  };

  const updateRecipeItem = (index: number, field: string, value: any) => {
    const newItems = [...recipeItems];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'recipe_quantity') {
      const material = rawMaterials?.find((m: any) => m.id === newItems[index].raw_material_id);
      if (material) {
        const converted = convertToSmallestUnit(material.stock_quantity, material.unit);
        const unitCostInSmallestUnit = material.unit_cost / converted.quantity * material.stock_quantity;
        newItems[index].total_cost = unitCostInSmallestUnit * value;
      }
    }
    
    setRecipeItems(newItems);
  };

  const calculateHPP = () => {
    const totalMaterialCost = recipeItems.reduce((sum, item) => sum + item.total_cost, 0);
    const totalCost = totalMaterialCost + formData.overhead_cost;
    
    // Calculate prices
    const minimumSellingPrice = totalCost;
    const targetSellingPrice = totalCost * (1 + formData.target_profit_percentage / 100);
    const onlineChannelPrice = targetSellingPrice * (1 + formData.fee_channel_online / 100);
    
    // Apply rounding if enabled
    const finalSellingPrice = formData.rounding_enabled ? customRound(targetSellingPrice) : targetSellingPrice;
    const finalOnlinePrice = formData.rounding_enabled ? customRound(onlineChannelPrice) : onlineChannelPrice;
    
    return {
      total_material_cost: totalMaterialCost,
      total_cost: totalCost,
      minimum_selling_price: minimumSellingPrice,
      target_selling_price: targetSellingPrice,
      final_selling_price: finalSellingPrice,
      online_channel_price: onlineChannelPrice,
      final_online_price: finalOnlinePrice
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (recipeItems.length === 0) {
      toast.error('Tambahkan minimal satu bahan dalam resep');
      return;
    }

    try {
      const calculation = calculateHPP();
      
      const hppData = {
        product_id: parseInt(formData.product_id),
        material_cost: calculation.total_material_cost,
        overhead_cost: formData.overhead_cost,
        target_profit_percentage: formData.target_profit_percentage,
        fee_channel_online: formData.fee_channel_online,
        minimum_selling_price: calculation.minimum_selling_price,
        suggested_selling_price: calculation.target_selling_price,
        final_selling_price: calculation.final_selling_price,
        online_channel_price: calculation.final_online_price,
        rounding_enabled: formData.rounding_enabled
      };

      if (editingHPP) {
        await db.updateHPP(editingHPP.id, hppData);
        // Also save recipe
        await db.saveProductRecipe(parseInt(formData.product_id), recipeItems);
        toast.success('Kalkulator HPP berhasil diperbarui');
      } else {
        await db.addHPP(hppData);
        // Also save recipe
        await db.saveProductRecipe(parseInt(formData.product_id), recipeItems);
        toast.success('Kalkulator HPP berhasil ditambahkan');
      }
      
      resetForm();
      loadData();
      refreshData(); // Refresh products to update HPP price
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = async (hpp: any) => {
    setEditingHPP(hpp);
    setFormData({
      product_id: hpp.product_id.toString(),
      target_profit_percentage: hpp.target_profit_percentage,
      overhead_cost: hpp.overhead_cost,
      fee_channel_online: hpp.fee_channel_online || 0,
      rounding_enabled: hpp.rounding_enabled !== false
    });
    
    // Load existing recipe for this product
    try {
      const recipes = await db.getProductRecipes(hpp.product_id);
      const recipeItemsData = recipes.map((recipe: any) => ({
        raw_material_id: recipe.raw_material_id,
        material_name: recipe.material_name,
        material_unit: recipe.material_unit,
        recipe_quantity: recipe.quantity_needed,
        purchase_price: recipe.material_cost * recipe.stock_available,
        purchase_volume: recipe.stock_available,
        purchase_unit: recipe.original_unit,
        total_cost: recipe.total_cost
      }));
      setRecipeItems(recipeItemsData);
    } catch (error) {
      console.error('Error loading recipe:', error);
      setRecipeItems([]);
    }
    
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus kalkulator HPP ini?')) {
      try {
        await db.deleteHPP(id);
        toast.success('Kalkulator HPP berhasil dihapus');
        loadData();
        refreshData(); // Refresh products to update HPP price
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleManageRecipe = async (product: any) => {
    setSelectedProduct(product);
    
    // Load existing recipe for this product
    try {
      const recipes = await db.getProductRecipes(product.id);
      const recipeItemsData = recipes.map((recipe: any) => ({
        raw_material_id: recipe.raw_material_id,
        material_name: recipe.material_name,
        material_unit: recipe.material_unit,
        recipe_quantity: recipe.quantity_needed,
        purchase_price: recipe.material_cost * recipe.stock_available,
        purchase_volume: recipe.stock_available,
        purchase_unit: recipe.original_unit,
        total_cost: recipe.total_cost
      }));
      setRecipeItems(recipeItemsData);
    } catch (error) {
      console.error('Error loading recipe:', error);
      setRecipeItems([]);
    }
    
    setShowRecipeModal(true);
  };

  const resetForm = () => {
    setFormData({
      product_id: '',
      target_profit_percentage: 100,
      overhead_cost: 0,
      fee_channel_online: 0,
      rounding_enabled: true
    });
    setRecipeItems([]);
    setRecipeData({ raw_material_id: '', recipe_quantity: 0 });
    setEditingHPP(null);
    setShowForm(false);
  };

  // Get selected raw material info for recipe form
  const getSelectedMaterialInfo = () => {
    if (!recipeData.raw_material_id) return null;
    const material = rawMaterials?.find((m: any) => m.id === parseInt(recipeData.raw_material_id));
    if (!material) return null;
    
    const converted = convertToSmallestUnit(material.stock_quantity, material.unit);
    return {
      ...material,
      smallest_unit_stock: converted.quantity,
      smallest_unit: converted.unit,
      purchase_amount: material.stock_quantity
    };
  };

  const selectedMaterialInfo = getSelectedMaterialInfo();
  const calculation = recipeItems.length > 0 ? calculateHPP() : null;

  // Filter HPPs based on search term
  const filteredHPPs = hpps.filter((hpp: any) => {
    const searchLower = searchTerm.toLowerCase();
    return hpp.product_name.toLowerCase().includes(searchLower);
  });

  // Pagination
  const totalPages = Math.ceil(filteredHPPs.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentHPPs = filteredHPPs.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalkulator HPP</h1>
          <p className="text-gray-600 mt-1">Kelola resep dan perhitungan harga pokok produksi</p>
        </div>
        <Button
          onClick={() => setShowForm(true)}
          icon={Plus}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          Tambah HPP
        </Button>
      </div>

      {/* Recipe Management Modal */}
      <Modal
        isOpen={showRecipeModal}
        onClose={() => {
          setShowRecipeModal(false);
          setSelectedProduct(null);
          setRecipeItems([]);
          setRecipeData({ raw_material_id: '', recipe_quantity: 0 });
        }}
        title={`Kelola Resep - ${selectedProduct?.name}`}
        size="2xl"
      >
        <div className="space-y-6">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-2">Informasi Produk</h4>
            <p className="text-sm text-blue-800">
              {selectedProduct?.name} - {selectedProduct?.packaging} {selectedProduct?.size}
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium text-gray-900 flex items-center">
              <Wheat className="h-5 w-5 mr-2 text-emerald-600" />
              Tambah Bahan ke Resep
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select
                label="Bahan Baku"
                value={recipeData.raw_material_id}
                onChange={(value) => setRecipeData({ ...recipeData, raw_material_id: value.toString() })}
                options={rawMaterialOptions}
                placeholder="Pilih bahan baku"
                required
              />
              <Input
                label="Jumlah Resep"
                type="number"
                value={recipeData.recipe_quantity}
                onChange={(e) => setRecipeData({ ...recipeData, recipe_quantity: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
                placeholder="Dalam satuan terkecil"
                required
              />
              <div className="flex items-end">
                <Button 
                  type="button" 
                  onClick={addRecipeItem} 
                  size="sm" 
                  icon={Plus} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Tambah
                </Button>
              </div>
            </div>
          </div>

          {/* Material Info Display */}
          {selectedMaterialInfo && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                <Info className="h-4 w-4 mr-2" />
                Informasi Bahan Baku Terpilih
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Harga Beli:</span>
                  <p className="text-blue-800">{formatCurrency(selectedMaterialInfo.unit_cost * selectedMaterialInfo.stock_quantity)}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Volume:</span>
                  <p className="text-blue-800">{selectedMaterialInfo.purchase_amount} {selectedMaterialInfo.unit}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Dalam Satuan Terkecil:</span>
                  <p className="text-blue-800">{selectedMaterialInfo.smallest_unit_stock} {selectedMaterialInfo.smallest_unit}</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Harga per {selectedMaterialInfo.smallest_unit}:</span>
                  <p className="text-blue-800">{formatCurrency((selectedMaterialInfo.unit_cost * selectedMaterialInfo.stock_quantity) / selectedMaterialInfo.smallest_unit_stock)}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <Package className="h-5 w-5 mr-2 text-emerald-600" />
              Resep Saat Ini
            </h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-emerald-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Bahan</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Resep</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Harga Beli</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Volume</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Total Harga</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recipeItems.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        Belum ada bahan dalam resep
                      </td>
                    </tr>
                  ) : (
                    recipeItems.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Wheat className="h-4 w-4 text-emerald-500 mr-2" />
                            {item.material_name}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <Input
                            type="number"
                            value={item.recipe_quantity}
                            onChange={(e) => updateRecipeItem(index, 'recipe_quantity', parseFloat(e.target.value) || 0)}
                            min={0}
                            step={0.1}
                            className="w-20"
                          />
                          <span className="text-xs text-gray-500 ml-1">{item.material_unit}</span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.purchase_price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.purchase_volume} {item.purchase_unit}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(item.total_cost)}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <Button
                            size="sm"
                            variant="danger"
                            icon={Trash2}
                            onClick={() => removeRecipeItem(index)}
                          >
                            Hapus
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {recipeItems.length > 0 && (
              <div className="mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-emerald-800">Total Biaya Bahan Baku:</span>
                  <span className="font-bold text-emerald-800 text-lg">
                    {formatCurrency(recipeItems.reduce((sum, item) => sum + item.total_cost, 0))}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Search & Pagination */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari HPP
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
                placeholder="Cari berdasarkan nama produk..."
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
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredHPPs.length)} dari {filteredHPPs.length} HPP
            {searchTerm && ` (difilter dari ${hpps.length} total)`}
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
              {editingHPP ? 'Edit Kalkulator HPP' : 'Setup Kalkulator HPP Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Pilih Produk"
                value={formData.product_id}
                onChange={(value) => setFormData({ ...formData, product_id: value.toString() })}
                options={productOptions}
                placeholder="Pilih produk untuk setup HPP"
                required
              />
              <Input
                label="Target Profit (%)"
                type="number"
                value={formData.target_profit_percentage}
                onChange={(e) => setFormData({ ...formData, target_profit_percentage: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1}
                placeholder="Contoh: 100"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Biaya Overhead (Opsional)"
                type="number"
                value={formData.overhead_cost}
                onChange={(e) => setFormData({ ...formData, overhead_cost: parseFloat(e.target.value) || 0 })}
                min={0}
                placeholder="Gaji pegawai, penyusutan, dll"
              />
              <Input
                label="Fee Channel Online (%)"
                type="number"
                value={formData.fee_channel_online}
                onChange={(e) => setFormData({ ...formData, fee_channel_online: parseFloat(e.target.value) || 0 })}
                min={0}
                step={0.1}
                placeholder="Contoh: 15 (untuk Gojek/Grab)"
              />
              <div className="flex items-center pt-8">
                <input
                  type="checkbox"
                  id="rounding_enabled"
                  checked={formData.rounding_enabled}
                  onChange={(e) => setFormData({ ...formData, rounding_enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="rounding_enabled" className="text-sm text-gray-700">
                  Pembulatan harga
                </label>
              </div>
            </div>

            {/* Recipe Section */}
            <div className="space-y-4 p-4 border border-emerald-200 rounded-lg bg-emerald-50">
              <h3 className="text-lg font-medium text-emerald-800">Setup Resep Bahan</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select
                  label="Bahan Baku"
                  value={recipeData.raw_material_id}
                  onChange={(value) => setRecipeData({ ...recipeData, raw_material_id: value.toString() })}
                  options={rawMaterialOptions}
                  placeholder="Pilih bahan baku"
                />
                <Input
                  label="Jumlah Resep"
                  type="number"
                  value={recipeData.recipe_quantity}
                  onChange={(e) => setRecipeData({ ...recipeData, recipe_quantity: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={0.1}
                  placeholder="Dalam satuan terkecil"
                />
                <div className="flex items-end">
                  <Button 
                    type="button" 
                    onClick={addRecipeItem} 
                    size="sm" 
                    icon={Plus}
                    disabled={!recipeData.raw_material_id || recipeData.recipe_quantity <= 0}
                  >
                    Tambah Bahan
                  </Button>
                </div>
              </div>

              {/* Material Info Display */}
              {selectedMaterialInfo && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                    <Info className="h-4 w-4 mr-2" />
                    Informasi Bahan Baku Terpilih
                  </h5>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Harga Beli:</span>
                      <p className="text-blue-800">{formatCurrency(selectedMaterialInfo.unit_cost * selectedMaterialInfo.stock_quantity)}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Volume:</span>
                      <p className="text-blue-800">{selectedMaterialInfo.purchase_amount} {selectedMaterialInfo.unit}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Dalam Satuan Terkecil:</span>
                      <p className="text-blue-800">{selectedMaterialInfo.smallest_unit_stock} {selectedMaterialInfo.smallest_unit}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Harga per {selectedMaterialInfo.smallest_unit}:</span>
                      <p className="text-blue-800">{formatCurrency((selectedMaterialInfo.unit_cost * selectedMaterialInfo.stock_quantity) / selectedMaterialInfo.smallest_unit_stock)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recipe Items Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-white bg-opacity-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Bahan</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Resep</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Harga Beli</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Volume</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Total Harga</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-emerald-700 uppercase">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white bg-opacity-50 divide-y divide-gray-200">
                    {recipeItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          <Wheat className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                          Belum ada bahan dalam resep
                        </td>
                      </tr>
                    ) : (
                      recipeItems.map((item, index) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <div className="flex items-center">
                              <Wheat className="h-4 w-4 text-emerald-500 mr-2" />
                              {item.material_name}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <Input
                              type="number"
                              value={item.recipe_quantity}
                              onChange={(e) => updateRecipeItem(index, 'recipe_quantity', parseFloat(e.target.value) || 0)}
                              min={0}
                              step={0.1}
                              className="w-20"
                            />
                            <span className="text-xs text-gray-500 ml-1">{item.material_unit}</span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {formatCurrency(item.purchase_price)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {item.purchase_volume} {item.purchase_unit}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <span className="font-medium text-emerald-600">
                              {formatCurrency(item.total_cost)}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            <Button
                              size="sm"
                              variant="danger"
                              icon={Trash2}
                              onClick={() => removeRecipeItem(index)}
                            >
                              Hapus
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* HPP Calculation Display */}
            {calculation && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h4 className="font-medium text-emerald-900 mb-3 flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Perhitungan HPP
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Total Biaya Bahan Baku:</span>
                      <span className="font-medium">{formatCurrency(calculation.total_material_cost)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Biaya Overhead:</span>
                      <span className="font-medium">{formatCurrency(formData.overhead_cost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-emerald-700 font-medium">Total Biaya:</span>
                      <span className="font-medium">{formatCurrency(calculation.total_cost)}</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Harga Jual (Minimum):</span>
                      <span className="font-medium">{formatCurrency(calculation.minimum_selling_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Harga Jual (+ {formData.target_profit_percentage}%):</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(calculation.final_selling_price)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-emerald-700">Harga Channel Online (+ {formData.fee_channel_online}%):</span>
                      <span className="font-medium text-purple-600">{formatCurrency(calculation.final_online_price)}</span>
                    </div>
                  </div>
                </div>
                {formData.rounding_enabled && (
                  <div className="mt-3 p-3 bg-emerald-100 rounded-lg">
                    <p className="text-xs text-emerald-800">
                      <strong>Catatan:</strong> Harga telah dibulatkan sesuai aturan: angka yang berakhir dengan 500 tetap, 001-499 dibulatkan ke 500, 501-999 dibulatkan ke 1000.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {editingHPP ? 'Perbarui' : 'Simpan'}
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
              <TableHead className="text-emerald-700">Produk</TableHead>
              <TableHead className="text-emerald-700">Biaya Bahan</TableHead>
              <TableHead className="text-emerald-700">Biaya Overhead</TableHead>
              <TableHead className="text-emerald-700">Target Profit</TableHead>
              <TableHead className="text-emerald-700">Harga Jual</TableHead>
              <TableHead className="text-emerald-700">Harga Online</TableHead>
              <TableHead className="text-emerald-700">Pembulatan</TableHead>
              <TableHead className="text-emerald-700">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentHPPs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  <Calculator className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada HPP yang sesuai dengan pencarian' : 'Belum ada data kalkulator HPP'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentHPPs.map((hpp: any) => (
                <TableRow key={hpp.id} className="hover:bg-emerald-50">
                  <TableCell>{hpp.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-emerald-500 mr-2" />
                      <div>
                        <p className="font-medium">{hpp.product_name}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleManageRecipe(hpp)}
                          className="text-xs mt-1 p-0 h-auto text-emerald-600 hover:text-emerald-700"
                        >
                          Kelola Resep
                        </Button>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(hpp.material_cost)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {formatCurrency(hpp.overhead_cost)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                      {hpp.target_profit_percentage}%
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(hpp.final_selling_price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-purple-600">
                      {formatCurrency(hpp.online_channel_price || hpp.final_selling_price)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hpp.rounding_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {hpp.rounding_enabled ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Edit}
                        onClick={() => handleEdit(hpp)}
                        className="text-emerald-600 hover:text-emerald-700"
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        icon={Trash2}
                        onClick={() => handleDelete(hpp.id)}
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

export default HPP;