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