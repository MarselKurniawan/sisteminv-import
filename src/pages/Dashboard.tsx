import React, { useState } from 'react';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { Select } from '../components/ui/Select';
import { useApp } from '../contexts/AppContext';
import { 
  TrendingUp, 
  Package, 
  Clock, 
  CheckCircle, 
  RotateCcw, 
  AlertTriangle,
  Calendar,
  MapPin,
  Truck,
  User,
  Building2,
  DollarSign,
  BarChart3,
  PieChart
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { 
    dashboardStats, 
    storeDeliveries, 
    individualDeliveries, 
    products, 
    stores, 
    cities, 
    rawMaterials,
    factoryProductions,
    returns,
    isLoading 
  } = useApp();

  const [revenueFilter, setRevenueFilter] = useState({
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(date);
  };

  // Calculate total raw material expenses
  const calculateRawMaterialExpenses = () => {
    return rawMaterials?.reduce((total: number, material: any) => {
      return total + (material.stock_quantity * material.unit_cost);
    }, 0) || 0;
  };

  const statsCards = [
    {
      title: 'Total Pengiriman',
      value: dashboardStats.total_deliveries || 0,
      icon: Package,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50'
    },
    {
      title: 'Total Pendapatan',
      value: formatCurrency(dashboardStats.total_revenue || 0),
      icon: TrendingUp,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Pengeluaran Bahan Baku',
      value: formatCurrency(calculateRawMaterialExpenses()),
      icon: DollarSign,
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Pengiriman Tertunda',
      value: dashboardStats.pending_deliveries || 0,
      icon: Clock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50'
    },
    {
      title: 'Pengiriman Selesai',
      value: dashboardStats.completed_deliveries || 0,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50'
    },
    {
      title: 'Total Retur',
      value: dashboardStats.total_returns || 0,
      icon: RotateCcw,
      color: 'bg-red-500',
      bgColor: 'bg-red-50'
    },
    {
      title: 'Stok Menipis',
      value: dashboardStats.low_stock_products || 0,
      icon: AlertTriangle,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50'
    }
  ];

  // Calculate top products by packaging type (after returns)
  const getTopProductsByPackaging = () => {
    const productSales: { [key: string]: { [key: string]: number } } = {};
    
    // Process store deliveries
    storeDeliveries?.forEach((delivery: any) => {
      if (delivery.status === 'completed' && delivery.items) {
        delivery.items.forEach((item: any) => {
          const product = products.find((p: any) => p.id === item.product_id);
          if (product) {
            const packagingKey = `${product.packaging}`;
            const productKey = `${product.name} (${product.packaging})`;
            
            if (!productSales[packagingKey]) {
              productSales[packagingKey] = {};
            }
            
            productSales[packagingKey][productKey] = (productSales[packagingKey][productKey] || 0) + item.quantity;
          }
        });
      }
    });

    // Subtract returns
    returns?.forEach((returnItem: any) => {
      if (returnItem.status === 'completed' && returnItem.items) {
        returnItem.items.forEach((item: any) => {
          const product = products.find((p: any) => p.id === item.product_id);
          if (product) {
            const packagingKey = `${product.packaging}`;
            const productKey = `${product.name} (${product.packaging})`;
            
            if (productSales[packagingKey] && productSales[packagingKey][productKey]) {
              productSales[packagingKey][productKey] = Math.max(0, productSales[packagingKey][productKey] - item.quantity);
            }
          }
        });
      }
    });
    
    // Convert to array and get top 5 per packaging
    const topProducts: Array<{ packaging: string; product: string; sold: number }> = [];
    
    Object.entries(productSales).forEach(([packaging, products]) => {
      const packagingProducts = Object.entries(products)
        .map(([product, sold]) => ({ packaging, product, sold }))
        .sort((a, b) => b.sold - a.sold)
        .slice(0, 5);
      
      topProducts.push(...packagingProducts);
    });
    
    return topProducts.slice(0, 10);
  };

  // Calculate revenue by store
  const getRevenueByStore = () => {
    const storeRevenue: { [key: string]: number } = {};
    
    storeDeliveries?.forEach((delivery: any) => {
      if (delivery.status === 'completed') {
        const storeName = delivery.store_name || 'Unknown';
        storeRevenue[storeName] = (storeRevenue[storeName] || 0) + delivery.total_amount;
      }
    });

    return Object.entries(storeRevenue)
      .map(([store, revenue]) => ({ store, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  };

  // Calculate revenue by city
  const getRevenueByCity = () => {
    const cityRevenue: { [key: string]: number } = {};
    
    storeDeliveries?.forEach((delivery: any) => {
      if (delivery.status === 'completed') {
        const cityName = delivery.city_name || 'Unknown';
        cityRevenue[cityName] = (cityRevenue[cityName] || 0) + delivery.total_amount;
      }
    });

    return Object.entries(cityRevenue)
      .map(([city, revenue]) => ({ city, revenue }))
      .sort((a, b) => b.revenue - a.revenue);
  };

  // Get monthly revenue data
  const getMonthlyRevenue = () => {
    const monthlyData = Array(12).fill(0);
    
    [...storeDeliveries, ...individualDeliveries]
      .filter((delivery: any) => {
        const deliveryDate = new Date(delivery.delivery_date || delivery.purchase_date);
        return deliveryDate.getFullYear() === revenueFilter.year && delivery.status === 'completed';
      })
      .forEach((delivery: any) => {
        const month = new Date(delivery.delivery_date || delivery.purchase_date).getMonth();
        monthlyData[month] += delivery.total_amount;
      });
    
    return monthlyData;
  };

  // Get recent activities from real data
  const getRecentActivities = () => {
    const activities: Array<{
      type: string;
      action: string;
      location: string;
      time: string;
      icon: any;
    }> = [];

    // Add recent store deliveries
    storeDeliveries
      ?.slice(0, 2)
      .forEach((delivery: any) => {
        activities.push({
          type: 'store',
          action: `Pengiriman ke ${delivery.store_name}`,
          location: delivery.city_name || 'Unknown',
          time: new Date(delivery.created_at).toLocaleString('id-ID'),
          icon: Truck
        });
      });

    // Add recent individual deliveries
    individualDeliveries
      ?.slice(0, 1)
      .forEach((delivery: any) => {
        activities.push({
          type: 'individual',
          action: `Pengiriman ke ${delivery.customer_name}`,
          location: 'Perorangan',
          time: new Date(delivery.created_at).toLocaleString('id-ID'),
          icon: User
        });
      });

    return activities.slice(0, 3);
  };

  // Get upcoming deliveries (pending deliveries)
  const getUpcomingDeliveries = () => {
    const upcoming = storeDeliveries
      ?.filter((delivery: any) => delivery.status === 'pending')
      .slice(0, 2)
      .map((delivery: any) => ({
        date: new Date(delivery.delivery_date),
        store: delivery.store_name,
        city: delivery.city_name,
        items: delivery.items?.length || 0
      })) || [];

    return upcoming;
  };

  const topProductsByPackaging = getTopProductsByPackaging();
  const revenueByStore = getRevenueByStore();
  const revenueByCity = getRevenueByCity();
  const monthlyRevenue = getMonthlyRevenue();
  const recentActivities = getRecentActivities();
  const upcomingDeliveries = getUpcomingDeliveries();

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(7)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-24 bg-gray-200 rounded"></div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Ringkasan sistem inventory toko roti</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="relative overflow-hidden">
              <div className="flex items-center">
                <div className={`p-3 rounded-lg ${stat.bgColor} mr-4`}>
                  <Icon className={`h-6 w-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Revenue Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Pendapatan Bulanan {revenueFilter.year}
              </CardTitle>
              <Select
                value={revenueFilter.year}
                onChange={(value) => setRevenueFilter({ ...revenueFilter, year: parseInt(value.toString()) })}
                options={[
                  { value: 2024, label: '2024' },
                  { value: 2025, label: '2025' }
                ]}
              />
            </div>
          </CardHeader>
          <div className="space-y-4">
            {monthlyRevenue.map((revenue, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 w-12">{monthNames[index]}</span>
                <div className="flex-1 mx-4">
                  <div className="bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.max(5, (revenue / Math.max(...monthlyRevenue)) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-900 w-24 text-right">
                  {formatCurrency(revenue)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Pendapatan per Kota
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {revenueByCity.length === 0 ? (
              <div className="text-center py-8">
                <MapPin className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Belum ada data pendapatan</p>
              </div>
            ) : (
              revenueByCity.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 text-green-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{item.city}</span>
                  </div>
                  <span className="text-sm font-medium text-green-600">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products by Packaging */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Produk per Kemasan (Net)</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {topProductsByPackaging.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Belum ada data penjualan</p>
              </div>
            ) : (
              topProductsByPackaging.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Package className="h-4 w-4 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.product}</p>
                      <p className="text-xs text-gray-500">{item.packaging}</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-blue-600">{item.sold} terjual</span>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Revenue by Store */}
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Pendapatan per Toko</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {revenueByStore.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Belum ada data pendapatan</p>
              </div>
            ) : (
              revenueByStore.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <Building2 className="h-4 w-4 text-purple-600 mr-3" />
                    <span className="text-sm font-medium text-gray-900">{item.store}</span>
                  </div>
                  <span className="text-sm font-medium text-purple-600">{formatCurrency(item.revenue)}</span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle>Aktivitas Terbaru</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {recentActivities.length === 0 ? (
              <div className="text-center py-8">
                <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Belum ada aktivitas</p>
              </div>
            ) : (
              recentActivities.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600 mr-3" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500">{activity.location} • {activity.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Upcoming Deliveries */}
        <Card>
          <CardHeader>
            <CardTitle>Pengiriman Selanjutnya</CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {upcomingDeliveries.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Tidak ada pengiriman yang dijadwalkan</p>
              </div>
            ) : (
              upcomingDeliveries.map((delivery, index) => (
                <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                  <Calendar className="h-5 w-5 text-green-600 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{delivery.store}</p>
                    <p className="text-xs text-gray-500">
                      {formatDate(delivery.date)} • {delivery.city} • {delivery.items} item
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status Sistem</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-emerald-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Database</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              Online
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-emerald-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Sistem Inventory</span>
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
              Aktif
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-gray-900">Sinkronisasi Data</span>
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
              Tersinkron
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;