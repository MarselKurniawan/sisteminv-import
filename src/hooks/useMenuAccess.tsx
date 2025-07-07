import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { PinProtection } from '../components/PinProtection';
import { db } from '../lib/database';

export const useMenuAccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showPinModal, setShowPinModal] = useState(false);
  const [lockedMenus, setLockedMenus] = useState<string[]>([]);
  const [hiddenMenus, setHiddenMenus] = useState<string[]>([]);
  const [menuPins, setMenuPins] = useState<{ [key: string]: string }>({});
  const [accessGranted, setAccessGranted] = useState<string[]>([]);
  const [pendingAccess, setPendingAccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    loadMenuSettings();
    // Get user role from localStorage or context
    const role = localStorage.getItem('userRole') || 'kasir';
    setUserRole(role);
  }, []);

  useEffect(() => {
    if (userRole === 'kasir') {
      checkMenuAccess();
    }
  }, [location.pathname, lockedMenus, userRole]);

  const loadMenuSettings = async () => {
    try {
      const settings = await db.getAdminSettings();
      setLockedMenus(settings.lockedMenus || []);
      setHiddenMenus(settings.hiddenMenus || []);
      setMenuPins(settings.menuPins || {});
    } catch (error) {
      console.error('Error loading menu settings:', error);
    }
  };

  const getMenuIdFromPath = (path: string): string => {
    const pathMap: { [key: string]: string } = {
      '/': 'dashboard',
      '/cities': 'cities',
      '/price-areas': 'price-areas',
      '/stores': 'stores',
      '/products': 'products',
      '/store-deliveries': 'store-deliveries',
      '/individual-deliveries': 'individual-deliveries',
      '/returns': 'returns',
      '/bookkeeping': 'bookkeeping',
      '/employees': 'employees',
      '/payroll': 'payroll',
      '/factory': 'factory',
      '/raw-materials': 'raw-materials',
      '/hpp': 'hpp',
      '/bills': 'bills',
      '/reports': 'reports',
      '/admin-settings': 'admin-settings',
      '/data-backup': 'data-backup',
      '/assets': 'assets',
      '/roi': 'roi'
    };
    return pathMap[path] || '';
  };

  const getMenuNameFromId = (menuId: string): string => {
    const nameMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'cities': 'Kota',
      'price-areas': 'Area Harga',
      'stores': 'Toko',
      'products': 'Produk',
      'store-deliveries': 'Pengiriman Toko',
      'individual-deliveries': 'Pengiriman Perorangan',
      'returns': 'Retur',
      'bookkeeping': 'Pembukuan',
      'employees': 'Karyawan',
      'payroll': 'Penggajian',
      'factory': 'Pabrik',
      'raw-materials': 'Bahan Baku',
      'hpp': 'HPP',
      'bills': 'Tagihan',
      'reports': 'Laporan',
      'admin-settings': 'Pengaturan Admin',
      'data-backup': 'Backup Data',
      'assets': 'Aset',
      'roi': 'ROI'
    };
    return nameMap[menuId] || menuId;
  };

  const checkMenuAccess = () => {
    const currentMenuId = getMenuIdFromPath(location.pathname);
    
    if (currentMenuId && lockedMenus.includes(currentMenuId) && !accessGranted.includes(currentMenuId)) {
      setPendingAccess(currentMenuId);
      setShowPinModal(true);
    }
  };

  const handleAccessGranted = () => {
    if (pendingAccess) {
      setAccessGranted(prev => [...prev, pendingAccess]);
      setPendingAccess(null);
    }
    setShowPinModal(false);
  };

  const handleAccessDenied = () => {
    setShowPinModal(false);
    setPendingAccess(null);
    navigate('/');
  };

  const verifyMenuPin = async (pin: string): Promise<boolean> => {
    if (!pendingAccess) return false;
    
    try {
      const isValid = await db.verifyMenuPin(pendingAccess, pin);
      return isValid;
    } catch (error) {
      console.error('Error verifying menu PIN:', error);
      return false;
    }
  };

  const PinProtectionComponent = () => (
    <PinProtection
      isOpen={showPinModal}
      onSuccess={handleAccessGranted}
      onCancel={handleAccessDenied}
      menuName={pendingAccess ? getMenuNameFromId(pendingAccess) : ''}
      verifyPin={verifyMenuPin}
    />
  );

  return {
    PinProtectionComponent,
    isMenuLocked: (menuId: string) => lockedMenus.includes(menuId),
    isMenuHidden: (menuId: string) => hiddenMenus.includes(menuId),
    hasAccess: (menuId: string) => !lockedMenus.includes(menuId) || accessGranted.includes(menuId)
  };
};