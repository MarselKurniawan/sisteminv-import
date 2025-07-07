export interface City {
  id: number;
  name: string;
  created_at: string;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  city_id: number;
  city_name?: string;
  contact: string;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  packaging: string;
  size: string;
  stock: number;
  base_price: number;
  created_at: string;
}

export interface DeliveryItem {
  id?: number;
  product_id: number;
  product_name?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface StoreDelivery {
  id: number;
  store_id: number;
  store_name?: string;
  city_name?: string;
  delivery_date: string;
  invoice_date?: string;
  billing_date?: string;
  status: 'pending' | 'delivered' | 'invoiced' | 'paid' | 'completed';
  price_markup: '2.5%' | '5%' | '10%' | 'normal';
  discount: number;
  shipping_cost: number;
  total_amount: number;
  notes?: string;
  items: DeliveryItem[];
  created_at: string;
}

export interface IndividualDelivery {
  id: number;
  customer_name: string;
  customer_contact: string;
  purchase_date: string;
  status: 'pending' | 'completed';
  price_markup: '2.5%' | '5%' | '10%' | 'normal';
  discount: number;
  shipping_cost: number;
  total_amount: number;
  notes?: string;
  items: DeliveryItem[];
  created_at: string;
}

export interface Return {
  id: number;
  delivery_type: 'store' | 'individual';
  delivery_id: number;
  return_date: string;
  reason: string;
  total_amount: number;
  status: 'pending' | 'processed' | 'completed';
  items: DeliveryItem[];
  created_at: string;
}

export interface Employee {
  id: number;
  name: string;
  position: string;
  department: string;
  hire_date: string;
  salary: number;
  contact: string;
  status: 'active' | 'inactive';
  created_at: string;
}

export interface Payroll {
  id: number;
  employee_id: number;
  employee_name?: string;
  pay_period_start: string;
  pay_period_end: string;
  base_salary: number;
  overtime_hours: number;
  overtime_rate: number;
  bonuses: number;
  deductions: number;
  gross_pay: number;
  net_pay: number;
  status: 'draft' | 'processed' | 'paid';
  created_at: string;
}

export interface RawMaterial {
  id: number;
  name: string;
  category: string;
  unit: string;
  stock_quantity: number;
  unit_cost: number;
  supplier: string;
  minimum_stock: number;
  expiry_date?: string;
  created_at: string;
}

export interface FactoryProduction {
  id: number;
  product_id: number;
  product_name?: string;
  production_date: string;
  quantity_produced: number;
  raw_materials_used: ProductionMaterial[];
  labor_hours: number;
  production_cost: number;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  notes?: string;
  created_at: string;
}

export interface ProductionMaterial {
  id?: number;
  raw_material_id: number;
  raw_material_name?: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
}

export interface DashboardStats {
  total_deliveries: number;
  total_revenue: number;
  pending_deliveries: number;
  completed_deliveries: number;
  total_returns: number;
  low_stock_products: number;
}