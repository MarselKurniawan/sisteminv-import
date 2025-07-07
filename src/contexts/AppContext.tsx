import React, { createContext, useContext, useState, ReactNode } from 'react';
import { db } from '../lib/database';
import toast from 'react-hot-toast';
import { isSupabaseConfigured } from '../lib/supabase';

interface AppContextType {
  refreshData: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  cities: any[];
  priceAreas: any[];
  stores: any[];
  products: any[];
  storeDeliveries: any[];
  individualDeliveries: any[];
  returns: any[];
  employees: any[];
  payrolls: any[];
  rawMaterials: any[];
  factoryProductions: any[];
  dashboardStats: any;
  loadData: () => void;
  isUsingSupabase: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [priceAreas, setPriceAreas] = useState([]);
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [storeDeliveries, setStoreDeliveries] = useState([]);
  const [individualDeliveries, setIndividualDeliveries] = useState([]);
  const [returns, setReturns] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [factoryProductions, setFactoryProductions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({});
  const isUsingSupabase = isSupabaseConfigured();

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [
        citiesData, 
        priceAreasData,
        storesData, 
        productsData, 
        storeDeliveriesData,
        individualDeliveriesData,
        returnsData,
        employeesData,
        payrollsData,
        rawMaterialsData,
        factoryProductionsData,
        statsData
      ] = await Promise.all([
        db.getCities(),
        db.getPriceAreas(),
        db.getStores(),
        db.getProducts(),
        db.getStoreDeliveries(),
        db.getIndividualDeliveries(),
        db.getReturns(),
        db.getEmployees(),
        db.getPayrolls(),
        db.getRawMaterials(),
        db.getFactoryProductions(),
        db.getDashboardStats()
      ]);
      
      setCities(citiesData);
      setPriceAreas(priceAreasData);
      setStores(storesData);
      setProducts(productsData);
      setStoreDeliveries(storeDeliveriesData);
      setIndividualDeliveries(individualDeliveriesData);
      setReturns(returnsData);
      setEmployees(employeesData);
      setPayrolls(payrollsData);
      setRawMaterials(rawMaterialsData);
      setFactoryProductions(factoryProductionsData);
      setDashboardStats(statsData);
    } catch (error) {
      toast.error('Error loading data');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = () => {
    loadData();
  };

  React.useEffect(() => {
    loadData();
  }, []);

  const value: AppContextType = {
    refreshData,
    isLoading,
    setIsLoading,
    cities,
    priceAreas,
    stores,
    products,
    storeDeliveries,
    individualDeliveries,
    returns,
    employees,
    payrolls,
    rawMaterials,
    factoryProductions,
    dashboardStats,
    loadData,
    isUsingSupabase
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};