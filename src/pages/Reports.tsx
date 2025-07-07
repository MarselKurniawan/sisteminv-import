import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/Table';
import { useApp } from '../contexts/AppContext';
import { db } from '../lib/database';
import { FileText, Download, Filter, Calendar } from 'lucide-react';

const Reports: React.FC = () => {
  const { storeDeliveries, individualDeliveries, returns } = useApp();
  const [reportType, setReportType] = useState('deliveries');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [bookkeepingReport, setBookkeepingReport] = useState<any>(null);

  const reportTypeOptions = [
    { value: 'deliveries', label: 'Laporan Pengiriman' },
    { value: 'returns', label: 'Laporan Retur' },
    { value: 'revenue', label: 'Laporan Pendapatan' },
    { value: 'bookkeeping', label: 'Laporan Pembukuan' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID');
  };

  const getFilteredData = () => {
    let data: any[] = [];
    
    if (reportType === 'deliveries') {
      data = [...storeDeliveries, ...individualDeliveries];
    } else if (reportType === 'returns') {
      data = returns;
    } else if (reportType === 'revenue') {
      data = [...storeDeliveries, ...individualDeliveries].filter((item: any) => 
        item.status === 'completed'
      );
    } else if (reportType === 'bookkeeping') {
      return bookkeepingReport?.entries || [];
    }

    // Filter by date range
    if (dateFrom) {
      data = data.filter((item: any) => {
        const itemDate = new Date(item.delivery_date || item.purchase_date || item.return_date);
        return itemDate >= new Date(dateFrom);
      });
    }

    if (dateTo) {
      data = data.filter((item: any) => {
        const itemDate = new Date(item.delivery_date || item.purchase_date || item.return_date);
        return itemDate <= new Date(dateTo);
      });
    }

    // Filter by city
    if (filterCity) {
      data = data.filter((item: any) => 
        item.city_name?.toLowerCase().includes(filterCity.toLowerCase())
      );
    }

    return data;
  };

  const generateBookkeepingReport = async () => {
    if (!dateFrom || !dateTo) {
      alert('Pilih tanggal mulai dan akhir untuk laporan pembukuan');
      return;
    }

    try {
      const report = await db.getBookkeepingReport(dateFrom, dateTo);
      setBookkeepingReport(report);
    } catch (error) {
      console.error('Error generating bookkeeping report:', error);
    }
  };

  React.useEffect(() => {
    if (reportType === 'bookkeeping' && dateFrom && dateTo) {
      generateBookkeepingReport();
    }
  }, [reportType, dateFrom, dateTo]);

  const exportToCSV = () => {
    const data = getFilteredData();
    let csvContent = '';
    
    if (reportType === 'deliveries') {
      csvContent = 'ID,Tipe,Tujuan,Kota,Tanggal,Status,Total\n';
      data.forEach((item: any) => {
        const type = item.store_name ? 'Toko' : 'Perorangan';
        const destination = item.store_name || item.customer_name;
        const date = formatDate(item.delivery_date || item.purchase_date);
        csvContent += `${item.id},${type},${destination},${item.city_name || '-'},${date},${item.status},${item.total_amount}\n`;
      });
    } else if (reportType === 'returns') {
      csvContent = 'ID,Tipe,Tanggal,Alasan,Total\n';
      data.forEach((item: any) => {
        const type = item.delivery_type === 'store' ? 'Toko' : 'Perorangan';
        const date = formatDate(item.return_date);
        csvContent += `${item.id},${type},${date},${item.reason},${item.total_amount}\n`;
      });
    } else if (reportType === 'revenue') {
      csvContent = 'ID,Tipe,Tujuan,Tanggal,Pendapatan\n';
      data.forEach((item: any) => {
        const type = item.store_name ? 'Toko' : 'Perorangan';
        const destination = item.store_name || item.customer_name;
        const date = formatDate(item.delivery_date || item.purchase_date);
        csvContent += `${item.id},${type},${destination},${date},${item.total_amount}\n`;
      });
    } else if (reportType === 'bookkeeping') {
      csvContent = 'Tanggal,Tipe,Kategori,Deskripsi,Jumlah\n';
      data.forEach((item: any) => {
        const date = formatDate(item.date);
        const type = item.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
        csvContent += `${date},${type},${item.category},${item.description},${item.amount}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `laporan_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = getFilteredData();
  const totalAmount = filteredData.reduce((sum: number, item: any) => sum + (item.total_amount || item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Laporan</h1>
          <p className="text-gray-600 mt-1">Generate dan export laporan data</p>
        </div>
        <Button
          onClick={exportToCSV}
          icon={Download}
          disabled={filteredData.length === 0}
        >
          Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Select
            label="Jenis Laporan"
            value={reportType}
            onChange={(value) => setReportType(value.toString())}
            options={reportTypeOptions}
          />
          <Input
            label="Tanggal Dari"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <Input
            label="Tanggal Sampai"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
          {reportType !== 'bookkeeping' && (
            <Input
              label="Filter Kota"
              value={filterCity}
              onChange={(e) => setFilterCity(e.target.value)}
              placeholder="Cari berdasarkan kota"
            />
          )}
        </div>
        
        <div className="mt-4 flex items-center gap-4">
          <Button
            variant="secondary"
            icon={Filter}
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setFilterCity('');
              setBookkeepingReport(null);
            }}
          >
            Reset Filter
          </Button>
          {reportType === 'bookkeeping' && (
            <Button
              onClick={generateBookkeepingReport}
              icon={Calendar}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!dateFrom || !dateTo}
            >
              Generate Laporan Pembukuan
            </Button>
          )}
          <div className="text-sm text-gray-600">
            Total Data: <span className="font-medium">{filteredData.length}</span>
            {reportType !== 'bookkeeping' && (
              <span className="ml-4">
                Total Nilai: <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </span>
            )}
            {reportType === 'bookkeeping' && bookkeepingReport && (
              <>
                <span className="ml-4">
                  Pemasukan: <span className="font-medium text-green-600">{formatCurrency(bookkeepingReport.total_income)}</span>
                </span>
                <span className="ml-4">
                  Pengeluaran: <span className="font-medium text-red-600">{formatCurrency(bookkeepingReport.total_expense)}</span>
                </span>
                <span className="ml-4">
                  Laba: <span className={`font-medium ${bookkeepingReport.net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(bookkeepingReport.net_profit)}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      </Card>

      {/* Report Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {reportType === 'deliveries' && (
                  <>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Kota</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                  </>
                )}
                {reportType === 'returns' && (
                  <>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tanggal Retur</TableHead>
                    <TableHead>Alasan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                  </>
                )}
                {reportType === 'revenue' && (
                  <>
                    <TableHead>ID</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Tujuan</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Pendapatan</TableHead>
                  </>
                )}
                {reportType === 'bookkeeping' && (
                  <>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Jumlah</TableHead>
                    <TableHead>Sumber</TableHead>
                  </>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">Tidak ada data untuk ditampilkan</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item: any) => (
                  <TableRow key={`${reportType}-${item.id}`}>
                    {reportType === 'deliveries' && (
                      <>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.store_name ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.store_name ? 'Toko' : 'Perorangan'}
                          </span>
                        </TableCell>
                        <TableCell>{item.store_name || item.customer_name}</TableCell>
                        <TableCell>{item.city_name || '-'}</TableCell>
                        <TableCell>{formatDate(item.delivery_date || item.purchase_date)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </>
                    )}
                    {reportType === 'returns' && (
                      <>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.delivery_type === 'store' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.delivery_type === 'store' ? 'Toko' : 'Perorangan'}
                          </span>
                        </TableCell>
                        <TableCell>{formatDate(item.return_date)}</TableCell>
                        <TableCell className="max-w-xs truncate">{item.reason}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.status}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </>
                    )}
                    {reportType === 'revenue' && (
                      <>
                        <TableCell>{item.id}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.store_name ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.store_name ? 'Toko' : 'Perorangan'}
                          </span>
                        </TableCell>
                        <TableCell>{item.store_name || item.customer_name}</TableCell>
                        <TableCell>{formatDate(item.delivery_date || item.purchase_date)}</TableCell>
                        <TableCell className="font-medium">{formatCurrency(item.total_amount)}</TableCell>
                      </>
                    )}
                    {reportType === 'bookkeeping' && (
                      <>
                        <TableCell>{formatDate(item.date)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.type === 'income' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {item.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.category === 'primer' ? 'bg-blue-100 text-blue-800' : 
                            item.category === 'sekunder' ? 'bg-purple-100 text-purple-800' : 
                            'bg-orange-100 text-orange-800'
                          }`}>
                            {item.category}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{item.description}</TableCell>
                        <TableCell className="font-medium">
                          <span className={item.type === 'income' ? 'text-green-600' : 'text-red-600'}>
                            {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.is_auto ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {item.is_auto ? 'Otomatis' : 'Manual'}
                          </span>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default Reports;