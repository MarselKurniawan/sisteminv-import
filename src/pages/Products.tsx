import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { Modal } from '../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { Plus, Edit, Trash2, Package, AlertTriangle, Minus, Settings, History, Search, Eye, BarChart } from 'lucide-react';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { formatCurrency, customRound } from '../lib/utils';

const Products: React.FC = () => {
  const { products, priceAreas, refreshData } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [showStockLogModal, setShowStockLogModal] = useState(false);
  const [showPackageDetailsModal, setShowPackageDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [stockReductions, setStockReductions] = useState<any[]>([]);
  const [enableRounding, setEnableRounding] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    packaging: '',
    size: '',
    type: 'reguler',
    product_type: 'single',
    stock_dozen: 0,
    stock_pcs: 0,
    minimum_stock: 24,
    base_price: 0,
    area_prices: [] as any[],
    package_items: [] as any[]
  });

  const [stockData, setStockData] = useState({
    dozen: 0,
    pcs: 0,
    operation: 'add' as 'add' | 'subtract',
    reason: '',
    notes: ''
  });

  const typeOptions = [
    { value: 'reguler', label: 'Reguler' },
    { value: 'season', label: 'Season' }
  ];

  const productTypeOptions = [
    { value: 'single', label: 'Produk Tunggal' },
    { value: 'package', label: 'Paket Produk' }
  ];

  const operationOptions = [
    { value: 'add', label: 'Tambah Stok' },
    { value: 'subtract', label: 'Kurangi Stok' }
  ];

  const itemsPerPageOptions = [
    { value: 5, label: '5 per halaman' },
    { value: 10, label: '10 per halaman' },
    { value: 25, label: '25 per halaman' },
    { value: 50, label: '50 per halaman' }
  ];

  const loadStockReductions = async (productId: number) => {
    try {
      const reductionsData = await db.getStockReductions(productId);
      setStockReductions(reductionsData);
    } catch (error) {
      console.error('Error loading stock reductions:', error);
      setStockReductions([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Apply custom rounding to base price and area prices if enabled
      const finalBasePrice = enableRounding ? customRound(formData.base_price) : formData.base_price;
      const finalAreaPrices = formData.area_prices.map(ap => ({
        ...ap,
        price: enableRounding ? customRound(ap.price) : ap.price
      }));

      if (editingProduct) {
        await db.updateProduct(
          editingProduct.id,
          formData.name,
          formData.packaging,
          formData.size,
          formData.type,
          formData.product_type,
          formData.stock_dozen,
          formData.stock_pcs,
          formData.minimum_stock,
          finalBasePrice,
          finalAreaPrices,
          formData.package_items
        );
        toast.success('Produk berhasil diperbarui');
      } else {
        await db.addProduct(
          formData.name,
          formData.packaging,
          formData.size,
          formData.type,
          formData.product_type,
          formData.stock_dozen,
          formData.stock_pcs,
          formData.minimum_stock,
          finalBasePrice,
          finalAreaPrices,
          formData.package_items
        );
        toast.success('Produk berhasil ditambahkan');
      }
      
      resetForm();
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      packaging: product.packaging,
      size: product.size,
      type: product.type,
      product_type: product.product_type,
      stock_dozen: product.stock_dozen,
      stock_pcs: product.stock_pcs,
      minimum_stock: product.minimum_stock,
      base_price: product.base_price,
      area_prices: product.area_prices || [],
      package_items: product.package_items || []
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Yakin ingin menghapus produk ini?')) {
      try {
        await db.deleteProduct(id);
        toast.success('Produk berhasil dihapus');
        refreshData();
      } catch (error) {
        toast.error('Terjadi kesalahan');
        console.error(error);
      }
    }
  };

  const handleStockUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct) return;

    try {
      // Calculate total pieces
      const totalPieces = (stockData.dozen * 12) + stockData.pcs;
      
      if (totalPieces <= 0) {
        toast.error('Jumlah stok harus lebih dari 0');
        return;
      }
      
      if (stockData.operation === 'subtract' && stockData.reason) {
        // For stock reduction with reason, use the special method
        await db.reduceProductStock(selectedProduct.id, totalPieces, stockData.reason, stockData.notes);
        toast.success('Stok berhasil dikurangi dan log tercatat');
      } else {
        // For regular stock updates, use the unit-based method
        if (selectedProduct.product_type === 'package') {
          await db.updatePackageProductStock(selectedProduct.id, totalPieces, stockData.operation);
        } else {
          await db.updateProductStockByUnit(selectedProduct.id, stockData.dozen, stockData.pcs, stockData.operation);
        }
        toast.success(`Stok berhasil ${stockData.operation === 'add' ? 'ditambah' : 'dikurangi'}`);
      }
      
      setShowStockModal(false);
      setStockData({ dozen: 0, pcs: 0, operation: 'add', reason: '', notes: '' });
      setSelectedProduct(null);
      refreshData();
    } catch (error) {
      toast.error('Terjadi kesalahan');
      console.error(error);
    }
  };

  const handleViewStockLog = (product: any) => {
    setSelectedProduct(product);
    loadStockReductions(product.id);
    setShowStockLogModal(true);
  };

  const handleViewPackageDetails = (product: any) => {
    if (product.product_type !== 'package') {
      toast.error('Produk ini bukan paket');
      return;
    }
    
    setSelectedProduct(product);
    setShowPackageDetailsModal(true);
  };

  const addAreaPrice = () => {
    setFormData({
      ...formData,
      area_prices: [...formData.area_prices, { price_area_id: '', price: 0 }]
    });
  };

  const updateAreaPrice = (index: number, field: string, value: any) => {
    const newAreaPrices = [...formData.area_prices];
    newAreaPrices[index] = { ...newAreaPrices[index], [field]: value };
    setFormData({ ...formData, area_prices: newAreaPrices });
  };

  const removeAreaPrice = (index: number) => {
    setFormData({
      ...formData,
      area_prices: formData.area_prices.filter((_, i) => i !== index)
    });
  };

  const addPackageItem = () => {
    setFormData({
      ...formData,
      package_items: [...formData.package_items, { product_id: '', quantity: 1 }]
    });
  };

  const updatePackageItem = (index: number, field: string, value: any) => {
    const newPackageItems = [...formData.package_items];
    newPackageItems[index] = { ...newPackageItems[index], [field]: value };
    setFormData({ ...formData, package_items: newPackageItems });
  };

  const removePackageItem = (index: number) => {
    setFormData({
      ...formData,
      package_items: formData.package_items.filter((_, i) => i !== index)
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      packaging: '',
      size: '',
      type: 'reguler',
      product_type: 'single',
      stock_dozen: 0,
      stock_pcs: 0,
      minimum_stock: 24,
      base_price: 0,
      area_prices: [],
      package_items: []
    });
    setEditingProduct(null);
    setShowForm(false);
    setEnableRounding(true);
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock === 0) {
      return { color: 'bg-red-100 text-red-800', label: 'Habis' };
    } else if (stock <= minStock) {
      return { color: 'bg-yellow-100 text-yellow-800', label: 'Menipis' };
    }
    return { color: 'bg-green-100 text-green-800', label: 'Tersedia' };
  };

  const getProductTypeBadge = (productType: string) => {
    const typeConfig = {
      single: { color: 'bg-blue-100 text-blue-800', label: 'Tunggal' },
      package: { color: 'bg-purple-100 text-purple-800', label: 'Paket' }
    };
    
    const config = typeConfig[productType as keyof typeof typeConfig] || typeConfig.single;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getProductTypeBadge2 = (type: string) => {
    const typeConfig = {
      reguler: { color: 'bg-blue-100 text-blue-800', label: 'Reguler' },
      season: { color: 'bg-orange-100 text-orange-800', label: 'Season' }
    };
    
    const config = typeConfig[type as keyof typeof typeConfig] || typeConfig.reguler;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  // Calculate new stock after operation
  const calculateNewStock = () => {
    if (!selectedProduct || (!stockData.dozen && !stockData.pcs)) return null;
    
    const currentDozen = selectedProduct.stock_dozen;
    const currentPcs = selectedProduct.stock_pcs;
    const currentTotal = (currentDozen * 12) + currentPcs;
    
    const changeDozen = stockData.dozen;
    const changePcs = stockData.pcs;
    const changeTotal = (changeDozen * 12) + changePcs;
    
    let newTotal;
    
    if (stockData.operation === 'add') {
      newTotal = currentTotal + changeTotal;
    } else {
      newTotal = Math.max(0, currentTotal - changeTotal);
    }
    
    const newDozen = Math.floor(newTotal / 12);
    const newPcs = newTotal % 12;
    
    return {
      current: { dozen: currentDozen, pcs: currentPcs, total: currentTotal },
      new: { dozen: newDozen, pcs: newPcs, total: newTotal },
      change: stockData.operation === 'add' ? `+${changeTotal}` : `-${changeTotal}`
    };
  };

  // Get single products for package items (exclude packages to prevent circular reference)
  const singleProductOptions = products
    .filter((product: any) => product.product_type === 'single')
    .map((product: any) => ({
      value: product.id,
      label: `${product.name} - ${product.packaging} ${product.size} (${formatCurrency(product.base_price)}) - Stok: ${product.stock}`
    }));

  // Filter products based on search term
  const filteredProducts = products.filter((product: any) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.packaging.toLowerCase().includes(searchLower) ||
      product.size.toLowerCase().includes(searchLower) ||
      product.type.toLowerCase().includes(searchLower)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentProducts = filteredProducts.slice(startIndex, endIndex);

  const stockCalculation = calculateNewStock();

  // Get package details for a product
  const getPackageDetails = (packageProduct: any) => {
    if (!packageProduct || packageProduct.product_type !== 'package') return [];
    
    return (packageProduct.package_items || []).map((item: any) => {
      const product = products.find((p: any) => p.id === item.product_id);
      return {
        ...item,
        product_name: product ? product.name : 'Unknown Product',
        product_packaging: product ? product.packaging : '',
        product_size: product ? product.size : '',
        product_price: product ? product.base_price : 0,
        product_stock: product ? product.stock : 0
      };
    });
  };

  // Count seasonal products
  const seasonalProductsCount = products.filter(p => p.type === 'season').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen Produk</h1>
          <p className="text-gray-600 mt-1">Kelola produk, stok, dan harga area</p>
        </div>
        <div className="flex gap-2">
          {seasonalProductsCount > 0 && (
            <Link to="/seasonal-report">
              <Button
                icon={BarChart}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                Laporan Season
              </Button>
            </Link>
          )}
          <Button
            onClick={() => setShowForm(true)}
            icon={Plus}
          >
            Tambah Produk
          </Button>
        </div>
      </div>

      {/* Stock Update Modal */}
      <Modal
        isOpen={showStockModal}
        onClose={() => {
          setShowStockModal(false);
          setSelectedProduct(null);
          setStockData({ dozen: 0, pcs: 0, operation: 'add', reason: '', notes: '' });
        }}
        title={`Update Stok - ${selectedProduct?.name}`}
        size="md"
      >
        <form onSubmit={handleStockUpdate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Operasi"
              value={stockData.operation}
              onChange={(value) => setStockData({ ...stockData, operation: value as 'add' | 'subtract' })}
              options={operationOptions}
              required
            />
            <div className="flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jumlah
              </label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    label="Lusin"
                    type="number"
                    value={stockData.dozen}
                    onChange={(e) => setStockData({ ...stockData, dozen: parseInt(e.target.value) || 0 })}
                    min={0}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    label="Pcs"
                    type="number"
                    value={stockData.pcs}
                    onChange={(e) => {
                      const pcs = parseInt(e.target.value) || 0;
                      if (pcs >= 12) {
                        // Convert to dozens and pieces
                        const additionalDozens = Math.floor(pcs / 12);
                        const remainingPcs = pcs % 12;
                        setStockData({
                          ...stockData,
                          dozen: stockData.dozen + additionalDozens,
                          pcs: remainingPcs
                        });
                      } else {
                        setStockData({ ...stockData, pcs });
                      }
                    }}
                    min={0}
                  />
                </div>
              </div>
            </div>
          </div>
          
          {stockData.operation === 'subtract' && (
            <Input
              label="Alasan Pengurangan"
              value={stockData.reason}
              onChange={(e) => setStockData({ ...stockData, reason: e.target.value })}
              placeholder="Contoh: Rusak, Kadaluarsa, dll"
              required
            />
          )}
          
          <Input
            label="Catatan"
            value={stockData.notes}
            onChange={(e) => setStockData({ ...stockData, notes: e.target.value })}
            placeholder="Catatan tambahan (opsional)"
          />

          {/* Stock Calculation Preview */}
          {stockCalculation && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2 flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Informasi Perubahan Stok
              </h5>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-blue-700 font-medium">Stok Saat Ini:</span>
                  <p className="text-blue-800">{stockCalculation.current.dozen}d {stockCalculation.current.pcs}p ({stockCalculation.current.total} total)</p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Perubahan:</span>
                  <p className={`font-bold ${stockData.operation === 'add' ? 'text-green-600' : 'text-red-600'}`}>
                    {stockCalculation.change} pcs
                  </p>
                </div>
                <div>
                  <span className="text-blue-700 font-medium">Stok Setelah:</span>
                  <p className="text-blue-800 font-bold">{stockCalculation.new.dozen}d {stockCalculation.new.pcs}p ({stockCalculation.new.total} total)</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3">
            <Button type="submit" disabled={!stockData.dozen && !stockData.pcs}>
              {stockData.operation === 'add' ? 'Tambah Stok' : 'Kurangi Stok'}
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setShowStockModal(false);
                setSelectedProduct(null);
                setStockData({ dozen: 0, pcs: 0, operation: 'add', reason: '', notes: '' });
              }}
            >
              Batal
            </Button>
          </div>
        </form>
      </Modal>

      {/* Stock Log Modal */}
      <Modal
        isOpen={showStockLogModal}
        onClose={() => {
          setShowStockLogModal(false);
          setSelectedProduct(null);
          setStockReductions([]);
        }}
        title={`Log Pengurangan Stok - ${selectedProduct?.name}`}
        size="xl"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tanggal</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Alasan</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Catatan</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stockReductions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                      <History className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      Belum ada log pengurangan stok
                    </td>
                  </tr>
                ) : (
                  stockReductions.map((reduction: any) => (
                    <tr key={reduction.id}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {new Date(reduction.date).toLocaleDateString('id-ID')}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        <span className="font-medium text-red-600">-{reduction.amount}</span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {reduction.reason}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">
                        {reduction.notes || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Package Details Modal */}
      <Modal
        isOpen={showPackageDetailsModal}
        onClose={() => {
          setShowPackageDetailsModal(false);
          setSelectedProduct(null);
        }}
        title={`Detail Paket - ${selectedProduct?.name}`}
        size="lg"
      >
        <div className="space-y-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="font-medium text-purple-900 mb-2">Informasi Paket</h4>
            <p className="text-sm text-purple-800">
              {selectedProduct?.name} - {selectedProduct?.packaging} {selectedProduct?.size}
            </p>
            <p className="text-sm text-purple-700 mt-1">
              Harga: {formatCurrency(selectedProduct?.base_price || 0)}
            </p>
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-3">Produk dalam Paket</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Kemasan</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Ukuran</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedProduct && getPackageDetails(selectedProduct).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <Package className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        Paket ini tidak memiliki produk
                      </td>
                    </tr>
                  ) : (
                    selectedProduct && getPackageDetails(selectedProduct).map((item: any, index: number) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-purple-500 mr-2" />
                            {item.product_name}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product_packaging}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {item.product_size}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          {formatCurrency(item.product_price)}
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <span className={item.product_stock === 0 ? 'text-red-600 font-medium' : ''}>
                            {item.product_stock}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-900">
                          <span className="font-medium">{item.quantity}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </Modal>

      {/* Search & Pagination */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cari Produk
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
                placeholder="Cari berdasarkan nama, kemasan, ukuran, atau tipe..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
            Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} dari {filteredProducts.length} produk
            {searchTerm && ` (difilter dari ${products.length} total)`}
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
        <Card>
          <CardHeader>
            <CardTitle>
              {editingProduct ? 'Edit Produk' : 'Tambah Produk Baru'}
            </CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Nama Produk"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama produk"
                required
              />
              <Select
                label="Jenis Produk"
                value={formData.product_type}
                onChange={(value) => setFormData({ ...formData, product_type: value.toString() })}
                options={productTypeOptions}
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Kemasan"
                value={formData.packaging}
                onChange={(e) => setFormData({ ...formData, packaging: e.target.value })}
                placeholder="Contoh: Plastik, Kardus"
                required
              />
              <Input
                label="Ukuran"
                value={formData.size}
                onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                placeholder="Contoh: Besar, Sedang, Kecil"
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

            {formData.product_type === 'single' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Stok Lusin"
                  type="number"
                  value={formData.stock_dozen}
                  onChange={(e) => setFormData({ ...formData, stock_dozen: parseInt(e.target.value) || 0 })}
                  min={0}
                />
                <Input
                  label="Stok Pcs"
                  type="number"
                  value={formData.stock_pcs}
                  onChange={(e) => {
                    const pcs = parseInt(e.target.value) || 0;
                    if (pcs >= 12) {
                      // Convert to dozens and pieces
                      const additionalDozens = Math.floor(pcs / 12);
                      const remainingPcs = pcs % 12;
                      setFormData({
                        ...formData,
                        stock_dozen: formData.stock_dozen + additionalDozens,
                        stock_pcs: remainingPcs
                      });
                    } else {
                      setFormData({ ...formData, stock_pcs: pcs });
                    }
                  }}
                  min={0}
                />
                <Input
                  label="Minimum Stok"
                  type="number"
                  value={formData.minimum_stock}
                  onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 0 })}
                  min={1}
                  required
                />
              </div>
            )}

            {formData.product_type === 'package' && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Isi Paket</h3>
                  <Button type="button" onClick={addPackageItem} size="sm" icon={Plus}>
                    Tambah Item
                  </Button>
                </div>
                
                <div className="space-y-4">
                  {formData.package_items.map((item, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                      <SearchableSelect
                        label="Produk"
                        value={item.product_id}
                        onChange={(value) => updatePackageItem(index, 'product_id', parseInt(value.toString()))}
                        options={singleProductOptions}
                        placeholder="Pilih produk"
                        required
                      />
                      <Input
                        label="Jumlah"
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updatePackageItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min={1}
                        required
                      />
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          icon={Minus}
                          onClick={() => removePackageItem(index)}
                        >
                          Hapus
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Harga Dasar
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  type="number"
                  value={formData.base_price}
                  onChange={(e) => setFormData({ ...formData, base_price: parseFloat(e.target.value) || 0 })}
                  min={0}
                  required
                />
                <div className="flex items-center">
                  <span className="text-sm text-gray-500">
                    {enableRounding ? `Harga setelah pembulatan: ${formatCurrency(customRound(formData.base_price))}` : 'Pembulatan dinonaktifkan'}
                  </span>
                </div>
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="enable_rounding"
                  checked={enableRounding}
                  onChange={(e) => setEnableRounding(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="enable_rounding" className="text-sm text-gray-700">
                  Aktifkan pembulatan harga
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Pembulatan: Angka yang berakhir dengan 500 tetap, 001-499 dibulatkan ke 500, 501-999 dibulatkan ke 1000
              </p>
            </div>

            {/* Area Prices */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Harga per Area</h3>
                <Button type="button" onClick={addAreaPrice} size="sm">
                  Tambah Area
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.area_prices.map((areaPrice, index) => (
                  <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg">
                    <Select
                      label="Area Harga"
                      value={areaPrice.price_area_id}
                      onChange={(value) => updateAreaPrice(index, 'price_area_id', parseInt(value.toString()))}
                      options={priceAreas.map((area: any) => ({
                        value: area.id,
                        label: area.name
                      }))}
                      placeholder="Pilih area"
                      required
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Harga
                      </label>
                      <div className="flex gap-4">
                        <Input
                          type="number"
                          value={areaPrice.price}
                          onChange={(e) => updateAreaPrice(index, 'price', parseFloat(e.target.value) || 0)}
                          min={0}
                          required
                          className="flex-1"
                        />
                        <div className="flex items-center">
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {enableRounding ? `→ ${formatCurrency(customRound(areaPrice.price))}` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={Minus}
                        onClick={() => removeAreaPrice(index)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button type="submit">
                {editingProduct ? 'Perbarui' : 'Simpan'}
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
              <TableHead>Nama Produk</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Kemasan & Ukuran</TableHead>
              <TableHead>Stok</TableHead>
              <TableHead>Harga Dasar</TableHead>
              <TableHead>HPP</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {searchTerm ? 'Tidak ada produk yang sesuai dengan pencarian' : 'Belum ada data produk'}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              currentProducts.map((product: any) => {
                const stockStatus = getStockStatus(product.stock, product.minimum_stock);
                
                return (
                  <TableRow key={product.id}>
                    <TableCell>{product.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Package className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <p className="font-medium">{product.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getProductTypeBadge(product.product_type)}
                    </TableCell>
                    <TableCell>
                      {getProductTypeBadge2(product.type)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{product.packaging}</p>
                        <p className="text-gray-500">{product.size}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {product.product_type === 'single' ? (
                        <div className="flex items-center">
                          {product.stock <= product.minimum_stock && product.stock > 0 && (
                            <AlertTriangle className="h-4 w-4 text-yellow-500 mr-1" />
                          )}
                          {product.stock === 0 && (
                            <AlertTriangle className="h-4 w-4 text-red-500 mr-1" />
                          )}
                          <span className={product.stock === 0 ? 'text-red-600 font-medium' : ''}>
                            {product.stock_dozen}d {product.stock_pcs}p
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500">Paket</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(product.base_price)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-emerald-600">
                        {product.hpp_price ? formatCurrency(product.hpp_price) : '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {product.product_type === 'single' && (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                          {stockStatus.label}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {product.product_type === 'package' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={Eye}
                            onClick={() => handleViewPackageDetails(product)}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                          >
                            Isi Paket
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={Settings}
                          onClick={() => {
                            setSelectedProduct(product);
                            setShowStockModal(true);
                          }}
                        >
                          Stok
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={History}
                          onClick={() => handleViewStockLog(product)}
                        >
                          Log
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Edit}
                          onClick={() => handleEdit(product)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={Trash2}
                          onClick={() => handleDelete(product.id)}
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

export default Products;