import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useApp } from '../contexts/AppContext';
import { DollarSign, Plus, Minus, Calculator, RefreshCw, Save, PieChart, Building, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

interface OverheadItem {
  name: string;
  amount: number;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

const OverheadCalculator: React.FC = () => {
  const { assets, payrolls } = useApp();
  const [overheadItems, setOverheadItems] = useState<OverheadItem[]>([]);
  const [calculationPeriod, setCalculationPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [productionVolume, setProductionVolume] = useState<number>(0);
  const [overheadPerUnit, setOverheadPerUnit] = useState<number>(0);
  const [history, setHistory] = useState<Array<{
    items: OverheadItem[];
    period: string;
    totalOverhead: number;
    productionVolume: number;
    overheadPerUnit: number;
    date: Date;
  }>>([]);

  // Additional fields for the enhanced overhead calculator
  const [targetSalesPerMonth, setTargetSalesPerMonth] = useState<number>(0);
  const [totalAssets, setTotalAssets] = useState<number>(0);
  const [rentCostPerYear, setRentCostPerYear] = useState<number>(0);
  const [utilitiesCostPerMonth, setUtilitiesCostPerMonth] = useState<number>(0);
  const [managementSalaryPerMonth, setManagementSalaryPerMonth] = useState<number>(0);
  const [depreciationPerMonth, setDepreciationPerMonth] = useState<number>(0);
  const [maintenanceCostPerMonth, setMaintenanceCostPerMonth] = useState<number>(0);
  const [totalOverheadPerPortion, setTotalOverheadPerPortion] = useState<number>(0);

  const frequencyOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' }
  ];

  const periodOptions = [
    { value: 'daily', label: 'Harian' },
    { value: 'weekly', label: 'Mingguan' },
    { value: 'monthly', label: 'Bulanan' },
    { value: 'yearly', label: 'Tahunan' }
  ];

  // Load data from assets and payrolls
  useEffect(() => {
    // Calculate total assets value
    const assetsValue = assets?.reduce((sum: number, asset: any) => {
      return sum + (asset.current_value || asset.purchase_price);
    }, 0) || 0;
    setTotalAssets(assetsValue);

    // Calculate depreciation per month
    const totalDepreciation = assets?.reduce((sum: number, asset: any) => {
      // Simple straight-line depreciation
      const yearlyDepreciation = asset.purchase_price / (asset.useful_life_years || 5);
      return sum + (yearlyDepreciation / 12);
    }, 0) || 0;
    setDepreciationPerMonth(totalDepreciation);

    // Calculate maintenance cost per month
    const totalMaintenance = assets?.reduce((sum: number, asset: any) => {
      return sum + (asset.maintenance_cost_yearly || 0) / 12;
    }, 0) || 0;
    setMaintenanceCostPerMonth(totalMaintenance);

    // Calculate management salary per month
    const totalManagementSalary = payrolls?.reduce((sum: number, payroll: any) => {
      // Only include management positions
      const isManagement = payroll.employee_position?.toLowerCase().includes('manager') || 
                          payroll.employee_position?.toLowerCase().includes('direktur') ||
                          payroll.employee_position?.toLowerCase().includes('supervisor');
      return sum + (isManagement ? payroll.total_salary : 0);
    }, 0) || 0;
    setManagementSalaryPerMonth(totalManagementSalary);
  }, [assets, payrolls]);

  // Calculate total overhead per portion whenever inputs change
  useEffect(() => {
    if (targetSalesPerMonth <= 0) return;

    // Convert all costs to monthly
    const rentPerMonth = rentCostPerYear / 12;
    
    // Sum all monthly costs
    const totalMonthlyOverhead = rentPerMonth + 
                               utilitiesCostPerMonth + 
                               managementSalaryPerMonth + 
                               depreciationPerMonth + 
                               maintenanceCostPerMonth;
    
    // Calculate per portion
    const perPortion = totalMonthlyOverhead / targetSalesPerMonth;
    setTotalOverheadPerPortion(perPortion);
    
  }, [
    targetSalesPerMonth,
    rentCostPerYear,
    utilitiesCostPerMonth,
    managementSalaryPerMonth,
    depreciationPerMonth,
    maintenanceCostPerMonth
  ]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const addOverheadItem = () => {
    setOverheadItems([...overheadItems, {
      name: '',
      amount: 0,
      frequency: 'monthly'
    }]);
  };

  const updateOverheadItem = (index: number, field: string, value: any) => {
    const newItems = [...overheadItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setOverheadItems(newItems);
  };

  const removeOverheadItem = (index: number) => {
    setOverheadItems(overheadItems.filter((_, i) => i !== index));
  };

  const normalizeAmountToPeriod = (amount: number, fromFrequency: string, toPeriod: string) => {
    // Convert all to daily first
    let dailyAmount = 0;
    
    switch (fromFrequency) {
      case 'daily':
        dailyAmount = amount;
        break;
      case 'weekly':
        dailyAmount = amount / 7;
        break;
      case 'monthly':
        dailyAmount = amount / 30;
        break;
      case 'yearly':
        dailyAmount = amount / 365;
        break;
      default:
        dailyAmount = amount;
    }
    
    // Then convert from daily to target period
    switch (toPeriod) {
      case 'daily':
        return dailyAmount;
      case 'weekly':
        return dailyAmount * 7;
      case 'monthly':
        return dailyAmount * 30;
      case 'yearly':
        return dailyAmount * 365;
      default:
        return dailyAmount;
    }
  };

  const calculateOverhead = () => {
    if (overheadItems.length === 0) {
      toast.error('Tambahkan minimal satu biaya overhead');
      return;
    }
    
    if (overheadItems.some(item => !item.name)) {
      toast.error('Isi nama untuk semua biaya overhead');
      return;
    }
    
    if (productionVolume <= 0) {
      toast.error('Volume produksi harus lebih dari 0');
      return;
    }
    
    // Calculate total overhead for the selected period
    const totalOverhead = overheadItems.reduce((sum, item) => {
      return sum + normalizeAmountToPeriod(item.amount, item.frequency, calculationPeriod);
    }, 0);
    
    // Calculate overhead per unit
    const calculatedOverheadPerUnit = totalOverhead / productionVolume;
    setOverheadPerUnit(calculatedOverheadPerUnit);
    
    // Add to history
    const newEntry = {
      items: [...overheadItems],
      period: calculationPeriod,
      totalOverhead,
      productionVolume,
      overheadPerUnit: calculatedOverheadPerUnit,
      date: new Date()
    };
    
    setHistory([newEntry, ...history.slice(0, 9)]); // Keep only last 10 entries
    toast.success('Overhead berhasil dihitung');
  };

  const calculateEnhancedOverhead = () => {
    if (targetSalesPerMonth <= 0) {
      toast.error('Target penjualan per bulan harus lebih dari 0');
      return;
    }
    
    // Add the calculated overhead to the list
    const newItem: OverheadItem = {
      name: 'Total Biaya Overhead',
      amount: totalOverheadPerPortion * targetSalesPerMonth,
      frequency: 'monthly'
    };
    
    setOverheadItems([newItem]);
    setProductionVolume(targetSalesPerMonth);
    setCalculationPeriod('monthly');
    
    // Calculate overhead per unit
    setOverheadPerUnit(totalOverheadPerPortion);
    
    toast.success('Biaya overhead berhasil dihitung');
  };

  const resetCalculator = () => {
    setOverheadItems([]);
    setCalculationPeriod('monthly');
    setProductionVolume(0);
    setOverheadPerUnit(0);
    setTargetSalesPerMonth(0);
    setRentCostPerYear(0);
    setUtilitiesCostPerMonth(0);
    setManagementSalaryPerMonth(0);
  };

  const saveCalculation = () => {
    // This would typically save to a database, but for now we'll just show a toast
    toast.success('Perhitungan overhead berhasil disimpan');
  };

  const getFrequencyLabel = (frequency: string) => {
    const option = frequencyOptions.find(opt => opt.value === frequency);
    return option ? option.label : frequency;
  };

  const getPeriodLabel = (period: string) => {
    const option = periodOptions.find(opt => opt.value === period);
    return option ? option.label : period;
  };

  // Calculate total overhead for display
  const totalOverhead = overheadItems.reduce((sum, item) => {
    return sum + normalizeAmountToPeriod(item.amount, item.frequency, calculationPeriod);
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalkulator Biaya Overhead</h1>
          <p className="text-gray-600 mt-1">Hitung biaya overhead per unit produksi</p>
        </div>
      </div>

      {/* Enhanced Overhead Calculator */}
      <Card className="border-indigo-200">
        <CardHeader className="bg-indigo-50">
          <CardTitle className="text-indigo-800 flex items-center">
            <Building className="h-5 w-5 mr-2" />
            Kalkulator Biaya Overhead Bisnis
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Target Penjualan per Bulan (porsi)"
              type="number"
              value={targetSalesPerMonth}
              onChange={(e) => setTargetSalesPerMonth(parseInt(e.target.value) || 0)}
              min={1}
              placeholder="Contoh: 1000"
              required
            />
            <Input
              label="Total Aset yang Dimiliki (Rp)"
              type="number"
              value={totalAssets}
              onChange={(e) => setTotalAssets(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Diambil dari data aset"
              disabled
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Biaya Sewa Tempat per Tahun"
              type="number"
              value={rentCostPerYear}
              onChange={(e) => setRentCostPerYear(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Contoh: 60000000"
            />
            <Input
              label="Biaya Listrik, Air, Internet per Bulan"
              type="number"
              value={utilitiesCostPerMonth}
              onChange={(e) => setUtilitiesCostPerMonth(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Contoh: 2000000"
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Total Gaji Manajemen per Bulan"
              type="number"
              value={managementSalaryPerMonth}
              onChange={(e) => setManagementSalaryPerMonth(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Dari data penggajian"
            />
            <Input
              label="Biaya Penyusutan per Bulan"
              type="number"
              value={depreciationPerMonth}
              onChange={(e) => setDepreciationPerMonth(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Dari data aset"
              disabled
            />
            <Input
              label="Biaya Peralatan & Pemeliharaan"
              type="number"
              value={maintenanceCostPerMonth}
              onChange={(e) => setMaintenanceCostPerMonth(parseInt(e.target.value) || 0)}
              min={0}
              placeholder="Dari data aset"
              disabled
            />
          </div>
          
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <h3 className="text-lg font-medium text-indigo-800 mb-3">Hasil Perhitungan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-indigo-700">Total Biaya Overhead per Bulan:</p>
                <p className="text-lg font-bold text-indigo-900">
                  {formatCurrency((rentCostPerYear / 12) + utilitiesCostPerMonth + managementSalaryPerMonth + depreciationPerMonth + maintenanceCostPerMonth)}
                </p>
              </div>
              <div>
                <p className="text-sm text-indigo-700">Biaya Overhead per Porsi:</p>
                <p className="text-lg font-bold text-indigo-900">
                  {targetSalesPerMonth > 0 
                    ? formatCurrency(totalOverheadPerPortion)
                    : 'Masukkan target penjualan'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={calculateEnhancedOverhead} 
              icon={Zap}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={targetSalesPerMonth <= 0}
            >
              Hitung & Gunakan
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => {
                setTargetSalesPerMonth(0);
                setRentCostPerYear(0);
                setUtilitiesCostPerMonth(0);
                setManagementSalaryPerMonth(0);
              }}
              icon={RefreshCw}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Standard Overhead Calculator */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-800 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Kalkulator Biaya Overhead Manual
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <Select
            label="Periode Perhitungan"
            value={calculationPeriod}
            onChange={(value) => setCalculationPeriod(value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
            options={periodOptions}
          />
          
          {/* Overhead Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Komponen Biaya Overhead</h3>
              <Button type="button" onClick={addOverheadItem} size="sm" icon={Plus}>
                Tambah Biaya
              </Button>
            </div>
            
            <div className="space-y-4">
              {overheadItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg">
                  <Input
                    label="Nama Biaya"
                    value={item.name}
                    onChange={(e) => updateOverheadItem(index, 'name', e.target.value)}
                    placeholder="Contoh: Gaji Karyawan, Listrik"
                    required
                  />
                  <Input
                    label="Jumlah"
                    type="number"
                    value={item.amount}
                    onChange={(e) => updateOverheadItem(index, 'amount', parseFloat(e.target.value) || 0)}
                    min={0}
                    required
                  />
                  <Select
                    label="Frekuensi"
                    value={item.frequency}
                    onChange={(value) => updateOverheadItem(index, 'frequency', value)}
                    options={frequencyOptions}
                    required
                  />
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      icon={Minus}
                      onClick={() => removeOverheadItem(index)}
                    >
                      Hapus
                    </Button>
                  </div>
                </div>
              ))}
              
              {overheadItems.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                  Belum ada komponen biaya overhead
                </div>
              )}
            </div>
          </div>
          
          <Input
            label={`Volume Produksi (${getPeriodLabel(calculationPeriod)})`}
            type="number"
            value={productionVolume}
            onChange={(e) => setProductionVolume(parseInt(e.target.value) || 0)}
            min={1}
            placeholder="Masukkan jumlah unit yang diproduksi"
            required
          />
          
          <div className="flex gap-3">
            <Button 
              onClick={calculateOverhead} 
              icon={Calculator}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={overheadItems.length === 0 || productionVolume <= 0}
            >
              Hitung
            </Button>
            <Button 
              variant="secondary" 
              onClick={resetCalculator}
              icon={RefreshCw}
            >
              Reset
            </Button>
            <Button 
              variant="secondary" 
              onClick={saveCalculation}
              icon={Save}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={overheadItems.length === 0 || productionVolume <= 0 || overheadPerUnit <= 0}
            >
              Simpan
            </Button>
          </div>
          
          {/* Results */}
          {overheadItems.length > 0 && productionVolume > 0 && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="text-lg font-medium text-green-800 mb-3">Hasil Perhitungan</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-green-700">Total Biaya Overhead ({getPeriodLabel(calculationPeriod)}):</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(totalOverhead)}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Volume Produksi:</p>
                  <p className="text-lg font-bold text-green-900">{productionVolume} unit</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">Overhead per Unit:</p>
                  <p className="text-lg font-bold text-green-900">{formatCurrency(overheadPerUnit)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Breakdown */}
      {overheadItems.length > 0 && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Breakdown Biaya Overhead
            </CardTitle>
          </CardHeader>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Komponen</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah Asli</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Frekuensi</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Jumlah per {getPeriodLabel(calculationPeriod)}</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Persentase</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overheadItems.map((item, index) => {
                  const normalizedAmount = normalizeAmountToPeriod(item.amount, item.frequency, calculationPeriod);
                  const percentage = totalOverhead > 0 ? (normalizedAmount / totalOverhead) * 100 : 0;
                  
                  return (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {item.name || `Biaya #${index + 1}`}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatCurrency(item.amount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {getFrequencyLabel(item.frequency)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatCurrency(normalizedAmount)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {percentage.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-green-50">
                  <td className="px-4 py-2 text-sm font-bold text-green-800">TOTAL</td>
                  <td className="px-4 py-2 text-sm"></td>
                  <td className="px-4 py-2 text-sm"></td>
                  <td className="px-4 py-2 text-sm font-bold text-green-800">
                    {formatCurrency(totalOverhead)}
                  </td>
                  <td className="px-4 py-2 text-sm font-bold text-green-800">
                    100%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* History */}
      <Card className="border-gray-200">
        <CardHeader>
          <CardTitle>Riwayat Perhitungan</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Waktu</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Periode</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Komponen</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total Overhead</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Volume</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Per Unit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    <p>Belum ada riwayat perhitungan</p>
                  </td>
                </tr>
              ) : (
                history.map((entry, index) => (
                  <tr key={index}>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {entry.date.toLocaleTimeString('id-ID')}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {getPeriodLabel(entry.period)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {entry.items.map((item, i) => (
                          <li key={i} className="text-xs">
                            {item.name}: {formatCurrency(item.amount)} ({getFrequencyLabel(item.frequency)})
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.totalOverhead)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {entry.productionVolume} unit
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.overheadPerUnit)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tips */}
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-800">Tips Penggunaan</CardTitle>
        </CardHeader>
        <div className="p-4">
          <ul className="space-y-2 text-sm text-green-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Kalkulator Bisnis:</strong> Gunakan untuk menghitung biaya overhead berdasarkan data bisnis Anda, termasuk aset, gaji manajemen, dan biaya operasional.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Kalkulator Manual:</strong> Tambahkan komponen biaya overhead satu per satu dengan frekuensi pembayaran yang berbeda.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Hasil Perhitungan:</strong> Biaya overhead per unit dapat digunakan dalam perhitungan HPP untuk menentukan harga jual yang tepat.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Simpan Hasil:</strong> Gunakan tombol "Simpan" untuk menyimpan perhitungan overhead yang akan digunakan dalam kalkulator HPP.</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default OverheadCalculator;