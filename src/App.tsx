import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Cities from './pages/Cities';
import PriceAreas from './pages/PriceAreas';
import Stores from './pages/Stores';
import Products from './pages/Products';
import StoreDeliveries from './pages/StoreDeliveries';
import IndividualDeliveries from './pages/IndividualDeliveries';
import Returns from './pages/Returns';
import Employees from './pages/Employees';
import Payroll from './pages/Payroll';
import Factory from './pages/Factory';
import RawMaterials from './pages/RawMaterials';
import HPP from './pages/HPP';
import Bills from './pages/Bills';
import Bookkeeping from './pages/Bookkeeping';
import Reports from './pages/Reports';
import AdminSettings from './pages/AdminSettings';
import DataBackup from './pages/DataBackup';
import Assets from './pages/Assets';
import ROI from './pages/ROI';
import DiscountCalculator from './pages/DiscountCalculator';
import BundlingCalculator from './pages/BundlingCalculator';
import OverheadCalculator from './pages/OverheadCalculator';
import SeasonalReport from './pages/SeasonalReport';
import { db } from './lib/database';
import { initDatabase, isDatabaseInitialized } from './lib/localDatabase';

function AppContent() {
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize database and check if user is already logged in
  useEffect(() => {
    const initApp = async () => {
      try {
        // Initialize database
        if (!isDatabaseInitialized()) {
          await initDatabase();
        }
        
        // Check if user is already logged in
        const savedRole = localStorage.getItem('userRole');
        if (savedRole) {
          setUserRole(savedRole);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = (role: string) => {
    setUserRole(role);
    localStorage.setItem('userRole', role);
  };

  const handleLogout = () => {
    setUserRole(null);
    localStorage.removeItem('userRole');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Memuat Sistem...</h2>
          <p className="text-gray-500 mt-2">Menginisialisasi database lokal</p>
        </div>
      </div>
    );
  }

  if (!userRole) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Layout userRole={userRole} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cities" element={<Cities />} />
          <Route path="/price-areas" element={<PriceAreas />} />
          <Route path="/stores" element={<Stores />} />
          <Route path="/products" element={<Products />} />
          <Route path="/store-deliveries" element={<StoreDeliveries />} />
          <Route path="/individual-deliveries" element={<IndividualDeliveries />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/bookkeeping" element={<Bookkeeping />} />
          <Route path="/employees" element={<Employees />} />
          <Route path="/payroll" element={<Payroll />} />
          <Route path="/factory" element={<Factory />} />
          <Route path="/raw-materials" element={<RawMaterials />} />
          <Route path="/hpp" element={<HPP />} />
          <Route path="/bills" element={<Bills />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/admin-settings" element={<AdminSettings />} />
          <Route path="/data-backup" element={<DataBackup />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/roi" element={<ROI />} />
          <Route path="/discount-calculator" element={<DiscountCalculator />} />
          <Route path="/bundling-calculator" element={<BundlingCalculator />} />
          <Route path="/overhead-calculator" element={<OverheadCalculator />} />
          <Route path="/seasonal-report" element={<SeasonalReport />} />
        </Routes>
      </Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
        }}
      />
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <Router>
        <AppContent />
      </Router>
    </AppProvider>
  );
}

export default App;