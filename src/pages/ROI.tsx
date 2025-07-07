import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { useApp } from '../contexts/AppContext';
import { TrendingUp, DollarSign, Calculator, Target, BarChart3, PieChart, Calendar, RefreshCw, Zap } from 'lucide-react';

const ROI: React.FC = () => {
  const { storeDeliveries, individualDeliveries, returns, rawMaterials, products } = useApp();
  const [roiData, setRoiData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [calculationMode, setCalculationMode] = useState<'manual' | 'auto'>('manual');
  const [autoDataPeriod, setAutoDataPeriod] = useState('last_month');
  
  // ROI Input Parameters
  const [roiInputs, setRoiInputs] = useState({
    initial_investment: 0,
    monthly_revenue_estimate: 0,
    yearly_revenue_estimate: 0,
    hpp_sold_products: 0,
    operational_costs: 0,
    tax_percentage: 10,
    monthly_net_profit_estimate: 0,
    payback_period_days: 0,
    target_roi_years: 2,
    minimum_monthly_profit: 10000000
  });

  const calculationModeOptions = [
    { value: 'manual', label: 'Input Manual' },
    { value: 'auto', label: 'Hitung Otomatis dari Data' }
  ];

  const periodOptions = [
    { value: 'last_month', label: 'Bulan Lalu' },
    { value: 'last_3_months', label: '3 Bulan Terakhir' },
    { value: 'last_6_months', label: '6 Bulan Terakhir' },
    { value: 'last_year', label: 'Tahun Lalu' }
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  const calculateAutoData = () => {
    const now = new Date();
    let startDate: Date;
    let monthsCount = 1;

    switch (autoDataPeriod) {
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        monthsCount = 1;
        break;
      case 'last_3_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        monthsCount = 3;
        break;
      case 'last_6_months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        monthsCount = 6;
        break;
      case 'last_year':
        startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
        monthsCount = 12;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        monthsCount = 1;
    }

    // Calculate revenue from completed deliveries
    const completedStoreDeliveries = storeDeliveries.filter((delivery: any) => {
      const deliveryDate = new Date(delivery.delivery_date);
      return delivery.status === 'completed' && deliveryDate >= startDate;
    });

    const completedIndividualDeliveries = individualDeliveries.filter((delivery: any) => {
      const deliveryDate = new Date(delivery.purchase_date);
      return delivery.status === 'completed' && deliveryDate >= startDate;
    });

    // Calculate total revenue
    const storeRevenue = completedStoreDeliveries.reduce((sum: number, delivery: any) => sum + delivery.total_amount, 0);
    const individualRevenue = completedIndividualDeliveries.reduce((sum: number, delivery: any) => sum + delivery.total_amount, 0);
    const totalRevenue = storeRevenue + individualRevenue;

    // Calculate returns
    const completedReturns = returns.filter((returnItem: any) => {
      const returnDate = new Date(returnItem.return_date);
      return returnItem.status === 'completed' && returnDate >= startDate;
    });
    const totalReturns = completedReturns.reduce((sum: number, returnItem: any) => sum + returnItem.total_amount, 0);

    // Net revenue after returns
    const netRevenue = totalRevenue - totalReturns;

    // Calculate average monthly revenue
    const avgMonthlyRevenue = netRevenue / monthsCount;

    // Calculate HPP from products sold
    let totalHPP = 0;
    [...completedStoreDeliveries, ...completedIndividualDeliveries].forEach((delivery: any) => {
      if (delivery.items) {
        delivery.items.forEach((item: any) => {
          const product = products.find((p: any) => p.id === item.product_id);
          if (product && product.hpp_price) {
            totalHPP += product.hpp_price * item.quantity;
          } else if (product) {
            // Fallback to 60% of selling price if no HPP
            totalHPP += (product.base_price * 0.6) * item.quantity;
          }
        });
      }
    });

    const avgMonthlyHPP = totalHPP / monthsCount;

    // Calculate raw material costs
    const totalRawMaterialValue = rawMaterials?.reduce((sum: number, material: any) => {
      return sum + (material.stock_quantity * material.unit_cost);
    }, 0) || 0;

    // Estimate monthly operational costs (10% of revenue as default)
    const estimatedOperationalCosts = avgMonthlyRevenue * 0.1;

    return {
      monthly_revenue_estimate: Math.round(avgMonthlyRevenue),
      yearly_revenue_estimate: Math.round(avgMonthlyRevenue * 12),
      hpp_sold_products: Math.round(avgMonthlyHPP),
      operational_costs: Math.round(estimatedOperationalCosts),
      raw_material_value: totalRawMaterialValue,
      period_summary: {
        total_revenue: totalRevenue,
        total_returns: totalReturns,
        net_revenue: netRevenue,
        months_count: monthsCount,
        period_label: periodOptions.find(p => p.value === autoDataPeriod)?.label
      }
    };
  };

  const handleAutoCalculate = () => {
    const autoData = calculateAutoData();
    setRoiInputs({
      ...roiInputs,
      monthly_revenue_estimate: autoData.monthly_revenue_estimate,
      yearly_revenue_estimate: autoData.yearly_revenue_estimate,
      hpp_sold_products: autoData.hpp_sold_products,
      operational_costs: autoData.operational_costs
    });
  };

  const calculateROI = () => {
    setLoading(true);
    
    try {
      // Calculate based on input parameters
      const monthlyProfit = roiInputs.monthly_revenue_estimate - roiInputs.hpp_sold_products - roiInputs.operational_costs;
      const yearlyProfit = monthlyProfit * 12;
      const taxAmount = (yearlyProfit * roiInputs.tax_percentage) / 100;
      const netYearlyProfit = yearlyProfit - taxAmount;
      const roiPercentage = roiInputs.initial_investment > 0 ? (netYearlyProfit / roiInputs.initial_investment) * 100 : 0;
      const paybackPeriodMonths = roiInputs.initial_investment > 0 ? roiInputs.initial_investment / monthlyProfit : 0;
      const paybackPeriodDays = paybackPeriodMonths * 30;
      
      const calculatedData = {
        initial_investment: roiInputs.initial_investment,
        monthly_revenue_estimate: roiInputs.monthly_revenue_estimate,
        yearly_revenue_estimate: roiInputs.yearly_revenue_estimate,
        hpp_sold_products: roiInputs.hpp_sold_products,
        operational_costs: roiInputs.operational_costs,
        tax_percentage: roiInputs.tax_percentage,
        tax_amount: taxAmount,
        monthly_net_profit: monthlyProfit,
        yearly_net_profit: netYearlyProfit,
        roi_percentage: roiPercentage,
        payback_period_days: paybackPeriodDays,
        payback_period_months: paybackPeriodMonths,
        target_roi_years: roiInputs.target_roi_years,
        minimum_monthly_profit: roiInputs.minimum_monthly_profit,
        profit_margin: roiInputs.monthly_revenue_estimate > 0 ? (monthlyProfit / roiInputs.monthly_revenue_estimate) * 100 : 0,
        calculation_mode: calculationMode,
        auto_data: calculationMode === 'auto' ? calculateAutoData() : null
      };
      
      setRoiData(calculatedData);
    } catch (error) {
      console.error('Error calculating ROI:', error);
    } finally {
      setLoading(false);
    }
  };

  const getROIStatus = (roi: number, targetYears: number) => {
    const targetROI = (100 / targetYears); // Target ROI per year
    if (roi >= targetROI) {
      return { color: 'text-emerald-600', bg: 'bg-emerald-50', status: 'Excellent', icon: '🎯' };
    } else if (roi >= targetROI * 0.7) {
      return { color: 'text-blue-600', bg: 'bg-blue-50', status: 'Good', icon: '👍' };
    } else if (roi >= 0) {
      return { color: 'text-yellow-600', bg: 'bg-yellow-50', status: 'Fair', icon: '⚠️' };
    } else {
      return { color: 'text-red-600', bg: 'bg-red-50', status: 'Poor', icon: '📉' };
    }
  };

  const roiStatus = roiData ? getROIStatus(roiData.roi_percentage, roiData.target_roi_years) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analisis ROI (Return on Investment)</h1>
          <p className="text-gray-600 mt-1">Analisis profitabilitas dan proyeksi investasi bisnis</p>
        </div>
        <Button
          onClick={calculateROI}
          disabled={loading}
          icon={Calculator}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {loading ? 'Menghitung...' : 'Hitung ROI'}
        </Button>
      </div>

      {/* Calculation Mode Selection */}
      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-800">Mode Perhitungan</CardTitle>
        </CardHeader>
        <div className="space-y-4">
          <Select
            label="Pilih Mode Perhitungan"
            value={calculationMode}
            onChange={(value) => setCalculationMode(value as 'manual' | 'auto')}
            options={calculationModeOptions}
          />
          
          {calculationMode === 'auto' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Periode Data"
                value={autoDataPeriod}
                onChange={(value) => setAutoDataPeriod(value.toString())}
                options={periodOptions}
              />
              <div className="flex items-end">
                <Button
                  onClick={handleAutoCalculate}
                  icon={Zap}
                  variant="secondary"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Hitung Otomatis dari Data
                </Button>
              </div>
            </div>
          )}
          
          {calculationMode === 'auto' && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-blue-900 mb-2">Perhitungan Otomatis</h4>
              <p className="text-sm text-blue-800 mb-3">
                Data akan dihitung berdasarkan transaksi aktual dari periode yang dipilih:
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Pendapatan: Dari pengiriman toko & perorangan yang selesai</li>
                <li>• HPP: Dari harga pokok produk yang terjual</li>
                <li>• Retur: Dikurangi dari total pendapatan</li>
                <li>• Biaya Operasional: Estimasi 10% dari pendapatan</li>
              </ul>
            </div>
          )}
        </div>
      </Card>

      {/* Input Parameters */}
      <Card className="border-emerald-200">
        <CardHeader className="bg-emerald-50">
          <CardTitle className="text-emerald-800">Parameter Investasi & Proyeksi</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Input
            label="Investasi Awal"
            type="number"
            value={roiInputs.initial_investment}
            onChange={(e) => setRoiInputs({ ...roiInputs, initial_investment: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 100000000"
          />
          <Input
            label={`Estimasi Pendapatan per Bulan ${calculationMode === 'auto' ? '(Otomatis)' : ''}`}
            type="number"
            value={roiInputs.monthly_revenue_estimate}
            onChange={(e) => setRoiInputs({ ...roiInputs, monthly_revenue_estimate: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 50000000"
            disabled={calculationMode === 'auto'}
          />
          <Input
            label={`Estimasi Pendapatan per Tahun ${calculationMode === 'auto' ? '(Otomatis)' : ''}`}
            type="number"
            value={roiInputs.yearly_revenue_estimate}
            onChange={(e) => setRoiInputs({ ...roiInputs, yearly_revenue_estimate: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 600000000"
            disabled={calculationMode === 'auto'}
          />
          <Input
            label={`HPP Produk Terjual (per bulan) ${calculationMode === 'auto' ? '(Otomatis)' : ''}`}
            type="number"
            value={roiInputs.hpp_sold_products}
            onChange={(e) => setRoiInputs({ ...roiInputs, hpp_sold_products: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 20000000"
            disabled={calculationMode === 'auto'}
          />
          <Input
            label={`Biaya Operasional (per bulan) ${calculationMode === 'auto' ? '(Otomatis)' : ''}`}
            type="number"
            value={roiInputs.operational_costs}
            onChange={(e) => setRoiInputs({ ...roiInputs, operational_costs: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 15000000"
            disabled={calculationMode === 'auto'}
          />
          <Input
            label="Pajak (%)"
            type="number"
            value={roiInputs.tax_percentage}
            onChange={(e) => setRoiInputs({ ...roiInputs, tax_percentage: parseFloat(e.target.value) || 0 })}
            min={0}
            max={100}
            step={0.1}
            placeholder="Contoh: 10"
          />
          <Input
            label="Target ROI (tahun)"
            type="number"
            value={roiInputs.target_roi_years}
            onChange={(e) => setRoiInputs({ ...roiInputs, target_roi_years: parseFloat(e.target.value) || 0 })}
            min={0.5}
            max={10}
            step={0.5}
            placeholder="Contoh: 2"
          />
          <Input
            label="Minimal Profit Bersih per Bulan"
            type="number"
            value={roiInputs.minimum_monthly_profit}
            onChange={(e) => setRoiInputs({ ...roiInputs, minimum_monthly_profit: parseFloat(e.target.value) || 0 })}
            min={0}
            placeholder="Contoh: 10000000"
          />
        </div>
      </Card>

      {/* Auto Data Summary */}
      {calculationMode === 'auto' && roiData?.auto_data && (
        <Card className="border-indigo-200">
          <CardHeader className="bg-indigo-50">
            <CardTitle className="text-indigo-800">Ringkasan Data Otomatis</CardTitle>
          </CardHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-indigo-50 rounded-lg">
              <p className="text-sm text-indigo-600">Periode</p>
              <p className="text-lg font-bold text-indigo-800">{roiData.auto_data.period_summary.period_label}</p>
              <p className="text-xs text-indigo-600">({roiData.auto_data.period_summary.months_count} bulan)</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-green-600">Total Pendapatan</p>
              <p className="text-lg font-bold text-green-800">{formatCurrency(roiData.auto_data.period_summary.total_revenue)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-600">Total Retur</p>
              <p className="text-lg font-bold text-red-800">{formatCurrency(roiData.auto_data.period_summary.total_returns)}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Pendapatan Bersih</p>
              <p className="text-lg font-bold text-blue-800">{formatCurrency(roiData.auto_data.period_summary.net_revenue)}</p>
            </div>
          </div>
        </Card>
      )}

      {roiData && (
        <>
          {/* Main ROI Card */}
          <Card className={`border-2 ${roiStatus?.bg} border-emerald-300`}>
            <div className="text-center p-6">
              <div className="text-6xl mb-4">{roiStatus?.icon}</div>
              <h2 className="text-3xl font-bold mb-2">
                <span className={roiStatus?.color}>
                  {formatPercentage(roiData.roi_percentage)}
                </span>
              </h2>
              <p className="text-lg text-gray-600 mb-2">Return on Investment (per tahun)</p>
              <p className={`text-sm font-medium ${roiStatus?.color}`}>
                Status: {roiStatus?.status}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Target: {formatPercentage(100 / roiData.target_roi_years)} per tahun
              </p>
              {roiData.calculation_mode === 'auto' && (
                <p className="text-xs text-blue-600 mt-1">
                  📊 Dihitung dari data aktual
                </p>
              )}
            </div>
          </Card>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-blue-50 mr-4">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Investasi Awal</p>
                  <p className="text-xl font-bold text-blue-600">{formatCurrency(roiData.initial_investment)}</p>
                  <p className="text-xs text-gray-500">Modal yang diinvestasikan</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-green-50 mr-4">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Profit Bersih/Bulan</p>
                  <p className={`text-xl font-bold ${roiData.monthly_net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(roiData.monthly_net_profit)}
                  </p>
                  <p className="text-xs text-gray-500">Setelah dikurangi HPP & operasional</p>
                </div>
              </div>
            </Card>
            
            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-purple-50 mr-4">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Balik Modal</p>
                  <p className="text-xl font-bold text-purple-600">{Math.round(roiData.payback_period_days)} hari</p>
                  <p className="text-xs text-gray-500">{roiData.payback_period_months.toFixed(1)} bulan</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center">
                <div className="p-3 rounded-lg bg-orange-50 mr-4">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Margin Profit</p>
                  <p className="text-xl font-bold text-orange-600">{formatPercentage(roiData.profit_margin)}</p>
                  <p className="text-xs text-gray-500">Profit / pendapatan</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Detailed Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-blue-800 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Analisis Keuangan Bulanan
                </CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Pendapatan:</span>
                  <span className="font-medium text-green-600">{formatCurrency(roiData.monthly_revenue_estimate)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">HPP Produk:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(roiData.hpp_sold_products)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-600">Biaya Operasional:</span>
                  <span className="font-medium text-red-600">-{formatCurrency(roiData.operational_costs)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-blue-800">Profit Bersih/Bulan:</span>
                  <span className={`font-bold ${roiData.monthly_net_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(roiData.monthly_net_profit)}
                  </span>
                </div>
              </div>
            </Card>

            <Card className="border-emerald-200">
              <CardHeader className="bg-emerald-50">
                <CardTitle className="text-emerald-800 flex items-center">
                  <PieChart className="h-5 w-5 mr-2" />
                  Proyeksi Tahunan
                </CardTitle>
              </CardHeader>
              <div className="space-y-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Profit Kotor/Tahun:</span>
                    <span className="font-medium">{formatCurrency(roiData.monthly_net_profit * 12)}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Pajak ({roiData.tax_percentage}%):</span>
                    <span className="font-medium text-red-600">-{formatCurrency(roiData.tax_amount)}</span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-emerald-700">Profit Bersih/Tahun:</span>
                    <span className={`font-medium ${roiData.yearly_net_profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatCurrency(roiData.yearly_net_profit)}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-emerald-700">ROI per Tahun:</span>
                    <span className={`font-bold text-lg ${roiData.roi_percentage >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {formatPercentage(roiData.roi_percentage)}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Performance Indicators */}
          <Card className="border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-purple-800">Indikator Kinerja & Target</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Status Target</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Target ROI ({formatPercentage(100 / roiData.target_roi_years)}/tahun)</span>
                    <span className={`text-sm font-medium ${roiData.roi_percentage >= (100 / roiData.target_roi_years) ? 'text-emerald-600' : 'text-red-600'}`}>
                      {roiData.roi_percentage >= (100 / roiData.target_roi_years) ? '✅ Tercapai' : '❌ Belum Tercapai'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Target Profit Minimum/Bulan</span>
                    <span className={`text-sm font-medium ${roiData.monthly_net_profit >= roiData.minimum_monthly_profit ? 'text-emerald-600' : 'text-red-600'}`}>
                      {roiData.monthly_net_profit >= roiData.minimum_monthly_profit ? '✅ Tercapai' : '❌ Belum Tercapai'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <span className="text-sm">Balik Modal</span>
                    <span className={`text-sm font-medium ${roiData.payback_period_months <= 24 ? 'text-emerald-600' : 'text-yellow-600'}`}>
                      {roiData.payback_period_months <= 24 ? '✅ Cepat' : '⚠️ Lama'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-gray-900 mb-3">Rekomendasi Strategis</h4>
                <div className="space-y-2 text-sm">
                  {roiData.roi_percentage < (100 / roiData.target_roi_years) && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-yellow-800">
                        💡 ROI di bawah target. Tingkatkan pendapatan atau kurangi biaya operasional.
                      </p>
                    </div>
                  )}
                  {roiData.monthly_net_profit < roiData.minimum_monthly_profit && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800">
                        ⚠️ Profit bulanan di bawah target minimum. Evaluasi strategi pricing dan efisiensi operasional.
                      </p>
                    </div>
                  )}
                  {roiData.profit_margin < 20 && (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-orange-800">
                        📊 Margin profit rendah ({formatPercentage(roiData.profit_margin)}). Optimalisasi HPP dan harga jual diperlukan.
                      </p>
                    </div>
                  )}
                  {roiData.payback_period_months > 24 && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        ⏰ Periode balik modal cukup lama ({roiData.payback_period_months.toFixed(1)} bulan). Pertimbangkan strategi akselerasi.
                      </p>
                    </div>
                  )}
                  {roiData.roi_percentage >= (100 / roiData.target_roi_years) && roiData.monthly_net_profit >= roiData.minimum_monthly_profit && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                      <p className="text-emerald-800">
                        🎉 Proyeksi excellent! Target ROI dan profit tercapai. Pertimbangkan ekspansi atau diversifikasi.
                      </p>
                    </div>
                  )}
                  {roiData.calculation_mode === 'auto' && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-blue-800">
                        📊 Perhitungan berdasarkan data aktual memberikan proyeksi yang lebih akurat untuk pengambilan keputusan bisnis.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Assumptions */}
          <Card className="border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-800">Asumsi Perhitungan</CardTitle>
            </CardHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Parameter Input:</h5>
                <ul className="space-y-1 text-gray-600">
                  <li>• Investasi awal: {formatCurrency(roiData.initial_investment)}</li>
                  <li>• Estimasi pendapatan bulanan: {formatCurrency(roiData.monthly_revenue_estimate)}</li>
                  <li>• HPP produk terjual: {formatCurrency(roiData.hpp_sold_products)}</li>
                  <li>• Biaya operasional: {formatCurrency(roiData.operational_costs)}</li>
                  {roiData.calculation_mode === 'auto' && (
                    <li>• Mode: Perhitungan otomatis dari data aktual</li>
                  )}
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-gray-700 mb-2">Perhitungan:</h5>
                <ul className="space-y-1 text-gray-600">
                  <li>• Profit bulanan = Pendapatan - HPP - Operasional</li>
                  <li>• ROI = (Profit tahunan bersih / Investasi awal) × 100%</li>
                  <li>• Balik modal = Investasi awal / Profit bulanan</li>
                  <li>• Pajak dihitung dari profit kotor tahunan</li>
                </ul>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default ROI;