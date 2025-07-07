import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { useApp } from '../contexts/AppContext';
import { ShoppingBag, Plus, Minus, Calculator, RefreshCw, Save, Percent, ArrowRight, Check, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatCurrency, customRound } from '../lib/utils';

interface BundleItem {
  product_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  hpp: number;
  total_hpp: number;
  profit_percentage: number;
}

const BundlingCalculator: React.FC = () => {
  const { products } = useApp();
  const [bundleItems, setBundleItems] = useState<BundleItem[]>([]);
  const [bundleName, setBundleName] = useState<string>('');
  const [roundingEnabled, setRoundingEnabled] = useState<boolean>(true);
  const [history, setHistory] = useState<Array<{
    name: string;
    items: BundleItem[];
    totalOriginal: number;
    totalHpp: number;
    discount: {
      type: 'percentage' | 'nominal';
      value: number;
    };
    channelFee: {
      type: 'percentage' | 'nominal';
      value: number;
    };
    totalFinal: number;
    profitPercentage: number;
    profitAmount: number;
    date: Date;
  }>>([]);

  // Discount settings
  const [discountType, setDiscountType] = useState<'percentage' | 'nominal'>('percentage');
  const [discountValue, setDiscountValue] = useState<number>(10);

  // Channel fee settings
  const [channelFeeEnabled, setChannelFeeEnabled] = useState<boolean>(false);
  const [channelFeeType, setChannelFeeType] = useState<'percentage' | 'nominal'>('percentage');
  const [channelFeeValue, setChannelFeeValue] = useState<number>(15);

  const productOptions = products
    .filter((product: any) => product.product_type === 'single')
    .map((product: any) => ({
      value: product.id,
      label: `${product.name} - ${product.packaging} ${product.size} (${formatCurrency(product.base_price)})`
    }));

  const addBundleItem = () => {
    setBundleItems([...bundleItems, {
      product_id: 0,
      quantity: 1,
      unit_price: 0,
      total_price: 0,
      hpp: 0,
      total_hpp: 0,
      profit_percentage: 0
    }]);
  };

  const updateBundleItem = (index: number, field: string, value: any) => {
    const newItems = [...bundleItems];
    
    if (field === 'product_id') {
      const product = products.find((p: any) => p.id === parseInt(value));
      if (product) {
        const hpp = product.hpp_price || (product.base_price * 0.6); // Fallback if HPP not set
        const profitPercentage = ((product.base_price - hpp) / hpp) * 100;
        
        newItems[index] = {
          ...newItems[index],
          product_id: parseInt(value),
          unit_price: product.base_price,
          total_price: product.base_price * newItems[index].quantity,
          hpp: hpp,
          total_hpp: hpp * newItems[index].quantity,
          profit_percentage: profitPercentage
        };
      }
    } else if (field === 'quantity') {
      const quantity = parseInt(value) || 1;
      newItems[index] = {
        ...newItems[index],
        quantity: quantity,
        total_price: newItems[index].unit_price * quantity,
        total_hpp: newItems[index].hpp * quantity
      };
    }
    
    setBundleItems(newItems);
  };

  const removeBundleItem = (index: number) => {
    setBundleItems(bundleItems.filter((_, i) => i !== index));
  };

  const calculateBundle = () => {
    if (bundleItems.length === 0) {
      toast.error('Tambahkan minimal satu produk ke bundel');
      return;
    }
    
    if (bundleItems.some(item => item.product_id === 0)) {
      toast.error('Pilih produk untuk semua item');
      return;
    }
    
    if (!bundleName) {
      toast.error('Masukkan nama bundel');
      return;
    }
    
    // Calculate totals
    const totalOriginal = bundleItems.reduce((sum, item) => sum + item.total_price, 0);
    const totalHpp = bundleItems.reduce((sum, item) => sum + item.total_hpp, 0);
    
    // Calculate discount amount
    let discountAmount = 0;
    if (discountType === 'percentage') {
      discountAmount = totalOriginal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
    
    // Calculate price after discount
    let priceAfterDiscount = totalOriginal - discountAmount;
    
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
    const profitAmount = finalPrice - totalHpp;
    const profitPercentage = (profitAmount / totalHpp) * 100;
    
    // Add to history
    const newEntry = {
      name: bundleName,
      items: [...bundleItems],
      totalOriginal,
      totalHpp,
      discount: {
        type: discountType,
        value: discountValue
      },
      channelFee: {
        type: channelFeeType,
        value: channelFeeEnabled ? channelFeeValue : 0
      },
      totalFinal: finalPrice,
      profitPercentage,
      profitAmount,
      date: new Date()
    };
    
    setHistory([newEntry, ...history.slice(0, 9)]); // Keep only last 10 entries
    toast.success('Bundel berhasil dihitung');
  };

  const resetCalculator = () => {
    setBundleItems([]);
    setBundleName('');
    setDiscountType('percentage');
    setDiscountValue(10);
    setChannelFeeEnabled(false);
    setChannelFeeType('percentage');
    setChannelFeeValue(15);
  };

  const saveCalculation = () => {
    // This would typically save to a database, but for now we'll just show a toast
    toast.success('Bundel berhasil disimpan');
  };

  const getProductName = (productId: number) => {
    const product = products.find((p: any) => p.id === productId);
    return product ? `${product.name} - ${product.packaging} ${product.size}` : 'Produk tidak ditemukan';
  };

  // Calculate totals
  const totalOriginalPrice = bundleItems.reduce((sum, item) => sum + item.total_price, 0);
  const totalHpp = bundleItems.reduce((sum, item) => sum + item.total_hpp, 0);
  
  // Calculate discount amount
  let discountAmount = 0;
  if (discountType === 'percentage') {
    discountAmount = totalOriginalPrice * (discountValue / 100);
  } else {
    discountAmount = discountValue;
  }
  
  // Calculate price after discount
  let priceAfterDiscount = totalOriginalPrice - discountAmount;
  
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
  const profitAmount = finalPrice - totalHpp;
  const profitPercentage = totalHpp > 0 ? (profitAmount / totalHpp) * 100 : 0;

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kalkulator Bundling</h1>
          <p className="text-gray-600 mt-1">Hitung harga paket bundel dengan diskon</p>
        </div>
      </div>

      <Card className="border-blue-200">
        <CardHeader className="bg-blue-50">
          <CardTitle className="text-blue-800 flex items-center">
            <ShoppingBag className="h-5 w-5 mr-2" />
            Kalkulator Bundling
          </CardTitle>
        </CardHeader>
        <div className="space-y-6">
          <Input
            label="Nama Promo Bundling"
            value={bundleName}
            onChange={(e) => setBundleName(e.target.value)}
            placeholder="Masukkan nama promo bundling"
            required
          />
          
          {/* Bundle Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Daftar Menu dalam Bundel</h3>
              <Button type="button" onClick={addBundleItem} size="sm" icon={Plus}>
                Tambah Menu
              </Button>
            </div>
            
            <div className="space-y-4">
              {bundleItems.map((item, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border border-gray-200 rounded-lg">
                  <div className="md:col-span-2">
                    <SearchableSelect
                      label="Menu"
                      value={item.product_id}
                      onChange={(value) => updateBundleItem(index, 'product_id', value)}
                      options={productOptions}
                      placeholder="Pilih menu"
                      required
                    />
                  </div>
                  <Input
                    label="Jumlah"
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateBundleItem(index, 'quantity', e.target.value)}
                    min={1}
                    required
                  />
                  <Input
                    label="HPP"
                    type="number"
                    value={item.hpp}
                    disabled
                  />
                  <Input
                    label="Harga Jual"
                    type="number"
                    value={item.unit_price}
                    disabled
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      label="Profit (%)"
                      type="number"
                      value={item.profit_percentage.toFixed(0)}
                      disabled
                      className="flex-1"
                    />
                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="danger"
                        size="sm"
                        icon={Minus}
                        onClick={() => removeBundleItem(index)}
                      >
                        Hapus
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              
              {bundleItems.length === 0 && (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center text-gray-500">
                  Belum ada menu dalam bundel
                </div>
              )}
            </div>
          </div>
          
          {/* Totals */}
          {bundleItems.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-800 mb-3">Total Biaya</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-blue-700">Total HPP:</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(totalHpp)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Total Harga Jual:</p>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(totalOriginalPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-blue-700">Profit Normal:</p>
                  <p className="text-lg font-bold text-blue-900">
                    {formatCurrency(totalOriginalPrice - totalHpp)} ({((totalOriginalPrice - totalHpp) / totalHpp * 100).toFixed(0)}%)
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Discount Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Potongan Bundling
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
                    placeholder={discountType === 'percentage' ? 'Contoh: 10' : 'Contoh: 10000'}
                  />
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Biaya Channel Online (Opsional)
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
              onClick={calculateBundle} 
              icon={Calculator}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={bundleItems.length === 0}
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
              disabled={bundleItems.length === 0 || !bundleName}
            >
              Simpan
            </Button>
          </div>
          
          {/* Results */}
          {bundleItems.length > 0 && (
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-800 mb-3">Hasil Perhitungan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total Harga Normal:</span>
                    <span className="font-medium">{formatCurrency(totalOriginalPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">
                      {discountType === 'percentage' ? `Potongan (${discountValue}%):` : 'Potongan:'}
                    </span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                  {channelFeeEnabled && (
                    <div className="flex justify-between">
                      <span className="text-blue-700">
                        {channelFeeType === 'percentage' ? `Biaya Channel (${channelFeeValue}%):` : 'Biaya Channel:'}
                      </span>
                      <span className="font-medium text-red-600">-{formatCurrency(channelFeeAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-blue-700 font-medium">Harga Bundel Final:</span>
                    <span className="font-bold text-blue-900">{formatCurrency(finalPrice)}</span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Total HPP:</span>
                    <span className="font-medium">{formatCurrency(totalHpp)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Profit Bersih:</span>
                    <span className={`font-medium ${profitAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Profit (%):</span>
                    <span className={`font-medium ${profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPercentage.toFixed(2)}%
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-blue-700 font-medium">Status:</span>
                    <span className={`font-bold ${profitStatus.color}`}>
                      {profitStatus.status === 'safe' && <Check className="inline h-4 w-4 mr-1" />}
                      {profitStatus.status === 'loss' && <AlertTriangle className="inline h-4 w-4 mr-1" />}
                      {profitStatus.message}
                    </span>
                  </div>
                </div>
              </div>
              
              {roundingEnabled && (
                <div className="mt-3 p-3 bg-blue-100 rounded-lg">
                  <p className="text-xs text-blue-800">
                    <strong>Pembulatan:</strong> Harga bundel telah dibulatkan sesuai aturan: angka yang berakhir dengan 500 tetap, 001-499 dibulatkan ke 500, 501-999 dibulatkan ke 1000.
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
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nama Bundel</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produk</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Normal</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Potongan</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Harga Bundel</th>
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
                      {entry.name}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <ul className="list-disc list-inside">
                        {entry.items.map((item, i) => (
                          <li key={i} className="text-xs">
                            {getProductName(item.product_id)} x{item.quantity}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.totalOriginal)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {entry.discount.type === 'percentage' 
                        ? `${entry.discount.value}%` 
                        : formatCurrency(entry.discount.value)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      {formatCurrency(entry.totalFinal)}
                    </td>
                    <td className="px-4 py-2 text-sm text-gray-900">
                      <span className={entry.profitPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {entry.profitPercentage.toFixed(2)}% ({formatCurrency(entry.profitAmount)})
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
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-800">Tips Penggunaan</CardTitle>
        </CardHeader>
        <div className="p-4">
          <ul className="space-y-2 text-sm text-blue-700">
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Tambahkan Menu:</strong> Pilih menu-menu yang ingin dijadikan bundel.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Atur Jumlah:</strong> Tentukan jumlah masing-masing menu dalam bundel.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Tentukan Potongan:</strong> Pilih antara persentase atau nominal untuk potongan harga bundel.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Biaya Channel:</strong> Aktifkan jika bundel akan dijual melalui platform online yang memotong fee.</span>
            </li>
            <li className="flex items-start">
              <span className="font-bold mr-2">•</span>
              <span><strong>Perhatikan Status:</strong> Pastikan profit tetap dalam batas aman (di atas 50%).</span>
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default BundlingCalculator;