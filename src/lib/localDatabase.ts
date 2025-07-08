import localforage from 'localforage';
import initSqlJs from 'sql.js';
import sqlWasm from 'sql.js/dist/sql-wasm.wasm?url';

// Initialize SQLite database
let SQL: any;
let db: any;
let isInitialized = false;

// Initialize the database
export const initDatabase = async () => {
  if (isInitialized) return;

  try {
    // Load SQL.js with proper WASM file path
    SQL = await initSqlJs({
      locateFile: file => file === 'sql-wasm.wasm' ? sqlWasm : file
    });

    // Check if we have a saved database
    const savedDbData = await localforage.getItem('bakery_database');
    
    if (savedDbData) {
      // Load existing database
      db = new SQL.Database(new Uint8Array(savedDbData as ArrayBuffer));
      console.log('Loaded existing database');
    } else {
      // Create a new database
      db = new SQL.Database();
      console.log('Created new database');
      
      // Create tables
      createTables();
      
      // Save the database
      await saveDatabase();
    }
    
    isInitialized = true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
};

// Save the database to localforage
export const saveDatabase = async () => {
  if (!db) return;
  
  try {
    const data = db.export();
    await localforage.setItem('bakery_database', data);
    console.log('Database saved');
  } catch (error) {
    console.error('Failed to save database:', error);
    throw error;
  }
};

// Create database tables
const createTables = () => {
  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'kasir')),
      pin TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert default users if not exists
  const users = db.exec("SELECT COUNT(*) as count FROM users");
  if (users[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO users (name, role, pin) VALUES 
      ('Admin', 'admin', '123456'),
      ('Kasir', 'kasir', '654321')
    `);
  }

  // Cities table
  db.run(`
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Price areas table
  db.run(`
    CREATE TABLE IF NOT EXISTS price_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Stores table
  db.run(`
    CREATE TABLE IF NOT EXISTS stores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      city_id INTEGER NOT NULL,
      contact_billing_name TEXT,
      contact_billing_phone TEXT,
      contact_purchasing_name TEXT,
      contact_purchasing_phone TEXT,
      contact_store_name TEXT,
      contact_store_phone TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (city_id) REFERENCES cities(id)
    )
  `);

  // Products table
  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      packaging TEXT NOT NULL,
      size TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('reguler', 'season')),
      product_type TEXT NOT NULL CHECK (product_type IN ('single', 'package')),
      stock INTEGER NOT NULL DEFAULT 0,
      minimum_stock INTEGER NOT NULL DEFAULT 24,
      base_price REAL NOT NULL,
      hpp_price REAL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Product area prices table
  db.run(`
    CREATE TABLE IF NOT EXISTS product_area_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      price_area_id INTEGER NOT NULL,
      price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (price_area_id) REFERENCES price_areas(id),
      UNIQUE (product_id, price_area_id)
    )
  `);

  // Package items table
  db.run(`
    CREATE TABLE IF NOT EXISTS package_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      package_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (package_id) REFERENCES products(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE (package_id, product_id)
    )
  `);

  // Store deliveries table
  db.run(`
    CREATE TABLE IF NOT EXISTS store_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store_id INTEGER NOT NULL,
      delivery_date TEXT NOT NULL,
      invoice_date TEXT,
      billing_date TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'invoiced', 'paid', 'completed')),
      price_markup TEXT NOT NULL CHECK (price_markup IN ('normal', '2.5%', '5%', '10%')),
      discount REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      notes TEXT,
      show_discount_in_print INTEGER DEFAULT 1,
      show_shipping_in_print INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (store_id) REFERENCES stores(id)
    )
  `);

  // Individual deliveries table
  db.run(`
    CREATE TABLE IF NOT EXISTS individual_deliveries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      customer_contact TEXT,
      purchase_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'completed')),
      price_markup TEXT NOT NULL CHECK (price_markup IN ('normal', '2.5%', '5%', '10%')),
      discount REAL NOT NULL DEFAULT 0,
      shipping_cost REAL NOT NULL DEFAULT 0,
      total_amount REAL NOT NULL,
      notes TEXT,
      show_discount_in_print INTEGER DEFAULT 1,
      show_shipping_in_print INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Delivery items table
  db.run(`
    CREATE TABLE IF NOT EXISTS delivery_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_type TEXT NOT NULL CHECK (delivery_type IN ('store', 'individual')),
      delivery_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      price_type TEXT NOT NULL CHECK (price_type IN ('base', 'area')),
      area_price_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (area_price_id) REFERENCES price_areas(id),
      UNIQUE (delivery_type, delivery_id, product_id)
    )
  `);

  // Returns table
  db.run(`
    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delivery_type TEXT NOT NULL CHECK (delivery_type IN ('store', 'individual')),
      delivery_id INTEGER NOT NULL,
      return_date TEXT NOT NULL,
      reason TEXT NOT NULL,
      return_location TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending', 'processed', 'completed')),
      total_amount REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Return items table
  db.run(`
    CREATE TABLE IF NOT EXISTS return_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      return_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price REAL NOT NULL,
      total_price REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (return_id) REFERENCES returns(id),
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE (return_id, product_id)
    )
  `);

  // Employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      position TEXT NOT NULL,
      base_salary REAL NOT NULL,
      base_overtime REAL NOT NULL,
      contact TEXT NOT NULL,
      address TEXT,
      hire_date TEXT NOT NULL,
      birth_date TEXT,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Payrolls table
  db.run(`
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      period TEXT NOT NULL,
      attendance_days INTEGER NOT NULL,
      overtime_days INTEGER NOT NULL,
      base_salary REAL NOT NULL,
      base_overtime REAL NOT NULL,
      additional_amount REAL NOT NULL DEFAULT 0,
      additional_description TEXT,
      additional_show_in_print INTEGER DEFAULT 1,
      deduction_amount REAL NOT NULL DEFAULT 0,
      deduction_description TEXT,
      deduction_show_in_print INTEGER DEFAULT 1,
      total_salary REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  // Raw materials table
  db.run(`
    CREATE TABLE IF NOT EXISTS raw_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      unit TEXT NOT NULL,
      stock_quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      supplier TEXT,
      minimum_stock REAL NOT NULL,
      expiry_date TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Factory productions table
  db.run(`
    CREATE TABLE IF NOT EXISTS factory_productions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      production_date TEXT NOT NULL,
      quantity_produced INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Production materials table
  db.run(`
    CREATE TABLE IF NOT EXISTS production_materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      production_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity_used REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (production_id) REFERENCES factory_productions(id),
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
      UNIQUE (production_id, raw_material_id)
    )
  `);

  // Stock reductions table
  db.run(`
    CREATE TABLE IF NOT EXISTS stock_reductions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT,
      date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id)
    )
  `);

  // Product recipes table
  db.run(`
    CREATE TABLE IF NOT EXISTS product_recipes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      raw_material_id INTEGER NOT NULL,
      quantity_needed REAL NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      FOREIGN KEY (raw_material_id) REFERENCES raw_materials(id),
      UNIQUE (product_id, raw_material_id)
    )
  `);

  // HPP (Harga Pokok Produksi) table
  db.run(`
    CREATE TABLE IF NOT EXISTS hpp (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      material_cost REAL NOT NULL,
      overhead_cost REAL NOT NULL,
      target_profit_percentage REAL NOT NULL,
      fee_channel_online REAL NOT NULL DEFAULT 0,
      minimum_selling_price REAL NOT NULL,
      suggested_selling_price REAL NOT NULL,
      final_selling_price REAL NOT NULL,
      online_channel_price REAL NOT NULL,
      rounding_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (product_id) REFERENCES products(id),
      UNIQUE (product_id)
    )
  `);

  // Bookkeeping entries table
  db.run(`
    CREATE TABLE IF NOT EXISTS bookkeeping_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
      category TEXT NOT NULL CHECK (category IN ('primer', 'sekunder', 'tersier')),
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      is_auto INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Assets table
  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      purchase_date TEXT NOT NULL,
      purchase_price REAL NOT NULL,
      useful_life_years INTEGER NOT NULL,
      maintenance_cost_yearly REAL NOT NULL DEFAULT 0,
      current_value REAL,
      condition TEXT NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
      location TEXT,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Admin settings table
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_settings (
      id INTEGER PRIMARY KEY DEFAULT 1,
      pin TEXT NOT NULL DEFAULT '123456',
      locked_menus TEXT DEFAULT '[]',
      hidden_menus TEXT DEFAULT '[]',
      menu_pins TEXT DEFAULT '{}',
      profile TEXT DEFAULT '{"name": "Admin", "email": "admin@example.com"}',
      users TEXT DEFAULT '[{"id": 1, "name": "Admin", "role": "admin", "pin": "123456", "created_at": "2025-07-01T00:00:00.000Z"}, {"id": 2, "name": "Kasir", "role": "kasir", "pin": "654321", "created_at": "2025-07-01T00:00:00.000Z"}]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (id = 1)
    )
  `);

  // Insert default admin settings if not exists
  const settings = db.exec("SELECT COUNT(*) as count FROM admin_settings");
  if (settings[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO admin_settings (id, pin) VALUES (1, '123456')
    `);
  }
};

// Helper function to run a query and get results
export const query = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    
    stmt.free();
    return result;
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
};

// Helper function to run a query and get a single result
export const querySingle = (sql: string, params: any[] = []) => {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
};

// Helper function to execute a query without returning results
export const execute = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    
    // Save the database after each write operation
    saveDatabase();
    
    return true;
  } catch (error) {
    console.error('Execute error:', error);
    throw error;
  }
};

// Helper function to insert a record and get the inserted ID
export const insert = (sql: string, params: any[] = []) => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    
    // Get the last inserted ID
    const lastId = querySingle('SELECT last_insert_rowid() as id');
    
    // Save the database after each write operation
    saveDatabase();
    
    return lastId?.id;
  } catch (error) {
    console.error('Insert error:', error);
    throw error;
  }
};

// Export the database for backup
export const exportDatabase = () => {
  if (!db) throw new Error('Database not initialized');
  
  try {
    const data = db.export();
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risna_cookies_backup_${new Date().toISOString().split('T')[0]}.sqlite`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Export error:', error);
    return false;
  }
};

// Import a database from a file
export const importDatabase = async (file: File) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Create a new database with the imported data
    db = new SQL.Database(uint8Array);
    
    // Save the database
    await saveDatabase();
    
    return true;
  } catch (error) {
    console.error('Import error:', error);
    return false;
  }
};

// Check if the database is initialized
export const isDatabaseInitialized = () => {
  return isInitialized;
};
// Database API object that encapsulates all database interaction functions
export const dbAPI = {
  // Helper functions
  query,
  querySingle,
  execute,
  insert,
  
  // Cities
  getCities: () => query('SELECT * FROM cities ORDER BY name'),
  addCity: (name: string) => insert('INSERT INTO cities (name) VALUES (?)', [name]),
  updateCity: (id: number, name: string) => execute('UPDATE cities SET name = ? WHERE id = ?', [name, id]),
  deleteCity: (id: number) => execute('DELETE FROM cities WHERE id = ?', [id]),
  
  // Price Areas
  getPriceAreas: () => query('SELECT * FROM price_areas ORDER BY name'),
  addPriceArea: (name: string) => insert('INSERT INTO price_areas (name) VALUES (?)', [name]),
  updatePriceArea: (id: number, name: string) => execute('UPDATE price_areas SET name = ? WHERE id = ?', [name, id]),
  deletePriceArea: (id: number) => execute('DELETE FROM price_areas WHERE id = ?', [id]),
  
  // Stores
  getStores: () => query(`
    SELECT s.*, c.name as city_name 
    FROM stores s 
    LEFT JOIN cities c ON s.city_id = c.id 
    ORDER BY s.name
  `),
  addStore: (store: any) => insert(`
    INSERT INTO stores (
      name, address, city_id, contact_billing_name, contact_billing_phone,
      contact_purchasing_name, contact_purchasing_phone, contact_store_name, contact_store_phone
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    store.name, store.address, store.city_id, store.contact_billing_name, store.contact_billing_phone,
    store.contact_purchasing_name, store.contact_purchasing_phone, store.contact_store_name, store.contact_store_phone
  ]),
  updateStore: (id: number, store: any) => execute(`
    UPDATE stores SET 
      name = ?, address = ?, city_id = ?, contact_billing_name = ?, contact_billing_phone = ?,
      contact_purchasing_name = ?, contact_purchasing_phone = ?, contact_store_name = ?, contact_store_phone = ?
    WHERE id = ?
  `, [
    store.name, store.address, store.city_id, store.contact_billing_name, store.contact_billing_phone,
    store.contact_purchasing_name, store.contact_purchasing_phone, store.contact_store_name, store.contact_store_phone, id
  ]),
  deleteStore: (id: number) => execute('DELETE FROM stores WHERE id = ?', [id]),
  
  // Products
  getProducts: () => query('SELECT * FROM products ORDER BY name'),
  addProduct: (product: any) => insert(`
    INSERT INTO products (name, packaging, size, type, product_type, stock, minimum_stock, base_price, hpp_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    product.name, product.packaging, product.size, product.type, product.product_type,
    product.stock, product.minimum_stock, product.base_price, product.hpp_price
  ]),
  updateProduct: (id: number, product: any) => execute(`
    UPDATE products SET 
      name = ?, packaging = ?, size = ?, type = ?, product_type = ?, 
      stock = ?, minimum_stock = ?, base_price = ?, hpp_price = ?
    WHERE id = ?
  `, [
    product.name, product.packaging, product.size, product.type, product.product_type,
    product.stock, product.minimum_stock, product.base_price, product.hpp_price, id
  ]),
  deleteProduct: (id: number) => execute('DELETE FROM products WHERE id = ?', [id]),
  
  // Product Area Prices
  getProductAreaPrices: (productId: number) => query(`
    SELECT pap.*, pa.name as area_name 
    FROM product_area_prices pap
    LEFT JOIN price_areas pa ON pap.price_area_id = pa.id
    WHERE pap.product_id = ?
  `, [productId]),
  setProductAreaPrice: (productId: number, areaId: number, price: number) => {
    const existing = querySingle('SELECT id FROM product_area_prices WHERE product_id = ? AND price_area_id = ?', [productId, areaId]);
    if (existing) {
      return execute('UPDATE product_area_prices SET price = ? WHERE product_id = ? AND price_area_id = ?', [price, productId, areaId]);
    } else {
      return insert('INSERT INTO product_area_prices (product_id, price_area_id, price) VALUES (?, ?, ?)', [productId, areaId, price]);
    }
  },
  
  // Package Items
  getPackageItems: (packageId: number) => query(`
    SELECT pi.*, p.name as product_name 
    FROM package_items pi
    LEFT JOIN products p ON pi.product_id = p.id
    WHERE pi.package_id = ?
  `, [packageId]),
  addPackageItem: (packageId: number, productId: number, quantity: number) => insert(`
    INSERT INTO package_items (package_id, product_id, quantity) VALUES (?, ?, ?)
  `, [packageId, productId, quantity]),
  updatePackageItem: (id: number, quantity: number) => execute('UPDATE package_items SET quantity = ? WHERE id = ?', [quantity, id]),
  deletePackageItem: (id: number) => execute('DELETE FROM package_items WHERE id = ?', [id]),
  
  // Store Deliveries
  getStoreDeliveries: () => query(`
    SELECT sd.*, s.name as store_name 
    FROM store_deliveries sd
    LEFT JOIN stores s ON sd.store_id = s.id
    ORDER BY sd.delivery_date DESC
  `),
  addStoreDelivery: (delivery: any) => insert(`
    INSERT INTO store_deliveries (
      store_id, delivery_date, invoice_date, billing_date, status, price_markup,
      discount, shipping_cost, total_amount, notes, show_discount_in_print, show_shipping_in_print
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    delivery.store_id, delivery.delivery_date, delivery.invoice_date, delivery.billing_date,
    delivery.status, delivery.price_markup, delivery.discount, delivery.shipping_cost,
    delivery.total_amount, delivery.notes, delivery.show_discount_in_print, delivery.show_shipping_in_print
  ]),
  updateStoreDelivery: (id: number, delivery: any) => execute(`
    UPDATE store_deliveries SET 
      store_id = ?, delivery_date = ?, invoice_date = ?, billing_date = ?, status = ?, price_markup = ?,
      discount = ?, shipping_cost = ?, total_amount = ?, notes = ?, show_discount_in_print = ?, show_shipping_in_print = ?
    WHERE id = ?
  `, [
    delivery.store_id, delivery.delivery_date, delivery.invoice_date, delivery.billing_date,
    delivery.status, delivery.price_markup, delivery.discount, delivery.shipping_cost,
    delivery.total_amount, delivery.notes, delivery.show_discount_in_print, delivery.show_shipping_in_print, id
  ]),
  deleteStoreDelivery: (id: number) => execute('DELETE FROM store_deliveries WHERE id = ?', [id]),
  
  // Individual Deliveries
  getIndividualDeliveries: () => query('SELECT * FROM individual_deliveries ORDER BY purchase_date DESC'),
  addIndividualDelivery: (delivery: any) => insert(`
    INSERT INTO individual_deliveries (
      customer_name, customer_contact, purchase_date, status, price_markup,
      discount, shipping_cost, total_amount, notes, show_discount_in_print, show_shipping_in_print
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    delivery.customer_name, delivery.customer_contact, delivery.purchase_date, delivery.status,
    delivery.price_markup, delivery.discount, delivery.shipping_cost, delivery.total_amount,
    delivery.notes, delivery.show_discount_in_print, delivery.show_shipping_in_print
  ]),
  updateIndividualDelivery: (id: number, delivery: any) => execute(`
    UPDATE individual_deliveries SET 
      customer_name = ?, customer_contact = ?, purchase_date = ?, status = ?, price_markup = ?,
      discount = ?, shipping_cost = ?, total_amount = ?, notes = ?, show_discount_in_print = ?, show_shipping_in_print = ?
    WHERE id = ?
  `, [
    delivery.customer_name, delivery.customer_contact, delivery.purchase_date, delivery.status,
    delivery.price_markup, delivery.discount, delivery.shipping_cost, delivery.total_amount,
    delivery.notes, delivery.show_discount_in_print, delivery.show_shipping_in_print, id
  ]),
  deleteIndividualDelivery: (id: number) => execute('DELETE FROM individual_deliveries WHERE id = ?', [id]),
  
  // Delivery Items
  getDeliveryItems: (deliveryType: string, deliveryId: number) => query(`
    SELECT di.*, p.name as product_name 
    FROM delivery_items di
    LEFT JOIN products p ON di.product_id = p.id
    WHERE di.delivery_type = ? AND di.delivery_id = ?
  `, [deliveryType, deliveryId]),
  addDeliveryItem: (item: any) => insert(`
    INSERT INTO delivery_items (
      delivery_type, delivery_id, product_id, quantity, unit_price, total_price, price_type, area_price_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    item.delivery_type, item.delivery_id, item.product_id, item.quantity,
    item.unit_price, item.total_price, item.price_type, item.area_price_id
  ]),
  updateDeliveryItem: (id: number, item: any) => execute(`
    UPDATE delivery_items SET 
      quantity = ?, unit_price = ?, total_price = ?, price_type = ?, area_price_id = ?
    WHERE id = ?
  `, [item.quantity, item.unit_price, item.total_price, item.price_type, item.area_price_id, id]),
  deleteDeliveryItem: (id: number) => execute('DELETE FROM delivery_items WHERE id = ?', [id]),
  
  // Returns
  getReturns: () => query('SELECT * FROM returns ORDER BY return_date DESC'),
  addReturn: (returnData: any) => insert(`
    INSERT INTO returns (delivery_type, delivery_id, return_date, reason, return_location, status, total_amount)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    returnData.delivery_type, returnData.delivery_id, returnData.return_date,
    returnData.reason, returnData.return_location, returnData.status, returnData.total_amount
  ]),
  updateReturn: (id: number, returnData: any) => execute(`
    UPDATE returns SET 
      return_date = ?, reason = ?, return_location = ?, status = ?, total_amount = ?
    WHERE id = ?
  `, [returnData.return_date, returnData.reason, returnData.return_location, returnData.status, returnData.total_amount, id]),
  deleteReturn: (id: number) => execute('DELETE FROM returns WHERE id = ?', [id]),
  
  // Return Items
  getReturnItems: (returnId: number) => query(`
    SELECT ri.*, p.name as product_name 
    FROM return_items ri
    LEFT JOIN products p ON ri.product_id = p.id
    WHERE ri.return_id = ?
  `, [returnId]),
  addReturnItem: (item: any) => insert(`
    INSERT INTO return_items (return_id, product_id, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?)
  `, [item.return_id, item.product_id, item.quantity, item.unit_price, item.total_price]),
  updateReturnItem: (id: number, item: any) => execute(`
    UPDATE return_items SET quantity = ?, unit_price = ?, total_price = ? WHERE id = ?
  `, [item.quantity, item.unit_price, item.total_price, id]),
  deleteReturnItem: (id: number) => execute('DELETE FROM return_items WHERE id = ?', [id]),
  
  // Employees
  getEmployees: () => query('SELECT * FROM employees ORDER BY name'),
  addEmployee: (employee: any) => insert(`
    INSERT INTO employees (name, position, base_salary, base_overtime, contact, address, hire_date, birth_date, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    employee.name, employee.position, employee.base_salary, employee.base_overtime,
    employee.contact, employee.address, employee.hire_date, employee.birth_date, employee.status
  ]),
  updateEmployee: (id: number, employee: any) => execute(`
    UPDATE employees SET 
      name = ?, position = ?, base_salary = ?, base_overtime = ?, contact = ?, 
      address = ?, hire_date = ?, birth_date = ?, status = ?
    WHERE id = ?
  `, [
    employee.name, employee.position, employee.base_salary, employee.base_overtime,
    employee.contact, employee.address, employee.hire_date, employee.birth_date, employee.status, id
  ]),
  deleteEmployee: (id: number) => execute('DELETE FROM employees WHERE id = ?', [id]),
  
  // Payrolls
  getPayrolls: () => query(`
    SELECT p.*, e.name as employee_name 
    FROM payrolls p
    LEFT JOIN employees e ON p.employee_id = e.id
    ORDER BY p.period DESC
  `),
  addPayroll: (payroll: any) => insert(`
    INSERT INTO payrolls (
      employee_id, period, attendance_days, overtime_days, base_salary, base_overtime,
      additional_amount, additional_description, additional_show_in_print,
      deduction_amount, deduction_description, deduction_show_in_print, total_salary
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    payroll.employee_id, payroll.period, payroll.attendance_days, payroll.overtime_days,
    payroll.base_salary, payroll.base_overtime, payroll.additional_amount, payroll.additional_description,
    payroll.additional_show_in_print, payroll.deduction_amount, payroll.deduction_description,
    payroll.deduction_show_in_print, payroll.total_salary
  ]),
  updatePayroll: (id: number, payroll: any) => execute(`
    UPDATE payrolls SET 
      employee_id = ?, period = ?, attendance_days = ?, overtime_days = ?, base_salary = ?, base_overtime = ?,
      additional_amount = ?, additional_description = ?, additional_show_in_print = ?,
      deduction_amount = ?, deduction_description = ?, deduction_show_in_print = ?, total_salary = ?
    WHERE id = ?
  `, [
    payroll.employee_id, payroll.period, payroll.attendance_days, payroll.overtime_days,
    payroll.base_salary, payroll.base_overtime, payroll.additional_amount, payroll.additional_description,
    payroll.additional_show_in_print, payroll.deduction_amount, payroll.deduction_description,
    payroll.deduction_show_in_print, payroll.total_salary, id
  ]),
  deletePayroll: (id: number) => execute('DELETE FROM payrolls WHERE id = ?', [id]),
  
  // Raw Materials
  getRawMaterials: () => query('SELECT * FROM raw_materials ORDER BY name'),
  addRawMaterial: (material: any) => insert(`
    INSERT INTO raw_materials (name, category, unit, stock_quantity, unit_cost, supplier, minimum_stock, expiry_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    material.name, material.category, material.unit, material.stock_quantity,
    material.unit_cost, material.supplier, material.minimum_stock, material.expiry_date
  ]),
  updateRawMaterial: (id: number, material: any) => execute(`
    UPDATE raw_materials SET 
      name = ?, category = ?, unit = ?, stock_quantity = ?, unit_cost = ?, 
      supplier = ?, minimum_stock = ?, expiry_date = ?
    WHERE id = ?
  `, [
    material.name, material.category, material.unit, material.stock_quantity,
    material.unit_cost, material.supplier, material.minimum_stock, material.expiry_date, id
  ]),
  deleteRawMaterial: (id: number) => execute('DELETE FROM raw_materials WHERE id = ?', [id]),
  
  // Factory Productions
  getFactoryProductions: () => query(`
    SELECT fp.*, e.name as employee_name, p.name as product_name 
    FROM factory_productions fp
    LEFT JOIN employees e ON fp.employee_id = e.id
    LEFT JOIN products p ON fp.product_id = p.id
    ORDER BY fp.production_date DESC
  `),
  addFactoryProduction: (production: any) => insert(`
    INSERT INTO factory_productions (employee_id, product_id, production_date, quantity_produced, notes)
    VALUES (?, ?, ?, ?, ?)
  `, [production.employee_id, production.product_id, production.production_date, production.quantity_produced, production.notes]),
  updateFactoryProduction: (id: number, production: any) => execute(`
    UPDATE factory_productions SET 
      employee_id = ?, product_id = ?, production_date = ?, quantity_produced = ?, notes = ?
    WHERE id = ?
  `, [production.employee_id, production.product_id, production.production_date, production.quantity_produced, production.notes, id]),
  deleteFactoryProduction: (id: number) => execute('DELETE FROM factory_productions WHERE id = ?', [id]),
  
  // Production Materials
  getProductionMaterials: (productionId: number) => query(`
    SELECT pm.*, rm.name as material_name 
    FROM production_materials pm
    LEFT JOIN raw_materials rm ON pm.raw_material_id = rm.id
    WHERE pm.production_id = ?
  `, [productionId]),
  addProductionMaterial: (material: any) => insert(`
    INSERT INTO production_materials (production_id, raw_material_id, quantity_used)
    VALUES (?, ?, ?)
  `, [material.production_id, material.raw_material_id, material.quantity_used]),
  updateProductionMaterial: (id: number, material: any) => execute(`
    UPDATE production_materials SET quantity_used = ? WHERE id = ?
  `, [material.quantity_used, id]),
  deleteProductionMaterial: (id: number) => execute('DELETE FROM production_materials WHERE id = ?', [id]),
  
  // Stock Reductions
  getStockReductions: () => query(`
    SELECT sr.*, p.name as product_name 
    FROM stock_reductions sr
    LEFT JOIN products p ON sr.product_id = p.id
    ORDER BY sr.date DESC
  `),
  addStockReduction: (reduction: any) => insert(`
    INSERT INTO stock_reductions (product_id, amount, reason, notes, date)
    VALUES (?, ?, ?, ?, ?)
  `, [reduction.product_id, reduction.amount, reduction.reason, reduction.notes, reduction.date]),
  updateStockReduction: (id: number, reduction: any) => execute(`
    UPDATE stock_reductions SET product_id = ?, amount = ?, reason = ?, notes = ?, date = ? WHERE id = ?
  `, [reduction.product_id, reduction.amount, reduction.reason, reduction.notes, reduction.date, id]),
  deleteStockReduction: (id: number) => execute('DELETE FROM stock_reductions WHERE id = ?', [id]),
  
  // Product Recipes
  getProductRecipes: (productId: number) => query(`
    SELECT pr.*, rm.name as material_name 
    FROM product_recipes pr
    LEFT JOIN raw_materials rm ON pr.raw_material_id = rm.id
    WHERE pr.product_id = ?
  `, [productId]),
  addProductRecipe: (recipe: any) => insert(`
    INSERT INTO product_recipes (product_id, raw_material_id, quantity_needed)
    VALUES (?, ?, ?)
  `, [recipe.product_id, recipe.raw_material_id, recipe.quantity_needed]),
  updateProductRecipe: (id: number, recipe: any) => execute(`
    UPDATE product_recipes SET quantity_needed = ? WHERE id = ?
  `, [recipe.quantity_needed, id]),
  deleteProductRecipe: (id: number) => execute('DELETE FROM product_recipes WHERE id = ?', [id]),
  
  // HPP
  getHPP: (productId: number) => querySingle('SELECT * FROM hpp WHERE product_id = ?', [productId]),
  setHPP: (hpp: any) => {
    const existing = querySingle('SELECT id FROM hpp WHERE product_id = ?', [hpp.product_id]);
    if (existing) {
      return execute(`
        UPDATE hpp SET 
          material_cost = ?, overhead_cost = ?, target_profit_percentage = ?, fee_channel_online = ?,
          minimum_selling_price = ?, suggested_selling_price = ?, final_selling_price = ?, 
          online_channel_price = ?, rounding_enabled = ?
        WHERE product_id = ?
      `, [
        hpp.material_cost, hpp.overhead_cost, hpp.target_profit_percentage, hpp.fee_channel_online,
        hpp.minimum_selling_price, hpp.suggested_selling_price, hpp.final_selling_price,
        hpp.online_channel_price, hpp.rounding_enabled, hpp.product_id
      ]);
    } else {
      return insert(`
        INSERT INTO hpp (
          product_id, material_cost, overhead_cost, target_profit_percentage, fee_channel_online,
          minimum_selling_price, suggested_selling_price, final_selling_price, online_channel_price, rounding_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        hpp.product_id, hpp.material_cost, hpp.overhead_cost, hpp.target_profit_percentage, hpp.fee_channel_online,
        hpp.minimum_selling_price, hpp.suggested_selling_price, hpp.final_selling_price,
        hpp.online_channel_price, hpp.rounding_enabled
      ]);
    }
  },
  
  // Bookkeeping
  getBookkeepingEntries: () => query('SELECT * FROM bookkeeping_entries ORDER BY date DESC'),
  addBookkeepingEntry: (entry: any) => insert(`
    INSERT INTO bookkeeping_entries (date, type, category, description, amount, is_auto)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [entry.date, entry.type, entry.category, entry.description, entry.amount, entry.is_auto]),
  updateBookkeepingEntry: (id: number, entry: any) => execute(`
    UPDATE bookkeeping_entries SET date = ?, type = ?, category = ?, description = ?, amount = ? WHERE id = ?
  `, [entry.date, entry.type, entry.category, entry.description, entry.amount, id]),
  deleteBookkeepingEntry: (id: number) => execute('DELETE FROM bookkeeping_entries WHERE id = ?', [id]),
  
  // Assets
  getAssets: () => query('SELECT * FROM assets ORDER BY name'),
  addAsset: (asset: any) => insert(`
    INSERT INTO assets (name, category, purchase_date, purchase_price, useful_life_years, maintenance_cost_yearly, current_value, condition, location, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    asset.name, asset.category, asset.purchase_date, asset.purchase_price, asset.useful_life_years,
    asset.maintenance_cost_yearly, asset.current_value, asset.condition, asset.location, asset.notes
  ]),
  updateAsset: (id: number, asset: any) => execute(`
    UPDATE assets SET 
      name = ?, category = ?, purchase_date = ?, purchase_price = ?, useful_life_years = ?,
      maintenance_cost_yearly = ?, current_value = ?, condition = ?, location = ?, notes = ?
    WHERE id = ?
  `, [
    asset.name, asset.category, asset.purchase_date, asset.purchase_price, asset.useful_life_years,
    asset.maintenance_cost_yearly, asset.current_value, asset.condition, asset.location, asset.notes, id
  ]),
  deleteAsset: (id: number) => execute('DELETE FROM assets WHERE id = ?', [id]),
  
  // Admin Settings
  getAdminSettings: () => querySingle('SELECT * FROM admin_settings WHERE id = 1'),
  updateAdminSettings: (settings: any) => execute(`
    UPDATE admin_settings SET 
      pin = ?, locked_menus = ?, hidden_menus = ?, menu_pins = ?, profile = ?, users = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `, [settings.pin, settings.locked_menus, settings.hidden_menus, settings.menu_pins, settings.profile, settings.users])
};