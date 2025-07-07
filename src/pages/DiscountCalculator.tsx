import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useApp } from '../contexts/AppContext';
import { Percent, ArrowRight, Calculator, RefreshCw, Save, Check, AlertTriangle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, customRound } from '../lib/utils';

const DiscountCalculator: React.FC = () => {
  const { products } = useApp();
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);
  const [channelFeeEnabled, setChannelFeeEnabled] = useState<boolean>(false);
  const [channelFeeType, setChannelFeeType] = useState<'percentage' | 'nominal'>('percentage');
  const [channelFeeValue, setChannelFeeValue] = useState<number>(15);
  const [roundingEnabled, setRoundingEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<Array<{
    product_id: number;
    product_name: string;
    original_price: number;
    hpp: number;
    discount: {
      type: 'percentage' | 'nominal';
      value: number;
    };
    channel_fee: {
      enabled: boolean;
      type: 'percentage' | 'nominal';
      value: number;
    };
    final_price: number;
    profit_percentage: number;
    profit_amount: number;
    date: Date;
  }>>([]);

  // Get product options with HPP and profit info
  const productOptions = products
    .filter((product: any) => product.product_type === 'single')
    .map((product: any) => {
      const hpp = product.hpp_price || (product.base_price * 0.6); // Fallback if HPP not set
      const profit = product.base_price - hpp;
      const profitPercentage = (profit / hpp) * 100;
      
      return {
        value: product.id,
        label: `${product.name} - ${product.packaging} ${product.size} (${formatCurrency(product.base_price)}) - Profit: ${profitPercentage.toFixed(0)}%`
      };
    });

  // Get recommended products for discount (high profit margin products)
  const recommendedProducts = products
    .filter((product: any) => {
      const hpp = product.hpp_price || (product.base_price * 0.6);
      const profit = product.base_price - hpp;
      const profitPercentage = (profit / hpp) * 100;
      return product.product_type === 'single' && profitPercentage >= 80; // Only recommend products with high profit margin
    })
    .sort((a: any, b: any) => {
      const hppA = a.hpp_price || (a.base_price * 0.6);
      const profitA = a.base_price - hppA;
      const profitPercentageA = (profitA / hppA) * 100;
      
      const hppB = b.hpp_price || (b.base_price * 0.6);
      const profitB = b.base_price - hppB;
      const profitPercentageB = (profitB / hppB) * 100;
      
      return profitPercentageB - profitPercentageA; // Sort by profit percentage (highest first)
    })
    .slice(0, 5); // Get top 5

  const selectedProduct = selectedProductId ? products.find((p: any) => p.id === selectedProductId) : null;
  const productHpp = selectedProduct ? (selectedProduct.hpp_price || (selectedProduct.base_price * 0.6)) : 0;
  const originalPrice = selectedProduct ? selectedProduct.base_price : 0;

  // Calculate discount amount
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = originalPrice * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }

  // Calculate price after discount
  let priceAfterDiscount = originalPrice - discountAmount;

  // Calculate channel fee
  let channelFeeAmount = 0;
  if (channelFeeEnabled) {
    if (channelFeeType === 'percentage') {
      channelFeeAmount = priceAfterDiscount * (channelFeeValue / 100);
    } else {
      channelFeeAmount = channelFeeValue;
    }
  }

  // Calculate final price
  let finalPrice = priceAfterDiscount - channelFeeAmount;

  // Apply rounding if enabled
  if (roundingEnabled) {
    finalPrice = customRound(finalPrice);
  }

  // Calculate profit
  const profitAmount = finalPrice - productHpp;
  const profitPercentage = productHpp > 0 ? (profitAmount / productHpp) * 100 : 0;

  // Determine profit status
  const getProfitStatus = () => {
    if (profitPercentage >= 100) {
      return { status: 'safe', color: 'text-green-600', message: 'Safe - Profit di atas 100%' };
    } else if (profitPercentage >= 50) {
      return { status: 'good', color: 'text-blue-600', message: 'Good - Profit di atas 50%' };
    } else if (profitPercentage > 0) {
      return { status: 'review', color: 'text-yellow-600', message: 'Perlu ditinjau ulang - Profit di bawah 50%' };
    } else {
      return { status: 'loss', color: 'text-red-600', message: 'Rugi - Harga jual di bawah HPP' };
    }
  };

  const profitStatus = getProfitStatus();

  const calculateDiscount = () => {
    if (!selectedProductId) {
      toast.error('Pilih produk terlebih dahulu');
      return;
    }
    
    // Add to history
    const newEntry = {
      product_id: selectedProductId,
      product_name: selectedProduct?.name || '',
      original_price: originalPrice,
      hpp: productHpp,
      discount: {
        type: discountType,
        value: discountValue
      },
      channel_fee: {
        enabled: channelFeeEnabled,
        type: channelFeeType,
        value: channelFeeValue
      },
      final_price: finalPrice,
      profit_percentage: profitPercentage,
      profit_amount: profitAmount,
      date: new Date()
    };
    
    setHistory([newEntry, ...history.slice(0, 9)]); // Keep only last 10 entries
    toast.success('Diskon berhasil dihitung');
  };

  const resetCalculator = () => {
    setSelectedProductId(null);
    setDiscountType('percentage');
    setDiscountValue(10);
    setChannelFeeEnabled(false);
    setChannelFeeType('percentage');
    setChannelFeeValue(15);
  };

  const saveCalculation = () => {
    // This would typically save to a database, but for now we'll just show a toast
    toast.success('Perhitungan diskon berhasil disimpan');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalkulator Diskon</h1>
          <p className="text-gray-600 mt-1">Hitung diskon dan profit margin dengan mudah</p>
        </div>
      </div>

      {/* Recommended Products */}
      <Card className="border-green-200">
        <CardHeader className="bg-green-50">
          <CardTitle className="text-green-800 flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Rekomendasi Menu untuk Diskon
          </CardTitle>
        </CardHeader>
        <div className="p-4">
          <p className="text-sm text-gray-600 mb-4">
            Menu berikut memiliki margin profit tinggi dan cocok untuk program diskon:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendedProducts.length === 0 ? (
              <p className="text-sm text-gray-500">Tidak ada rekomendasi menu saat ini</p>
            ) : (
              recommendedProducts.map((product: any) => {
                const hpp = product.hpp_price || (product.base_price * 0.6);
                const profit = product.base_price - hpp;
                const profitPercentage = (profit / hpp) * 100;
                
                return (
                  <div 
                    key={product.id} 
                    className="p-3 bg-white rounded-lg border border-green-200 hover:shadow-md cursor-pointer"
                    onClick={() => setSelectedProductId(product.id)}
                  >
                    <div className="flex items-center mb-2">
                      <Package className="h-4 w-4 text-green-500 mr-2" />
                      <p className="font-medium text-green-800">{product.name}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500">Harga Jual:</p>
                        <p className="font-medium">{formatCurrency(product.base_price)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">HPP:</p>
                        <p className="font-medium">{formatCurrency(hpp)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Profit:</p>
                        <p className="font-medium text-green-600">{formatCurrency(profit)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Margin:</p>
                        <p className="font-medium text-green-600">{profitPercentage.toFixed(0)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      <Card className="border-purple-200">
        <CardHeader className="bg-purple-50">
          <CardTitle className="text-purple-800 flex items-center">
            <Percent className="h-5 w-5 mr-2" />
            Kalkulator Diskon
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <SearchableSelect
            label="Pilih Menu"
            value={selectedProductId || ''}
            onChange={(value) => setSelectedProductId(parseInt(value.toString()))}
            options={productOptions}
            placeholder="Pilih menu untuk dihitung diskonnya"
            required
          />
          
          {selectedProduct && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-medium text-purple-800 mb-3">Informasi Menu</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-purple-700">Nama Menu:</p>
                  <p className="text-base font-medium text-purple-900">{selectedProduct.name}</p>
                  <p className="text-xs text-purple-600">{selectedProduct.packaging} {selectedProduct.size}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-700">HPP:</p>
                  <p className="text-base font-medium text-purple-900">{formatCurrency(productHpp)}</p>
                </div>
                <div>
                  <p className="text-sm text-purple-700">Harga Jual:</p>
                  <p className="text-base font-medium text-purple-900">{formatCurrency(originalPrice)}</p>
                  <p className="text-xs text-purple-600">
                    Profit: {formatCurrency(originalPrice - productHpp)} ({((originalPrice - productHpp) / productHpp * 100).toFixed(0)}%)
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Discount Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diskon
              </label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select
                    value={discountType}
                    onChange={(value) => setDiscountType(value as 'percentage' | 'nominal')}
                    options={[
                      { value: 'percentage', label: 'Persentase (%)' },
                      { value: 'nominal', label: 'Nominal (Rp)' }
                    ]}
                  />
                </div>
                <div className="w-2/3">
                  <Input
                    type="number"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                    min={0}
                    placeholder={discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Diskon Ditanggung Channel (Opsional)
              </label>
              <div className="flex gap-2">
                <div className="w-1/3">
                  <Select
                    value={channelFeeType}
                    onChange={(value) => setChannelFeeType(value as 'percentage' | 'nominal')}
                    options={[
                      { value: 'percentage', label: 'Persentase (%)' },
                      { value: 'nominal', label: 'Nominal (Rp)' }
                    ]}
                    disabled={!channelFeeEnabled}
                  />
                </div>
                <div className="w-2/3">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={channelFeeValue}
                      onChange={(e) => setChannelFeeValue(parseFloat(e.target.value) || 0)}
                      min={0}
                      placeholder={channelFeeType === 'percentage' ? 'Contoh: 15' : 'Contoh: 5000'}
                      disabled={!channelFeeEnabled}
                      className="flex-1"
                    />
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="channel_fee_enabled"
                        checked={channelFeeEnabled}
                        onChange={(e) => setChannelFeeEnabled(e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor="channel_fee_enabled" className="text-sm text-gray-700">
                        Aktifkan
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="rounding_enabled"
              checked={roundingEnabled}
              onChange={(e) => setRoundingEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="rounding_enabled" className="text-sm text-gray-700">
              Pembulatan harga
            </label>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={calculateDiscount} 
              icon={Calculator}
              className="bg-purple-600 hover:bg-purple-700 text-white"
              disabled={!selectedProductId}
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
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!selectedProductId}
            >
              Simpan
            </Button>
          </div>
          
          {/* Results */}
          {selectedProductId && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h3 className="text-lg font-medium text-purple-800 mb-3">Hasil Perhitungan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-700">Harga Awal:</span>
                    <span className="font-medium">{formatCurrency(originalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">
                      {discountType === 'percentage' ? `Diskon (${discountValue}%):` : 'Diskon:'}
                    </span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                  {channelFeeEnabled && (
                    <div className="flex justify-between">
                      <span className="text-purple-700">
                        {channelFeeType === 'percentage' ? `Diskon Channel (${channelFeeValue}%):` : 'Diskon Channel:'}
                      </span>
                      <span className="font-medium text-red-600">-{formatCurrency(channelFeeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-purple-700 font-medium">Harga Jual Setelah Diskon:</span>
                    <span className="font-bold text-purple-900">{formatCurrency(finalPrice)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-purple-700">HPP:</span>
                    <span className="font-medium">{formatCurrency(productHpp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Profit Bersih:</span>
                    <span className={`font-medium ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-purple-700">Profit (%):</span>
                    <span className={`font-medium ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-purple-700 font-medium">Status:</span>
                    <span className={`font-bold ${profitStatus.color}`}>
                      {profitStatus.status === 'safe' && <Check className="inline h-4 w-4 mr-1" />}
                      {profitStatus.status === 'loss' && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                      {profitStatus.message}
                    </span>
                  </div>
                </div>
              </div>
              
              {roundingEnabled && (
                <div className="mt-3 p-3 bg-purple-100 rounded-lg">
                  <p className="text-xs text-purple-800">
                    <strong>Pembulatan:</strong> Harga setelah diskon telah dibulatkan sesuai aturan: angka yang berakhir dengan 500 tetap, 001-499 dibulatkan ke 500, 501-999 dibulatkan ke 1000.
                    {profitPercentage >= 50 ? (
                      <span className="ml-2 text-green-700">✓ Pembulatan disarankan</span>
                    ) : (
                      <span className="ml-2 text-yellow-700">⚠️ Pertimbangkan untuk tidak membulatkan</span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Menu</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Awal</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">HPP</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Diskon</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Akhir</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
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
                      {entry.product_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.original_price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.hpp)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {entry.discount.type === 'percentage' 
                        ? `${entry.discount.value}%` 
                        : formatCurrency(entry.discount.value)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.final_price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <span className={entry.profit_percentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {entry.profit_percentage.toFixed(2)}% ({formatCurrency(entry.profit_amount)})
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Tips */}
      <Card className="border-purple-200 bg-purple-50">
        <CardHeader>
          <CardTitle className="text-purple-800">Tips Penggunaan</CardTitle>
        </CardHeader>
        <div className="p-4">
          <ul className="space-y-2 text-sm text-purple-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Pilih Menu:</strong> Gunakan rekomendasi menu atau pilih menu lain yang ingin didiskon.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Tentukan Diskon:</strong> Pilih antara persentase atau nominal untuk diskon.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Diskon Channel:</strong> Aktifkan jika diskon ditanggung oleh platform online (misal: promo Gojek/Grab).</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Perhatikan Status:</strong> Pastikan profit tetap dalam batas aman (di atas 50%).</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Pembulatan:</strong> Aktifkan opsi pembulatan untuk membulatkan harga akhir sesuai aturan.</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default DiscountCalculator;