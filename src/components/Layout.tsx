import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Truck, 
  User, 
  RotateCcw, 
  Package, 
  Building2, 
  MapPin,
  Menu,
  X,
  Users,
  DollarSign,
  Factory,
  Wheat,
  FileText,
  Calculator,
  Receipt,
  BookOpen,
  Tag,
  Settings,
  LogOut,
  Database,
  ChevronDown,
  Shield,
  Building,
  TrendingUp,
  Percent,
  ShoppingBag,
  BarChart
} from 'lucide-react';
import { Button } from './ui/Button';
import { useMenuAccess } from '../hooks/useMenuAccess';

interface LayoutProps {
  children: React.ReactNode;
  userRole: string;
  onLogout: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, onLogout }) => {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [adminDropdownOpen, setAdminDropdownOpen] = React.useState(false);
  const [calculatorsDropdownOpen, setCalculatorsDropdownOpen] = React.useState(false);
  const { isMenuLocked, hasAccess, isMenuHidden, PinProtectionComponent } = useMenuAccess();

  // Define getMenuId function before it's used
  const getMenuId = (href: string) => {
    return href.replace('/', '') || 'dashboard';
  };

  const allNavigation = [
    { name: 'Dashboard', href: '/', icon: Home, roles: ['admin', 'kasir'] },
    { name: 'Pengiriman Toko', href: '/store-deliveries', icon: Truck, roles: ['admin', 'kasir'] },
    { name: 'Pengiriman Perorangan', href: '/individual-deliveries', icon: User, roles: ['admin', 'kasir'] },
    { name: 'Retur', href: '/returns', icon: RotateCcw, roles: ['admin', 'kasir'] },
    { name: 'Produk', href: '/products', icon: Package, roles: ['admin', 'kasir'] },
    { name: 'Toko', href: '/stores', icon: Building2, roles: ['admin', 'kasir'] },
    { name: 'Kota', href: '/cities', icon: MapPin, roles: ['admin', 'kasir'] },
    { name: 'Area Harga', href: '/price-areas', icon: Tag, roles: ['admin', 'kasir'] },
    { name: 'Pembukuan', href: '/bookkeeping', icon: BookOpen, roles: ['admin', 'kasir'] },
    { name: 'Tagihan', href: '/bills', icon: Receipt, roles: ['admin', 'kasir'] },
    { name: 'Setup Bahan', href: '/raw-materials', icon: Wheat, roles: ['admin'] },
    { name: 'Pabrik', href: '/factory', icon: Factory, roles: ['admin'] },
    { name: 'Kalkulator HPP', href: '/hpp', icon: Calculator, roles: ['admin'] },
    { name: 'Laporan Season', href: '/seasonal-report', icon: BarChart, roles: ['admin'] },
  ];

  const calculatorSubMenus = [
    { name: 'Kalkulator Diskon', href: '/discount-calculator', icon: Percent },
    { name: 'Kalkulator Bundling', href: '/bundling-calculator', icon: ShoppingBag },
    { name: 'Biaya Overhead', href: '/overhead-calculator', icon: DollarSign },
  ];

  const adminSubMenus = [
    { name: 'Karyawan', href: '/employees', icon: Users },
    { name: 'Penggajian', href: '/payroll', icon: DollarSign },
    { name: 'Aset', href: '/assets', icon: Building },
    { name: 'ROI', href: '/roi', icon: TrendingUp },
    { name: 'Laporan', href: '/reports', icon: FileText },
    { name: 'Backup Data', href: '/data-backup', icon: Database },
    { name: 'Pengaturan Admin', href: '/admin-settings', icon: Settings },
  ];

  const navigation = allNavigation.filter(item => {
    // Check role access
    if (!item.roles.includes(userRole)) return false;
    
    // For kasir, check if menu is hidden
    if (userRole === 'kasir') {
      const menuId = getMenuId(item.href);
      return !isMenuHidden(menuId);
    }
    
    return true;
  });

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isAdminMenuActive = () => {
    return adminSubMenus.some(item => location.pathname === item.href);
  };

  const isCalculatorsMenuActive = () => {
    return calculatorSubMenus.some(item => location.pathname === item.href);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-gray-200
        lg:relative lg:translate-x-0 lg:flex lg:flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 flex-shrink-0">
          <img src="https://risnacookies.com/wp-content/uploads/2025/02/Risna-Cookies-Desain-02-e1740218556622.png" className="w-32" alt="Logo" />
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-white hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex-1 mt-8 px-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            const menuId = getMenuId(item.href);
            const locked = isMenuLocked(menuId);
            
            return (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 animate-slide-in
                  ${isActive(item.href)
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg transform scale-105'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-md'
                  }
                `}
              >
                <Icon className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
                {locked && userRole === 'kasir' && <Shield className="ml-auto h-4 w-4 text-amber-500" />}
              </Link>
            );
          })}

          {/* Calculators Dropdown */}
          <div className="relative">
            <button
              onClick={() => setCalculatorsDropdownOpen(!calculatorsDropdownOpen)}
              className={`
                w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 animate-slide-in
                ${isCalculatorsMenuActive()
                  ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-lg'
                  : 'text-gray-700 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 hover:text-green-700 hover:shadow-md'
                }
              `}
            >
              <Calculator className="mr-3 h-5 w-5 flex-shrink-0" />
              <span className="truncate">Kalkulator</span>
              <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${calculatorsDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {calculatorsDropdownOpen && (
              <div className="ml-4 mt-2 space-y-1 animate-fade-in">
                {calculatorSubMenus.map((item) => {
                  const Icon = item.icon;
                  const menuId = getMenuId(item.href);
                  const locked = isMenuLocked(menuId);
                  
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`
                        flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                        ${isActive(item.href)
                          ? 'bg-gradient-to-r from-green-500 to-teal-500 text-white shadow-md'
                          : 'text-gray-600 hover:bg-gradient-to-r hover:from-green-50 hover:to-teal-50 hover:text-green-600'
                        }
                      `}
                    >
                      <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {locked && userRole === 'kasir' && <Shield className="ml-auto h-3 w-3 text-amber-500" />}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin Dropdown */}
          {userRole === 'admin' && (
            <div className="relative">
              <button
                onClick={() => setAdminDropdownOpen(!adminDropdownOpen)}
                className={`
                  w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 animate-slide-in
                  ${isAdminMenuActive()
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg'
                    : 'text-gray-700 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:text-purple-700 hover:shadow-md'
                  }
                `}
              >
                <Settings className="mr-3 h-5 w-5 flex-shrink-0" />
                <span className="truncate">Admin</span>
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${adminDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {adminDropdownOpen && (
                <div className="ml-4 mt-2 space-y-1 animate-fade-in">
                  {adminSubMenus.map((item) => {
                    const Icon = item.icon;
                    const menuId = getMenuId(item.href);
                    const locked = isMenuLocked(menuId);
                    
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                          flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
                          ${isActive(item.href)
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md'
                            : 'text-gray-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:text-emerald-600'
                          }
                        `}
                      >
                        <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                        {locked && userRole === 'kasir' && <Shield className="ml-auto h-3 w-3 text-amber-500" />}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>

        {/* User info and logout */}
        <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">
                {userRole === 'admin' ? 'Administrator' : 'Kasir'}
              </p>
              <p className="text-xs text-gray-600">
                {userRole === 'admin' ? 'Akses Penuh' : 'Akses Terbatas'}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={LogOut}
              onClick={onLogout}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Keluar
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="sticky top-0 z-10 flex h-16 bg-white border-b border-gray-200 lg:hidden shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            className="px-4 text-blue-600 hover:text-blue-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex-1 flex items-center justify-center">
            <h1 className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Sistem Inventory</h1>
          </div>
        </div>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Pin Protection Component */}
      <PinProtectionComponent />
    </div>
  );
};

export default Layout;