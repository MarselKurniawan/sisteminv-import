import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { BarChart, Calendar, Download, Filter, Package, PieChart } from 'lucide-react';
import toast from 'react-hot-toast';

const SeasonalReport: React.FC = () => {
  const { products, storeDeliveries, individualDeliveries, returns } = useApp();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const generateReport = () => {
    if (!dateFrom || !dateTo) {
      toast.error('Pilih tanggal mulai dan akhir');
      return;
    }

    setLoading(true);

    try {
      // Get seasonal products
      const seasonalProducts = products.filter((product: any) => product.type === 'season');
      
      if (seasonalProducts.length === 0) {
        toast.error('Tidak ada produk seasonal yang tersedia');
        setLoading(false);
        return;
      }

      // Get all deliveries in date range
      const filteredStoreDeliveries = storeDeliveries.filter((delivery: any) => {
        const deliveryDate = new Date(delivery.delivery_date);
        return deliveryDate >= new Date(dateFrom) && deliveryDate <= new Date(dateTo);
      });

      const filteredIndividualDeliveries = individualDeliveries.filter((delivery: any) => {
        const deliveryDate = new Date(delivery.purchase_date);
        return deliveryDate >= new Date(dateFrom) && deliveryDate <= new Date(dateTo);
      });

      // Get all returns in date range
      const filteredReturns = returns.filter((returnItem: any) => {
        const returnDate = new Date(returnItem.return_date);
        return returnDate >= new Date(dateFrom) && returnDate <= new Date(dateTo);
      });

      // Calculate sales for each seasonal product
      const productSales = seasonalProducts.map((product: any) => {
        // Count sales from store deliveries
        const storeSales = filteredStoreDeliveries.reduce((total: number, delivery: any) => {
          const productItem = delivery.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.quantity : 0);
        }, 0);

        // Count sales from individual deliveries
        const individualSales = filteredIndividualDeliveries.reduce((total: number, delivery: any) => {
          const productItem = delivery.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.quantity : 0);
        }, 0);

        // Count returns
        const productReturns = filteredReturns.reduce((total: number, returnItem: any) => {
          const productItem = returnItem.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.quantity : 0);
        }, 0);

        // Calculate net sales
        const netSales = storeSales + individualSales - productReturns;

        // Calculate revenue
        const revenue = filteredStoreDeliveries.reduce((total: number, delivery: any) => {
          const productItem = delivery.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.total_price : 0);
        }, 0) + filteredIndividualDeliveries.reduce((total: number, delivery: any) => {
          const productItem = delivery.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.total_price : 0);
        }, 0);

        // Calculate returns value
        const returnsValue = filteredReturns.reduce((total: number, returnItem: any) => {
          const productItem = returnItem.items?.find((item: any) => item.product_id === product.id);
          return total + (productItem ? productItem.total_price : 0);
        }, 0);

        // Calculate net revenue
        const netRevenue = revenue - returnsValue;

        return {
          id: product.id,
          name: product.name,
          packaging: product.packaging,
          size: product.size,
          base_price: product.base_price,
          store_sales: storeSales,
          individual_sales: individualSales,
          returns: productReturns,
          net_sales: netSales,
          revenue,
          returns_value: returnsValue,
          net_revenue: netRevenue
        };
      });

      // Calculate totals
      const totalStoreSales = productSales.reduce((sum, product) => sum + product.store_sales, 0);
      const totalIndividualSales = productSales.reduce((sum, product) => sum + product.individual_sales, 0);
      const totalReturns = productSales.reduce((sum, product) => sum + product.returns, 0);
      const totalNetSales = productSales.reduce((sum, product) => sum + product.net_sales, 0);
      const totalRevenue = productSales.reduce((sum, product) => sum + product.revenue, 0);
      const totalReturnsValue = productSales.reduce((sum, product) => sum + product.returns_value, 0);
      const totalNetRevenue = productSales.reduce((sum, product) => sum + product.net_revenue, 0);

      setReportData({
        products: productSales,
        totals: {
          store_sales: totalStoreSales,
          individual_sales: totalIndividualSales,
          returns: totalReturns,
          net_sales: totalNetSales,
          revenue: totalRevenue,
          returns_value: totalReturnsValue,
          net_revenue: totalNetRevenue
        },
        period: {
          from: dateFrom,
          to: dateTo
        }
      });

    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Terjadi kesalahan saat membuat laporan');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (!reportData) return;

    try {
      let csvContent = 'ID,Nama Produk,Kemasan,Ukuran,Harga Dasar,Penjualan Toko,Penjualan Perorangan,Retur,Penjualan Bersih,Pendapatan,Nilai Retur,Pendapatan Bersih\n';
      
      reportData.products.forEach((product: any) => {
        csvContent += `${product.id},${product.name},${product.packaging},${product.size},${product.base_price},${product.store_sales},${product.individual_sales},${product.returns},${product.net_sales},${product.revenue},${product.returns_value},${product.net_revenue}\n`;
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `laporan_produk_season_${dateFrom}_${dateTo}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Laporan berhasil diunduh');
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      toast.error('Terjadi kesalahan saat mengunduh laporan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan Produk Season</h1>
          <p className="text-gray-600 mt-1">Analisis penjualan produk seasonal berdasarkan periode</p>
        </div>
        {reportData && (
          <Button
            onClick={exportToCSV}
            icon={Download}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            Export CSV
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="border-orange-200">
        <CardHeader className="bg-orange-50">
          <CardTitle className="text-orange-800 flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Filter Periode
          </CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Tanggal Mulai"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            required
          />
          <Input
            label="Tanggal Akhir"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            required
          />
          <div className="flex items-end">
            <Button
              onClick={generateReport}
              disabled={loading || !dateFrom || !dateTo}
              icon={loading ? RefreshCw : BarChart}
              className={`bg-orange-600 hover:bg-orange-700 text-white ${loading ? 'animate-spin' : ''}`}
            >
              {loading ? 'Memproses...' : 'Generate Laporan'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Report Summary */}
      {reportData && (
        <>
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-800">Ringkasan Laporan</CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Periode: {new Date(reportData.period.from).toLocaleDateString('id-ID')} - {new Date(reportData.period.to).toLocaleDateString('id-ID')}
                </p>
                <p className="text-sm text-gray-600">
                  Total Produk Season: {reportData.products.length}
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-600">Total Penjualan</p>
                    <p className="text-2xl font-bold text-orange-600">{reportData.totals.net_sales}</p>
                    <div className="text-xs text-gray-500 mt-1">
                      <span className="text-blue-600">Toko: {reportData.totals.store_sales}</span> | 
                      <span className="text-purple-600"> Perorangan: {reportData.totals.individual_sales}</span>
                    </div>
                  </div>
                </Card>
                
                <Card>
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-600">Total Retur</p>
                    <p className="text-2xl font-bold text-red-600">{reportData.totals.returns}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Nilai: {formatCurrency(reportData.totals.returns_value)}
                    </p>
                  </div>
                </Card>
                
                <Card>
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-600">Total Pendapatan</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(reportData.totals.revenue)}</p>
                  </div>
                </Card>
                
                <Card>
                  <div className="text-center p-4">
                    <p className="text-sm text-gray-600">Pendapatan Bersih</p>
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(reportData.totals.net_revenue)}</p>
                  </div>
                </Card>
              </div>
            </div>
          </Card>

          {/* Detailed Report */}
          <Card padding={false} className="border-orange-200">
            <CardHeader className="bg-orange-50 p-4">
              <CardTitle className="text-orange-800">Detail Penjualan Produk Season</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-orange-50">
                    <TableHead className="text-orange-700">ID</TableHead>
                    <TableHead className="text-orange-700">Produk</TableHead>
                    <TableHead className="text-orange-700">Kemasan</TableHead>
                    <TableHead className="text-orange-700">Harga</TableHead>
                    <TableHead className="text-orange-700">Toko</TableHead>
                    <TableHead className="text-orange-700">Perorangan</TableHead>
                    <TableHead className="text-orange-700">Retur</TableHead>
                    <TableHead className="text-orange-700">Net Sales</TableHead>
                    <TableHead className="text-orange-700">Pendapatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.products.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <p className="text-gray-500">Tidak ada data penjualan produk season</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    reportData.products.map((product: any) => (
                      <TableRow key={product.id} className="hover:bg-orange-50">
                        <TableCell>{product.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Package className="h-4 w-4 text-orange-500 mr-2" />
                            <div>
                              <p className="font-medium">{product.name}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <p>{product.packaging}</p>
                            <p className="text-gray-500">{product.size}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(product.base_price)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-blue-600 font-medium">{product.store_sales}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-purple-600 font-medium">{product.individual_sales}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-red-600 font-medium">{product.returns}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{product.net_sales}</span>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-emerald-600">
                            {formatCurrency(product.net_revenue)}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          {/* Sales Distribution */}
          <Card className="border-orange-200">
            <CardHeader className="bg-orange-50">
              <CardTitle className="text-orange-800 flex items-center">
                <PieChart className="h-5 w-5 mr-2" />
                Distribusi Penjualan
              </CardTitle>
            </CardHeader>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Penjualan per Produk</h3>
                  <div className="space-y-3">
                    {reportData.products.map((product: any) => {
                      const percentage = reportData.totals.net_sales > 0 
                        ? (product.net_sales / reportData.totals.net_sales) * 100 
                        : 0;
                      
                      return (
                        <div key={product.id} className="flex items-center">
                          <span className="w-32 text-sm truncate">{product.name}</span>
                          <div className="flex-1 mx-2">
                            <div className="bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-orange-600 h-2.5 rounded-full" 
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm font-medium w-16 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Pendapatan per Produk</h3>
                  <div className="space-y-3">
                    {reportData.products.map((product: any) => {
                      const percentage = reportData.totals.net_revenue > 0 
                        ? (product.net_revenue / reportData.totals.net_revenue) * 100 
                        : 0;
                      
                      return (
                        <div key={product.id} className="flex items-center">
                          <span className="w-32 text-sm truncate">{product.name}</span>
                          <div className="flex-1 mx-2">
                            <div className="bg-gray-200 rounded-full h-2.5">
                              <div 
                                className="bg-green-600 h-2.5 rounded-full" 
                                style={{ width: `${Math.max(percentage, 2)}%` }}
                              ></div>
                            </div>
                          </div>
                          <span className="text-sm font-medium w-16 text-right">
                            {percentage.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </>
      )}

      {/* Tips */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="text-orange-800">Tips Penggunaan</CardTitle>
        </CardHeader>
        <div className="p-4">
          <ul className="space-y-2 text-sm text-orange-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Pilih Periode:</strong> Tentukan rentang tanggal untuk melihat penjualan produk season.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Generate Laporan:</strong> Klik tombol "Generate Laporan" untuk melihat data penjualan.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Analisis Data:</strong> Perhatikan produk season mana yang paling laris dan menghasilkan pendapatan tertinggi.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Export Data:</strong> Gunakan tombol "Export CSV" untuk mengunduh laporan dalam format CSV.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Perencanaan:</strong> Gunakan data ini untuk merencanakan produksi dan promosi produk season di masa mendatang.</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default SeasonalReport;