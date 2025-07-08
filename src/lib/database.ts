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


// Database API
export const dbAPI = {
  // Login
  login: async (pin: string) => {
    try {
      const user = querySingle('SELECT * FROM users WHERE pin = ?', [pin]);
      if (user) {
        return { success: true, role: user.role };
      }
      return { success: false };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  // Verify PIN
  verifyPin: async (pin: string) => {
    try {
      const settings = querySingle('SELECT pin FROM admin_settings WHERE id = 1');
      return settings?.pin === pin;
    } catch (error) {
      console.error('Verify PIN error:', error);
      throw error;
    }
  },

  // Verify menu PIN
  verifyMenuPin: async (menuId: string, pin: string) => {
    try {
      const settings = querySingle('SELECT menu_pins FROM admin_settings WHERE id = 1');
      if (!settings?.menu_pins) return false;
      
      const menuPins = JSON.parse(settings.menu_pins);
      return menuPins[menuId] === pin;
    } catch (error) {
      console.error('Verify menu PIN error:', error);
      throw error;
    }
  },

  // Get admin settings
  getAdminSettings: async () => {
    try {
      const settings = querySingle('SELECT * FROM admin_settings WHERE id = 1');
      if (!settings) return {};
      
      return {
        ...settings,
        lockedMenus: JSON.parse(settings.locked_menus || '[]'),
        hiddenMenus: JSON.parse(settings.hidden_menus || '[]'),
        menuPins: JSON.parse(settings.menu_pins || '{}'),
        profile: JSON.parse(settings.profile || '{}'),
        users: JSON.parse(settings.users || '[]')
      };
    } catch (error) {
      console.error('Get admin settings error:', error);
      throw error;
    }
  },

  // Update admin settings
  updateAdminSettings: async (settings: any) => {
    try {
      const lockedMenus = JSON.stringify(settings.lockedMenus || []);
      const hiddenMenus = JSON.stringify(settings.hiddenMenus || []);
      const menuPins = JSON.stringify(settings.menuPins || {});
      const profile = JSON.stringify(settings.profile || {});
      const users = JSON.stringify(settings.users || []);
      
      execute(`
        UPDATE admin_settings
        SET pin = ?,
            locked_menus = ?,
            hidden_menus = ?,
            menu_pins = ?,
            profile = ?,
            users = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, [settings.pin, lockedMenus, hiddenMenus, menuPins, profile, users]);
      
      return true;
    } catch (error) {
      console.error('Update admin settings error:', error);
      throw error;
    }
  },

  // Cities
  getCities: async () => {
    try {
      const cities = query(`
        SELECT c.*, COUNT(s.id) as store_count
        FROM cities c
        LEFT JOIN stores s ON c.id = s.city_id
        GROUP BY c.id
        ORDER BY c.name
      `);
      return cities;
    } catch (error) {
      console.error('Get cities error:', error);
      throw error;
    }
  },

  addCity: async (name: string) => {
    try {
      return insert('INSERT INTO cities (name) VALUES (?)', [name]);
    } catch (error) {
      console.error('Add city error:', error);
      throw error;
    }
  },

  updateCity: async (id: number, name: string) => {
    try {
      execute('UPDATE cities SET name = ? WHERE id = ?', [name, id]);
      return true;
    } catch (error) {
      console.error('Update city error:', error);
      throw error;
    }
  },

  deleteCity: async (id: number) => {
    try {
      execute('DELETE FROM cities WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete city error:', error);
      throw error;
    }
  },

  getCityStores: async (cityId: number) => {
    try {
      const stores = query('SELECT * FROM stores WHERE city_id = ? ORDER BY name', [cityId]);
      return stores;
    } catch (error) {
      console.error('Get city stores error:', error);
      throw error;
    }
  },

  // Price Areas
  getPriceAreas: async () => {
    try {
      const areas = query('SELECT * FROM price_areas ORDER BY name');
      return areas;
    } catch (error) {
      console.error('Get price areas error:', error);
      throw error;
    }
  },

  addPriceArea: async (name: string) => {
    try {
      return insert('INSERT INTO price_areas (name) VALUES (?)', [name]);
    } catch (error) {
      console.error('Add price area error:', error);
      throw error;
    }
  },

  updatePriceArea: async (id: number, name: string) => {
    try {
      execute('UPDATE price_areas SET name = ? WHERE id = ?', [name, id]);
      return true;
    } catch (error) {
      console.error('Update price area error:', error);
      throw error;
    }
  },

  deletePriceArea: async (id: number) => {
    try {
      execute('DELETE FROM price_areas WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete price area error:', error);
      throw error;
    }
  },

  // Stores
  getStores: async () => {
    try {
      const stores = query(`
        SELECT s.*, c.name as city_name
        FROM stores s
        JOIN cities c ON s.city_id = c.id
        ORDER BY s.name
      `);
      return stores;
    } catch (error) {
      console.error('Get stores error:', error);
      throw error;
    }
  },

  addStore: async (name: string, address: string, cityId: number, contacts: any) => {
    try {
      return insert(`
        INSERT INTO stores (
          name, address, city_id, 
          contact_billing_name, contact_billing_phone,
          contact_purchasing_name, contact_purchasing_phone,
          contact_store_name, contact_store_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, address, cityId,
        contacts.billing_name, contacts.billing_phone,
        contacts.purchasing_name, contacts.purchasing_phone,
        contacts.store_name, contacts.store_phone
      ]);
    } catch (error) {
      console.error('Add store error:', error);
      throw error;
    }
  },

  updateStore: async (id: number, name: string, address: string, cityId: number, contacts: any) => {
    try {
      execute(`
        UPDATE stores SET 
          name = ?, 
          address = ?, 
          city_id = ?,
          contact_billing_name = ?,
          contact_billing_phone = ?,
          contact_purchasing_name = ?,
          contact_purchasing_phone = ?,
          contact_store_name = ?,
          contact_store_phone = ?
        WHERE id = ?
      `, [
        name, address, cityId,
        contacts.billing_name, contacts.billing_phone,
        contacts.purchasing_name, contacts.purchasing_phone,
        contacts.store_name, contacts.store_phone,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update store error:', error);
      throw error;
    }
  },

  deleteStore: async (id: number) => {
    try {
      execute('DELETE FROM stores WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete store error:', error);
      throw error;
    }
  },

  // Products
  getProducts: async () => {
    try {
      // Get all products
      const products = query(`
        SELECT p.*, 
               CAST(p.stock / 12 AS INTEGER) as stock_dozen,
               p.stock % 12 as stock_pcs,
               h.final_selling_price as hpp_price
        FROM products p
        LEFT JOIN hpp h ON p.id = h.product_id
        ORDER BY p.name
      `);
      
      // Get area prices for each product
      for (const product of products) {
        const areaPrices = query(`
          SELECT pap.*, pa.name as area_name
          FROM product_area_prices pap
          JOIN price_areas pa ON pap.price_area_id = pa.id
          WHERE pap.product_id = ?
          ORDER BY pa.name
        `, [product.id]);
        
        product.area_prices = areaPrices;
        
        // For package products, get package items
        if (product.product_type === 'package') {
          const packageItems = query(`
            SELECT pi.*, p.name as product_name
            FROM package_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.package_id = ?
          `, [product.id]);
          
          product.package_items = packageItems;
        }
      }
      
      return products;
    } catch (error) {
      console.error('Get products error:', error);
      throw error;
    }
  },

  addProduct: async (
    name: string,
    packaging: string,
    size: string,
    type: string,
    productType: string,
    stockDozen: number,
    stockPcs: number,
    minimumStock: number,
    basePrice: number,
    areaPrices: any[],
    packageItems: any[]
  ) => {
    try {
      // Calculate total stock in pieces
      const totalStock = (stockDozen * 12) + stockPcs;
      
      // Insert product
      const productId = insert(`
        INSERT INTO products (
          name, packaging, size, type, product_type,
          stock, minimum_stock, base_price
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, packaging, size, type, productType,
        totalStock, minimumStock, basePrice
      ]);
      
      // Insert area prices
      for (const areaPrice of areaPrices) {
        if (areaPrice.price_area_id) {
          insert(`
            INSERT INTO product_area_prices (
              product_id, price_area_id, price
            ) VALUES (?, ?, ?)
          `, [
            productId, areaPrice.price_area_id, areaPrice.price
          ]);
        }
      }
      
      // For package products, insert package items
      if (productType === 'package') {
        for (const item of packageItems) {
          if (item.product_id && item.quantity > 0) {
            insert(`
              INSERT INTO package_items (
                package_id, product_id, quantity
              ) VALUES (?, ?, ?)
            `, [
              productId, item.product_id, item.quantity
            ]);
          }
        }
      }
      
      return productId;
    } catch (error) {
      console.error('Add product error:', error);
      throw error;
    }
  },

  updateProduct: async (
    id: number,
    name: string,
    packaging: string,
    size: string,
    type: string,
    productType: string,
    stockDozen: number,
    stockPcs: number,
    minimumStock: number,
    basePrice: number,
    areaPrices: any[],
    packageItems: any[]
  ) => {
    try {
      // Calculate total stock in pieces
      const totalStock = (stockDozen * 12) + stockPcs;
      
      // Update product
      execute(`
        UPDATE products SET 
          name = ?, 
          packaging = ?, 
          size = ?, 
          type = ?,
          product_type = ?,
          stock = ?,
          minimum_stock = ?,
          base_price = ?
        WHERE id = ?
      `, [
        name, packaging, size, type, productType,
        totalStock, minimumStock, basePrice, id
      ]);
      
      // Delete existing area prices
      execute('DELETE FROM product_area_prices WHERE product_id = ?', [id]);
      
      // Insert new area prices
      for (const areaPrice of areaPrices) {
        if (areaPrice.price_area_id) {
          insert(`
            INSERT INTO product_area_prices (
              product_id, price_area_id, price
            ) VALUES (?, ?, ?)
          `, [
            id, areaPrice.price_area_id, areaPrice.price
          ]);
        }
      }
      
      // For package products, update package items
      if (productType === 'package') {
        // Delete existing package items
        execute('DELETE FROM package_items WHERE package_id = ?', [id]);
        
        // Insert new package items
        for (const item of packageItems) {
          if (item.product_id && item.quantity > 0) {
            insert(`
              INSERT INTO package_items (
                package_id, product_id, quantity
              ) VALUES (?, ?, ?)
            `, [
              id, item.product_id, item.quantity
            ]);
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update product error:', error);
      throw error;
    }
  },

  deleteProduct: async (id: number) => {
    try {
      // Delete area prices
      execute('DELETE FROM product_area_prices WHERE product_id = ?', [id]);
      
      // Delete package items
      execute('DELETE FROM package_items WHERE package_id = ?', [id]);
      
      // Delete product
      execute('DELETE FROM products WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Delete product error:', error);
      throw error;
    }
  },

  updateProductStockByUnit: async (id: number, dozen: number, pcs: number, operation: 'add' | 'subtract') => {
    try {
      // Calculate total pieces to add/subtract
      const totalPieces = (dozen * 12) + pcs;
      
      if (operation === 'add') {
        // Add stock
        execute(`
          UPDATE products 
          SET stock = stock + ? 
          WHERE id = ?
        `, [totalPieces, id]);
      } else {
        // Subtract stock (ensure it doesn't go below 0)
        execute(`
          UPDATE products 
          SET stock = MAX(0, stock - ?) 
          WHERE id = ?
        `, [totalPieces, id]);
      }
      
      return true;
    } catch (error) {
      console.error('Update product stock error:', error);
      throw error;
    }
  },

  updatePackageProductStock: async (id: number, quantity: number, operation: 'add' | 'subtract') => {
    try {
      // For package products, we don't update the stock directly
      // Instead, we update the stock of the component products
      
      // Get package items
      const packageItems = query(`
        SELECT pi.product_id, pi.quantity
        FROM package_items pi
        WHERE pi.package_id = ?
      `, [id]);
      
      // Update stock for each component product
      for (const item of packageItems) {
        const totalPieces = item.quantity * quantity;
        
        if (operation === 'add') {
          // Add stock
          execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [totalPieces, item.product_id]);
        } else {
          // Subtract stock (ensure it doesn't go below 0)
          execute(`
            UPDATE products 
            SET stock = MAX(0, stock - ?) 
            WHERE id = ?
          `, [totalPieces, item.product_id]);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update package product stock error:', error);
      throw error;
    }
  },

  reduceProductStock: async (id: number, amount: number, reason: string, notes: string = '') => {
    try {
      // Reduce stock
      execute(`
        UPDATE products 
        SET stock = MAX(0, stock - ?) 
        WHERE id = ?
      `, [amount, id]);
      
      // Record reduction
      insert(`
        INSERT INTO stock_reductions (
          product_id, amount, reason, notes
        ) VALUES (?, ?, ?, ?)
      `, [id, amount, reason, notes]);
      
      return true;
    } catch (error) {
      console.error('Reduce product stock error:', error);
      throw error;
    }
  },

  getStockReductions: async (productId: number) => {
    try {
      const reductions = query(`
        SELECT * FROM stock_reductions
        WHERE product_id = ?
        ORDER BY date DESC
      `, [productId]);
      
      return reductions;
    } catch (error) {
      console.error('Get stock reductions error:', error);
      throw error;
    }
  },

  checkPackageStock: async (packageId: number, quantity: number) => {
    try {
      // Get package items
      const packageItems = query(`
        SELECT pi.product_id, pi.quantity, p.stock
        FROM package_items pi
        JOIN products p ON pi.product_id = p.id
        WHERE pi.package_id = ?
      `, [packageId]);
      
      // Check if all component products have enough stock
      for (const item of packageItems) {
        const requiredStock = item.quantity * quantity;
        if (item.stock < requiredStock) {
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Check package stock error:', error);
      throw error;
    }
  },

  // Store Deliveries
  getStoreDeliveries: async () => {
    try {
      // Get all store deliveries
      const deliveries = query(`
        SELECT sd.*, s.name as store_name, c.name as city_name
        FROM store_deliveries sd
        JOIN stores s ON sd.store_id = s.id
        JOIN cities c ON s.city_id = c.id
        ORDER BY sd.delivery_date DESC
      `);
      
      // Get items for each delivery
      for (const delivery of deliveries) {
        const items = query(`
          SELECT di.*, p.name as product_name
          FROM delivery_items di
          JOIN products p ON di.product_id = p.id
          WHERE di.delivery_type = 'store' AND di.delivery_id = ?
        `, [delivery.id]);
        
        delivery.items = items;
      }
      
      return deliveries;
    } catch (error) {
      console.error('Get store deliveries error:', error);
      throw error;
    }
  },

  addStoreDelivery: async (deliveryData: any, items: any[]) => {
    try {
      // Insert delivery
      const deliveryId = insert(`
        INSERT INTO store_deliveries (
          store_id, delivery_date, invoice_date, billing_date,
          status, price_markup, discount, shipping_cost,
          total_amount, notes, show_discount_in_print, show_shipping_in_print
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        deliveryData.store_id, deliveryData.delivery_date, deliveryData.invoice_date, deliveryData.billing_date,
        deliveryData.status, deliveryData.price_markup, deliveryData.discount, deliveryData.shipping_cost,
        deliveryData.total_amount, deliveryData.notes, 
        deliveryData.show_discount_in_print ? 1 : 0, 
        deliveryData.show_shipping_in_print ? 1 : 0
      ]);
      
      // Insert items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO delivery_items (
              delivery_type, delivery_id, product_id,
              quantity, unit_price, total_price,
              price_type, area_price_id
            ) VALUES ('store', ?, ?, ?, ?, ?, ?, ?)
          `, [
            deliveryId, item.product_id,
            item.quantity, item.unit_price, item.total_price,
            item.price_type, item.area_price_id || null
          ]);
          
          // Reduce product stock
          if (item.product_id) {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, reduce stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = MAX(0, stock - ?) 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, reduce stock directly
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return deliveryId;
    } catch (error) {
      console.error('Add store delivery error:', error);
      throw error;
    }
  },

  updateStoreDelivery: async (id: number, deliveryData: any, items: any[]) => {
    try {
      // Get existing items to restore stock
      const existingItems = query(`
        SELECT product_id, quantity
        FROM delivery_items
        WHERE delivery_type = 'store' AND delivery_id = ?
      `, [id]);
      
      // Restore stock for existing items
      for (const item of existingItems) {
        const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
        
        if (product?.product_type === 'package') {
          // For package products, restore stock of component products
          const packageItems = query(`
            SELECT product_id, quantity
            FROM package_items
            WHERE package_id = ?
          `, [item.product_id]);
          
          for (const packageItem of packageItems) {
            const totalPieces = packageItem.quantity * item.quantity;
            execute(`
              UPDATE products 
              SET stock = stock + ? 
              WHERE id = ?
            `, [totalPieces, packageItem.product_id]);
          }
        } else {
          // For single products, restore stock directly
          execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [item.quantity, item.product_id]);
        }
      }
      
      // Delete existing items
      execute('DELETE FROM delivery_items WHERE delivery_type = "store" AND delivery_id = ?', [id]);
      
      // Update delivery
      execute(`
        UPDATE store_deliveries SET 
          store_id = ?, 
          delivery_date = ?, 
          invoice_date = ?, 
          billing_date = ?,
          status = ?,
          price_markup = ?,
          discount = ?,
          shipping_cost = ?,
          total_amount = ?,
          notes = ?,
          show_discount_in_print = ?,
          show_shipping_in_print = ?
        WHERE id = ?
      `, [
        deliveryData.store_id, deliveryData.delivery_date, deliveryData.invoice_date, deliveryData.billing_date,
        deliveryData.status, deliveryData.price_markup, deliveryData.discount, deliveryData.shipping_cost,
        deliveryData.total_amount, deliveryData.notes, 
        deliveryData.show_discount_in_print ? 1 : 0, 
        deliveryData.show_shipping_in_print ? 1 : 0,
        id
      ]);
      
      // Insert new items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO delivery_items (
              delivery_type, delivery_id, product_id,
              quantity, unit_price, total_price,
              price_type, area_price_id
            ) VALUES ('store', ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, item.product_id,
            item.quantity, item.unit_price, item.total_price,
            item.price_type, item.area_price_id || null
          ]);
          
          // Reduce product stock
          if (item.product_id) {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, reduce stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = MAX(0, stock - ?) 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, reduce stock directly
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update store delivery error:', error);
      throw error;
    }
  },

  deleteStoreDelivery: async (id: number) => {
    try {
      // Get items to restore stock
      const items = query(`
        SELECT product_id, quantity
        FROM delivery_items
        WHERE delivery_type = 'store' AND delivery_id = ?
      `, [id]);
      
      // Restore stock for items
      for (const item of items) {
        const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
        
        if (product?.product_type === 'package') {
          // For package products, restore stock of component products
          const packageItems = query(`
            SELECT product_id, quantity
            FROM package_items
            WHERE package_id = ?
          `, [item.product_id]);
          
          for (const packageItem of packageItems) {
            const totalPieces = packageItem.quantity * item.quantity;
            execute(`
              UPDATE products 
              SET stock = stock + ? 
              WHERE id = ?
            `, [totalPieces, packageItem.product_id]);
          }
        } else {
          // For single products, restore stock directly
          execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [item.quantity, item.product_id]);
        }
      }
      
      // Delete items
      execute('DELETE FROM delivery_items WHERE delivery_type = "store" AND delivery_id = ?', [id]);
      
      // Delete delivery
      execute('DELETE FROM store_deliveries WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Delete store delivery error:', error);
      throw error;
    }
  },

  // Individual Deliveries
  getIndividualDeliveries: async () => {
    try {
      // Get all individual deliveries
      const deliveries = query(`
        SELECT *
        FROM individual_deliveries
        ORDER BY purchase_date DESC
      `);
      
      // Get items for each delivery
      for (const delivery of deliveries) {
        const items = query(`
          SELECT di.*, p.name as product_name
          FROM delivery_items di
          JOIN products p ON di.product_id = p.id
          WHERE di.delivery_type = 'individual' AND di.delivery_id = ?
        `, [delivery.id]);
        
        delivery.items = items;
      }
      
      return deliveries;
    } catch (error) {
      console.error('Get individual deliveries error:', error);
      throw error;
    }
  },

  addIndividualDelivery: async (deliveryData: any, items: any[]) => {
    try {
      // Insert delivery
      const deliveryId = insert(`
        INSERT INTO individual_deliveries (
          customer_name, customer_contact, purchase_date,
          status, price_markup, discount, shipping_cost,
          total_amount, notes, show_discount_in_print, show_shipping_in_print
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        deliveryData.customer_name, deliveryData.customer_contact, deliveryData.purchase_date,
        deliveryData.status, deliveryData.price_markup, deliveryData.discount, deliveryData.shipping_cost,
        deliveryData.total_amount, deliveryData.notes, 
        deliveryData.show_discount_in_print ? 1 : 0, 
        deliveryData.show_shipping_in_print ? 1 : 0
      ]);
      
      // Insert items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO delivery_items (
              delivery_type, delivery_id, product_id,
              quantity, unit_price, total_price,
              price_type, area_price_id
            ) VALUES ('individual', ?, ?, ?, ?, ?, ?, ?)
          `, [
            deliveryId, item.product_id,
            item.quantity, item.unit_price, item.total_price,
            item.price_type, item.area_price_id || null
          ]);
          
          // Reduce product stock
          if (item.product_id) {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, reduce stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = MAX(0, stock - ?) 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, reduce stock directly
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return deliveryId;
    } catch (error) {
      console.error('Add individual delivery error:', error);
      throw error;
    }
  },

  updateIndividualDelivery: async (id: number, deliveryData: any, items: any[]) => {
    try {
      // Get existing items to restore stock
      const existingItems = query(`
        SELECT product_id, quantity
        FROM delivery_items
        WHERE delivery_type = 'individual' AND delivery_id = ?
      `, [id]);
      
      // Restore stock for existing items
      for (const item of existingItems) {
        const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
        
        if (product?.product_type === 'package') {
          // For package products, restore stock of component products
          const packageItems = query(`
            SELECT product_id, quantity
            FROM package_items
            WHERE package_id = ?
          `, [item.product_id]);
          
          for (const packageItem of packageItems) {
            const totalPieces = packageItem.quantity * item.quantity;
            execute(`
              UPDATE products 
              SET stock = stock + ? 
              WHERE id = ?
            `, [totalPieces, packageItem.product_id]);
          }
        } else {
          // For single products, restore stock directly
          execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [item.quantity, item.product_id]);
        }
      }
      
      // Delete existing items
      execute('DELETE FROM delivery_items WHERE delivery_type = "individual" AND delivery_id = ?', [id]);
      
      // Update delivery
      execute(`
        UPDATE individual_deliveries SET 
          customer_name = ?, 
          customer_contact = ?, 
          purchase_date = ?,
          status = ?,
          price_markup = ?,
          discount = ?,
          shipping_cost = ?,
          total_amount = ?,
          notes = ?,
          show_discount_in_print = ?,
          show_shipping_in_print = ?
        WHERE id = ?
      `, [
        deliveryData.customer_name, deliveryData.customer_contact, deliveryData.purchase_date,
        deliveryData.status, deliveryData.price_markup, deliveryData.discount, deliveryData.shipping_cost,
        deliveryData.total_amount, deliveryData.notes, 
        deliveryData.show_discount_in_print ? 1 : 0, 
        deliveryData.show_shipping_in_print ? 1 : 0,
        id
      ]);
      
      // Insert new items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO delivery_items (
              delivery_type, delivery_id, product_id,
              quantity, unit_price, total_price,
              price_type, area_price_id
            ) VALUES ('individual', ?, ?, ?, ?, ?, ?, ?)
          `, [
            id, item.product_id,
            item.quantity, item.unit_price, item.total_price,
            item.price_type, item.area_price_id || null
          ]);
          
          // Reduce product stock
          if (item.product_id) {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, reduce stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = MAX(0, stock - ?) 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, reduce stock directly
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update individual delivery error:', error);
      throw error;
    }
  },

  deleteIndividualDelivery: async (id: number) => {
    try {
      // Get items to restore stock
      const items = query(`
        SELECT product_id, quantity
        FROM delivery_items
        WHERE delivery_type = 'individual' AND delivery_id = ?
      `, [id]);
      
      // Restore stock for items
      for (const item of items) {
        const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
        
        if (product?.product_type === 'package') {
          // For package products, restore stock of component products
          const packageItems = query(`
            SELECT product_id, quantity
            FROM package_items
            WHERE package_id = ?
          `, [item.product_id]);
          
          for (const packageItem of packageItems) {
            const totalPieces = packageItem.quantity * item.quantity;
            execute(`
              UPDATE products 
              SET stock = stock + ? 
              WHERE id = ?
            `, [totalPieces, packageItem.product_id]);
          }
        } else {
          // For single products, restore stock directly
          execute(`
            UPDATE products 
            SET stock = stock + ? 
            WHERE id = ?
          `, [item.quantity, item.product_id]);
        }
      }
      
      // Delete items
      execute('DELETE FROM delivery_items WHERE delivery_type = "individual" AND delivery_id = ?', [id]);
      
      // Delete delivery
      execute('DELETE FROM individual_deliveries WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Delete individual delivery error:', error);
      throw error;
    }
  },

  // Returns
  getReturns: async () => {
    try {
      // Get all returns
      const returns = query(`
        SELECT r.*
        FROM returns r
        ORDER BY r.return_date DESC
      `);
      
      // Get items and delivery info for each return
      for (const returnItem of returns) {
        // Get return items
        const items = query(`
          SELECT ri.*, p.name as product_name
          FROM return_items ri
          JOIN products p ON ri.product_id = p.id
          WHERE ri.return_id = ?
        `, [returnItem.id]);
        
        returnItem.items = items;
        
        // Get delivery info
        if (returnItem.delivery_type === 'store') {
          const delivery = querySingle(`
            SELECT sd.id, s.name as store_name, c.name as city_name
            FROM store_deliveries sd
            JOIN stores s ON sd.store_id = s.id
            JOIN cities c ON s.city_id = c.id
            WHERE sd.id = ?
          `, [returnItem.delivery_id]);
          
          if (delivery) {
            returnItem.delivery_info = delivery.store_name;
            returnItem.city_name = delivery.city_name;
          }
        } else {
          const delivery = querySingle(`
            SELECT id, customer_name
            FROM individual_deliveries
            WHERE id = ?
          `, [returnItem.delivery_id]);
          
          if (delivery) {
            returnItem.delivery_info = delivery.customer_name;
          }
        }
      }
      
      return returns;
    } catch (error) {
      console.error('Get returns error:', error);
      throw error;
    }
  },

  addReturn: async (returnData: any, items: any[]) => {
    try {
      // Insert return
      const returnId = insert(`
        INSERT INTO returns (
          delivery_type, delivery_id, return_date,
          reason, return_location, status, total_amount
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        returnData.delivery_type, returnData.delivery_id, returnData.return_date,
        returnData.reason, returnData.return_location, returnData.status, returnData.total_amount
      ]);
      
      // Insert items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO return_items (
              return_id, product_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            returnId, item.product_id, item.quantity, item.unit_price, item.total_price
          ]);
          
          // If return is completed, restore product stock
          if (returnData.status === 'completed') {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, restore stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = stock + ? 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, restore stock directly
              execute(`
                UPDATE products 
                SET stock = stock + ? 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return returnId;
    } catch (error) {
      console.error('Add return error:', error);
      throw error;
    }
  },

  updateReturn: async (id: number, returnData: any, items: any[]) => {
    try {
      // Get existing return to check status change
      const existingReturn = querySingle('SELECT status FROM returns WHERE id = ?', [id]);
      const statusChanged = existingReturn && existingReturn.status !== returnData.status;
      const completedNow = statusChanged && returnData.status === 'completed';
      const uncompletedNow = statusChanged && existingReturn.status === 'completed' && returnData.status !== 'completed';
      
      // Get existing items to handle stock changes
      const existingItems = query(`
        SELECT product_id, quantity
        FROM return_items
        WHERE return_id = ?
      `, [id]);
      
      // If status changed from completed to something else, reverse stock changes
      if (uncompletedNow) {
        for (const item of existingItems) {
          const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
          
          if (product?.product_type === 'package') {
            // For package products, reduce stock of component products
            const packageItems = query(`
              SELECT product_id, quantity
              FROM package_items
              WHERE package_id = ?
            `, [item.product_id]);
            
            for (const packageItem of packageItems) {
              const totalPieces = packageItem.quantity * item.quantity;
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [totalPieces, packageItem.product_id]);
            }
          } else {
            // For single products, reduce stock directly
            execute(`
              UPDATE products 
              SET stock = MAX(0, stock - ?) 
              WHERE id = ?
            `, [item.quantity, item.product_id]);
          }
        }
      }
      
      // Delete existing items
      execute('DELETE FROM return_items WHERE return_id = ?', [id]);
      
      // Update return
      execute(`
        UPDATE returns SET 
          delivery_type = ?, 
          delivery_id = ?, 
          return_date = ?,
          reason = ?,
          return_location = ?,
          status = ?,
          total_amount = ?
        WHERE id = ?
      `, [
        returnData.delivery_type, returnData.delivery_id, returnData.return_date,
        returnData.reason, returnData.return_location, returnData.status, returnData.total_amount,
        id
      ]);
      
      // Insert new items
      for (const item of items) {
        if (item.product_id && item.quantity > 0) {
          insert(`
            INSERT INTO return_items (
              return_id, product_id, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?)
          `, [
            id, item.product_id, item.quantity, item.unit_price, item.total_price
          ]);
          
          // If return is now completed, restore product stock
          if (completedNow) {
            const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
            
            if (product?.product_type === 'package') {
              // For package products, restore stock of component products
              const packageItems = query(`
                SELECT product_id, quantity
                FROM package_items
                WHERE package_id = ?
              `, [item.product_id]);
              
              for (const packageItem of packageItems) {
                const totalPieces = packageItem.quantity * item.quantity;
                execute(`
                  UPDATE products 
                  SET stock = stock + ? 
                  WHERE id = ?
                `, [totalPieces, packageItem.product_id]);
              }
            } else {
              // For single products, restore stock directly
              execute(`
                UPDATE products 
                SET stock = stock + ? 
                WHERE id = ?
              `, [item.quantity, item.product_id]);
            }
          }
        }
      }
      
      return true;
    } catch (error) {
      console.error('Update return error:', error);
      throw error;
    }
  },

  deleteReturn: async (id: number) => {
    try {
      // Check if return is completed
      const returnItem = querySingle('SELECT status FROM returns WHERE id = ?', [id]);
      const isCompleted = returnItem && returnItem.status === 'completed';
      
      // If completed, reverse stock changes
      if (isCompleted) {
        const items = query(`
          SELECT product_id, quantity
          FROM return_items
          WHERE return_id = ?
        `, [id]);
        
        for (const item of items) {
          const product = querySingle('SELECT product_type FROM products WHERE id = ?', [item.product_id]);
          
          if (product?.product_type === 'package') {
            // For package products, reduce stock of component products
            const packageItems = query(`
              SELECT product_id, quantity
              FROM package_items
              WHERE package_id = ?
            `, [item.product_id]);
            
            for (const packageItem of packageItems) {
              const totalPieces = packageItem.quantity * item.quantity;
              execute(`
                UPDATE products 
                SET stock = MAX(0, stock - ?) 
                WHERE id = ?
              `, [totalPieces, packageItem.product_id]);
            }
          } else {
            // For single products, reduce stock directly
            execute(`
              UPDATE products 
              SET stock = MAX(0, stock - ?) 
              WHERE id = ?
            `, [item.quantity, item.product_id]);
          }
        }
      }
      
      // Delete items
      execute('DELETE FROM return_items WHERE return_id = ?', [id]);
      
      // Delete return
      execute('DELETE FROM returns WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Delete return error:', error);
      throw error;
    }
  },

  // Employees
  getEmployees: async () => {
    try {
      const employees = query('SELECT * FROM employees ORDER BY name');
      return employees;
    } catch (error) {
      console.error('Get employees error:', error);
      throw error;
    }
  },

  addEmployee: async (
    name: string,
    position: string,
    baseSalary: number,
    baseOvertime: number,
    contact: string,
    address: string,
    hireDate: string,
    birthDate: string
  ) => {
    try {
      return insert(`
        INSERT INTO employees (
          name, position, base_salary, base_overtime,
          contact, address, hire_date, birth_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, position, baseSalary, baseOvertime,
        contact, address, hireDate, birthDate
      ]);
    } catch (error) {
      console.error('Add employee error:', error);
      throw error;
    }
  },

  updateEmployee: async (
    id: number,
    name: string,
    position: string,
    baseSalary: number,
    baseOvertime: number,
    contact: string,
    address: string,
    hireDate: string,
    birthDate: string,
    status: string
  ) => {
    try {
      execute(`
        UPDATE employees SET 
          name = ?, 
          position = ?, 
          base_salary = ?,
          base_overtime = ?,
          contact = ?,
          address = ?,
          hire_date = ?,
          birth_date = ?,
          status = ?
        WHERE id = ?
      `, [
        name, position, baseSalary, baseOvertime,
        contact, address, hireDate, birthDate, status,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update employee error:', error);
      throw error;
    }
  },

  deleteEmployee: async (id: number) => {
    try {
      execute('DELETE FROM employees WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete employee error:', error);
      throw error;
    }
  },

  getUpcomingBirthdays: async () => {
    try {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 7);
      
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const nextWeekMonth = nextWeek.getMonth() + 1;
      const nextWeekDay = nextWeek.getDate();
      
      let employees;
      
      if (nextWeekMonth !== todayMonth) {
        // Handle month boundary (e.g., December to January)
        employees = query(`
          SELECT * FROM employees
          WHERE 
            (
              (strftime('%m', birth_date) = ? AND strftime('%d', birth_date) >= ?)
              OR
              (strftime('%m', birth_date) = ? AND strftime('%d', birth_date) <= ?)
            )
            AND birth_date IS NOT NULL
          ORDER BY 
            strftime('%m', birth_date),
            strftime('%d', birth_date)
        `, [
          todayMonth.toString().padStart(2, '0'), todayDay.toString().padStart(2, '0'),
          nextWeekMonth.toString().padStart(2, '0'), nextWeekDay.toString().padStart(2, '0')
        ]);
      } else {
        // Same month
        employees = query(`
          SELECT * FROM employees
          WHERE 
            strftime('%m', birth_date) = ?
            AND strftime('%d', birth_date) >= ?
            AND strftime('%d', birth_date) <= ?
            AND birth_date IS NOT NULL
          ORDER BY 
            strftime('%d', birth_date)
        `, [
          todayMonth.toString().padStart(2, '0'),
          todayDay.toString().padStart(2, '0'),
          nextWeekDay.toString().padStart(2, '0')
        ]);
      }
      
      return employees;
    } catch (error) {
      console.error('Get upcoming birthdays error:', error);
      throw error;
    }
  },

  // Payrolls
  getPayrolls: async () => {
    try {
      const payrolls = query(`
        SELECT p.*, e.name as employee_name, e.position as employee_position
        FROM payrolls p
        JOIN employees e ON p.employee_id = e.id
        ORDER BY p.period DESC
      `);
      return payrolls;
    } catch (error) {
      console.error('Get payrolls error:', error);
      throw error;
    }
  },

  addPayroll: async (payrollData: any) => {
    try {
      return insert(`
        INSERT INTO payrolls (
          employee_id, period, attendance_days, overtime_days,
          base_salary, base_overtime, additional_amount, additional_description,
          additional_show_in_print, deduction_amount, deduction_description,
          deduction_show_in_print, total_salary
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        payrollData.employee_id, payrollData.period, payrollData.attendance_days, payrollData.overtime_days,
        payrollData.base_salary, payrollData.base_overtime, payrollData.additional_amount, payrollData.additional_description,
        payrollData.additional_show_in_print ? 1 : 0, payrollData.deduction_amount, payrollData.deduction_description,
        payrollData.deduction_show_in_print ? 1 : 0, payrollData.total_salary
      ]);
    } catch (error) {
      console.error('Add payroll error:', error);
      throw error;
    }
  },

  updatePayroll: async (id: number, payrollData: any) => {
    try {
      execute(`
        UPDATE payrolls SET 
          employee_id = ?, 
          period = ?, 
          attendance_days = ?,
          overtime_days = ?,
          base_salary = ?,
          base_overtime = ?,
          additional_amount = ?,
          additional_description = ?,
          additional_show_in_print = ?,
          deduction_amount = ?,
          deduction_description = ?,
          deduction_show_in_print = ?,
          total_salary = ?
        WHERE id = ?
      `, [
        payrollData.employee_id, payrollData.period, payrollData.attendance_days, payrollData.overtime_days,
        payrollData.base_salary, payrollData.base_overtime, payrollData.additional_amount, payrollData.additional_description,
        payrollData.additional_show_in_print ? 1 : 0, payrollData.deduction_amount, payrollData.deduction_description,
        payrollData.deduction_show_in_print ? 1 : 0, payrollData.total_salary,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update payroll error:', error);
      throw error;
    }
  },

  deletePayroll: async (id: number) => {
    try {
      execute('DELETE FROM payrolls WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete payroll error:', error);
      throw error;
    }
  },

  // Raw Materials
  getRawMaterials: async () => {
    try {
      const materials = query('SELECT * FROM raw_materials ORDER BY name');
      return materials;
    } catch (error) {
      console.error('Get raw materials error:', error);
      throw error;
    }
  },

  addRawMaterial: async (
    name: string,
    category: string,
    unit: string,
    stockQuantity: number,
    unitCost: number,
    supplier: string,
    minimumStock: number,
    expiryDate: string
  ) => {
    try {
      return insert(`
        INSERT INTO raw_materials (
          name, category, unit, stock_quantity,
          unit_cost, supplier, minimum_stock, expiry_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        name, category, unit, stockQuantity,
        unitCost, supplier, minimumStock, expiryDate
      ]);
    } catch (error) {
      console.error('Add raw material error:', error);
      throw error;
    }
  },

  updateRawMaterial: async (
    id: number,
    name: string,
    category: string,
    unit: string,
    stockQuantity: number,
    unitCost: number,
    supplier: string,
    minimumStock: number,
    expiryDate: string
  ) => {
    try {
      execute(`
        UPDATE raw_materials SET 
          name = ?, 
          category = ?, 
          unit = ?,
          stock_quantity = ?,
          unit_cost = ?,
          supplier = ?,
          minimum_stock = ?,
          expiry_date = ?
        WHERE id = ?
      `, [
        name, category, unit, stockQuantity,
        unitCost, supplier, minimumStock, expiryDate,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update raw material error:', error);
      throw error;
    }
  },

  deleteRawMaterial: async (id: number) => {
    try {
      execute('DELETE FROM raw_materials WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete raw material error:', error);
      throw error;
    }
  },

  // Factory Productions
  getFactoryProductions: async () => {
    try {
      const productions = query(`
        SELECT fp.*, e.name as employee_name, p.name as product_name
        FROM factory_productions fp
        JOIN employees e ON fp.employee_id = e.id
        JOIN products p ON fp.product_id = p.id
        ORDER BY fp.production_date DESC
      `);
      
      // Get materials for each production
      for (const production of productions) {
        const materials = query(`
          SELECT pm.*, rm.name as material_name, rm.unit as material_unit
          FROM production_materials pm
          JOIN raw_materials rm ON pm.raw_material_id = rm.id
          WHERE pm.production_id = ?
        `, [production.id]);
        
        production.materials = materials;
      }
      
      return productions;
    } catch (error) {
      console.error('Get factory productions error:', error);
      throw error;
    }
  },

  addFactoryProduction: async (productionData: any, materials: any[]) => {
    try {
      // Insert production
      const productionId = insert(`
        INSERT INTO factory_productions (
          employee_id, product_id, production_date,
          quantity_produced, notes
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        productionData.employee_id, productionData.product_id, productionData.production_date,
        productionData.quantity_produced, productionData.notes
      ]);
      
      // Insert materials
      for (const material of materials) {
        if (material.raw_material_id && material.quantity_used > 0) {
          insert(`
            INSERT INTO production_materials (
              production_id, raw_material_id, quantity_used
            ) VALUES (?, ?, ?)
          `, [
            productionId, material.raw_material_id, material.quantity_used
          ]);
          
          // Reduce raw material stock
          execute(`
            UPDATE raw_materials 
            SET stock_quantity = MAX(0, stock_quantity - ?) 
            WHERE id = ?
          `, [material.quantity_used, material.raw_material_id]);
        }
      }
      
      // Increase product stock
      execute(`
        UPDATE products 
        SET stock = stock + ? 
        WHERE id = ?
      `, [productionData.quantity_produced, productionData.product_id]);
      
      return productionId;
    } catch (error) {
      console.error('Add factory production error:', error);
      throw error;
    }
  },

  updateFactoryProduction: async (id: number, productionData: any, materials: any[]) => {
    try {
      // Get existing production
      const existingProduction = querySingle(`
        SELECT product_id, quantity_produced
        FROM factory_productions
        WHERE id = ?
      `, [id]);
      
      // Get existing materials
      const existingMaterials = query(`
        SELECT raw_material_id, quantity_used
        FROM production_materials
        WHERE production_id = ?
      `, [id]);
      
      // Restore product stock
      if (existingProduction) {
        execute(`
          UPDATE products 
          SET stock = MAX(0, stock - ?) 
          WHERE id = ?
        `, [existingProduction.quantity_produced, existingProduction.product_id]);
      }
      
      // Restore raw material stock
      for (const material of existingMaterials) {
        execute(`
          UPDATE raw_materials 
          SET stock_quantity = stock_quantity + ? 
          WHERE id = ?
        `, [material.quantity_used, material.raw_material_id]);
      }
      
      // Delete existing materials
      execute('DELETE FROM production_materials WHERE production_id = ?', [id]);
      
      // Update production
      execute(`
        UPDATE factory_productions SET 
          employee_id = ?, 
          product_id = ?, 
          production_date = ?,
          quantity_produced = ?,
          notes = ?
        WHERE id = ?
      `, [
        productionData.employee_id, productionData.product_id, productionData.production_date,
        productionData.quantity_produced, productionData.notes,
        id
      ]);
      
      // Insert new materials
      for (const material of materials) {
        if (material.raw_material_id && material.quantity_used > 0) {
          insert(`
            INSERT INTO production_materials (
              production_id, raw_material_id, quantity_used
            ) VALUES (?, ?, ?)
          `, [
            id, material.raw_material_id, material.quantity_used
          ]);
          
          // Reduce raw material stock
          execute(`
            UPDATE raw_materials 
            SET stock_quantity = MAX(0, stock_quantity - ?) 
            WHERE id = ?
          `, [material.quantity_used, material.raw_material_id]);
        }
      }
      
      // Increase product stock
      execute(`
        UPDATE products 
        SET stock = stock + ? 
        WHERE id = ?
      `, [productionData.quantity_produced, productionData.product_id]);
      
      return true;
    } catch (error) {
      console.error('Update factory production error:', error);
      throw error;
    }
  },

  deleteFactoryProduction: async (id: number) => {
    try {
      // Get production
      const production = querySingle(`
        SELECT product_id, quantity_produced
        FROM factory_productions
        WHERE id = ?
      `, [id]);
      
      // Get materials
      const materials = query(`
        SELECT raw_material_id, quantity_used
        FROM production_materials
        WHERE production_id = ?
      `, [id]);
      
      // Restore raw material stock
      for (const material of materials) {
        execute(`
          UPDATE raw_materials 
          SET stock_quantity = stock_quantity + ? 
          WHERE id = ?
        `, [material.quantity_used, material.raw_material_id]);
      }
      
      // Reduce product stock
      if (production) {
        execute(`
          UPDATE products 
          SET stock = MAX(0, stock - ?) 
          WHERE id = ?
        `, [production.quantity_produced, production.product_id]);
      }
      
      // Delete materials
      execute('DELETE FROM production_materials WHERE production_id = ?', [id]);
      
      // Delete production
      execute('DELETE FROM factory_productions WHERE id = ?', [id]);
      
      return true;
    } catch (error) {
      console.error('Delete factory production error:', error);
      throw error;
    }
  },

  // Product Recipes
  getProductRecipes: async (productId: number) => {
    try {
      const recipes = query(`
        SELECT pr.*, 
               rm.name as material_name, 
               rm.unit as material_unit,
               rm.stock_quantity as stock_available,
               rm.unit as original_unit,
               rm.unit_cost as material_cost
        FROM product_recipes pr
        JOIN raw_materials rm ON pr.raw_material_id = rm.id
        WHERE pr.product_id = ?
      `, [productId]);
      
      return recipes;
    } catch (error) {
      console.error('Get product recipes error:', error);
      throw error;
    }
  },

  saveProductRecipe: async (productId: number, recipeItems: any[]) => {
    try {
      // Delete existing recipe
      execute('DELETE FROM product_recipes WHERE product_id = ?', [productId]);
      
      // Insert new recipe items
      for (const item of recipeItems) {
        if (item.raw_material_id && item.recipe_quantity > 0) {
          insert(`
            INSERT INTO product_recipes (
              product_id, raw_material_id, quantity_needed
            ) VALUES (?, ?, ?)
          `, [
            productId, item.raw_material_id, item.recipe_quantity
          ]);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Save product recipe error:', error);
      throw error;
    }
  },

  // HPP (Harga Pokok Produksi)
  getHPPs: async () => {
    try {
      const hpps = query(`
        SELECT h.*, p.name as product_name
        FROM hpp h
        JOIN products p ON h.product_id = p.id
        ORDER BY p.name
      `);
      
      return hpps;
    } catch (error) {
      console.error('Get HPPs error:', error);
      throw error;
    }
  },

  addHPP: async (hppData: any) => {
    try {
      // Insert HPP
      const hppId = insert(`
        INSERT INTO hpp (
          product_id, material_cost, overhead_cost,
          target_profit_percentage, fee_channel_online,
          minimum_selling_price, suggested_selling_price,
          final_selling_price, online_channel_price,
          rounding_enabled
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        hppData.product_id, hppData.material_cost, hppData.overhead_cost,
        hppData.target_profit_percentage, hppData.fee_channel_online,
        hppData.minimum_selling_price, hppData.suggested_selling_price,
        hppData.final_selling_price, hppData.online_channel_price,
        hppData.rounding_enabled ? 1 : 0
      ]);
      
      // Update product HPP price
      execute(`
        UPDATE products 
        SET hpp_price = ? 
        WHERE id = ?
      `, [hppData.final_selling_price, hppData.product_id]);
      
      return hppId;
    } catch (error) {
      console.error('Add HPP error:', error);
      throw error;
    }
  },

  updateHPP: async (id: number, hppData: any) => {
    try {
      // Update HPP
      execute(`
        UPDATE hpp SET 
          product_id = ?, 
          material_cost = ?, 
          overhead_cost = ?,
          target_profit_percentage = ?,
          fee_channel_online = ?,
          minimum_selling_price = ?,
          suggested_selling_price = ?,
          final_selling_price = ?,
          online_channel_price = ?,
          rounding_enabled = ?
        WHERE id = ?
      `, [
        hppData.product_id, hppData.material_cost, hppData.overhead_cost,
        hppData.target_profit_percentage, hppData.fee_channel_online,
        hppData.minimum_selling_price, hppData.suggested_selling_price,
        hppData.final_selling_price, hppData.online_channel_price,
        hppData.rounding_enabled ? 1 : 0,
        id
      ]);
      
      // Update product HPP price
      execute(`
        UPDATE products 
        SET hpp_price = ? 
        WHERE id = ?
      `, [hppData.final_selling_price, hppData.product_id]);
      
      return true;
    } catch (error) {
      console.error('Update HPP error:', error);
      throw error;
    }
  },

  deleteHPP: async (id: number) => {
    try {
      // Get product ID
      const hpp = querySingle('SELECT product_id FROM hpp WHERE id = ?', [id]);
      
      // Delete HPP
      execute('DELETE FROM hpp WHERE id = ?', [id]);
      
      // Reset product HPP price
      if (hpp) {
        execute(`
          UPDATE products 
          SET hpp_price = NULL 
          WHERE id = ?
        `, [hpp.product_id]);
      }
      
      return true;
    } catch (error) {
      console.error('Delete HPP error:', error);
      throw error;
    }
  },

  // Bookkeeping
  getBookkeepingEntries: async () => {
    try {
      const entries = query(`
        SELECT *
        FROM bookkeeping_entries
        ORDER BY date DESC
      `);
      
      return entries;
    } catch (error) {
      console.error('Get bookkeeping entries error:', error);
      throw error;
    }
  },

  addBookkeepingEntry: async (
    date: string,
    type: string,
    category: string,
    description: string,
    amount: number
  ) => {
    try {
      return insert(`
        INSERT INTO bookkeeping_entries (
          date, type, category, description, amount
        ) VALUES (?, ?, ?, ?, ?)
      `, [
        date, type, category, description, amount
      ]);
    } catch (error) {
      console.error('Add bookkeeping entry error:', error);
      throw error;
    }
  },

  updateBookkeepingEntry: async (
    id: number,
    date: string,
    type: string,
    category: string,
    description: string,
    amount: number
  ) => {
    try {
      execute(`
        UPDATE bookkeeping_entries SET 
          date = ?, 
          type = ?, 
          category = ?,
          description = ?,
          amount = ?
        WHERE id = ?
      `, [
        date, type, category, description, amount,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update bookkeeping entry error:', error);
      throw error;
    }
  },

  deleteBookkeepingEntry: async (id: number) => {
    try {
      execute('DELETE FROM bookkeeping_entries WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete bookkeeping entry error:', error);
      throw error;
    }
  },

  getBookkeepingSummary: async () => {
    try {
      const totalIncome = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'income'
      `);
      
      const totalExpense = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'expense'
      `);
      
      const primerIncome = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'income' AND category = 'primer'
      `);
      
      const primerExpense = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'expense' AND category = 'primer'
      `);
      
      const sekunderIncome = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'income' AND category = 'sekunder'
      `);
      
      const sekunderExpense = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'expense' AND category = 'sekunder'
      `);
      
      const tersierIncome = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'income' AND category = 'tersier'
      `);
      
      const tersierExpense = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'expense' AND category = 'tersier'
      `);
      
      return {
        total_income: totalIncome?.total || 0,
        total_expense: totalExpense?.total || 0,
        net_profit: (totalIncome?.total || 0) - (totalExpense?.total || 0),
        primer: {
          income: primerIncome?.total || 0,
          expense: primerExpense?.total || 0
        },
        sekunder: {
          income: sekunderIncome?.total || 0,
          expense: sekunderExpense?.total || 0
        },
        tersier: {
          income: tersierIncome?.total || 0,
          expense: tersierExpense?.total || 0
        }
      };
    } catch (error) {
      console.error('Get bookkeeping summary error:', error);
      throw error;
    }
  },

  getBookkeepingReport: async (startDate: string, endDate: string) => {
    try {
      const entries = query(`
        SELECT *
        FROM bookkeeping_entries
        WHERE date >= ? AND date <= ?
        ORDER BY date
      `, [startDate, endDate]);
      
      const totalIncome = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'income' AND date >= ? AND date <= ?
      `, [startDate, endDate]);
      
      const totalExpense = querySingle(`
        SELECT SUM(amount) as total
        FROM bookkeeping_entries
        WHERE type = 'expense' AND date >= ? AND date <= ?
      `, [startDate, endDate]);
      
      return {
        entries,
        total_income: totalIncome?.total || 0,
        total_expense: totalExpense?.total || 0,
        net_profit: (totalIncome?.total || 0) - (totalExpense?.total || 0),
        period: {
          start: startDate,
          end: endDate
        }
      };
    } catch (error) {
      console.error('Get bookkeeping report error:', error);
      throw error;
    }
  },

  // Assets
  getAssets: async () => {
    try {
      const assets = query('SELECT * FROM assets ORDER BY purchase_date DESC');
      return assets;
    } catch (error) {
      console.error('Get assets error:', error);
      throw error;
    }
  },

  addAsset: async (assetData: any) => {
    try {
      return insert(`
        INSERT INTO assets (
          name, category, purchase_date, purchase_price,
          useful_life_years, maintenance_cost_yearly, current_value,
          condition, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assetData.name, assetData.category, assetData.purchase_date, assetData.purchase_price,
        assetData.useful_life_years, assetData.maintenance_cost_yearly, 
        assetData.current_value || assetData.purchase_price,
        assetData.condition, assetData.location, assetData.notes
      ]);
    } catch (error) {
      console.error('Add asset error:', error);
      throw error;
    }
  },

  updateAsset: async (id: number, assetData: any) => {
    try {
      execute(`
        UPDATE assets SET 
          name = ?, 
          category = ?, 
          purchase_date = ?,
          purchase_price = ?,
          useful_life_years = ?,
          maintenance_cost_yearly = ?,
          current_value = ?,
          condition = ?,
          location = ?,
          notes = ?
        WHERE id = ?
      `, [
        assetData.name, assetData.category, assetData.purchase_date, assetData.purchase_price,
        assetData.useful_life_years, assetData.maintenance_cost_yearly, 
        assetData.current_value || assetData.purchase_price,
        assetData.condition, assetData.location, assetData.notes,
        id
      ]);
      return true;
    } catch (error) {
      console.error('Update asset error:', error);
      throw error;
    }
  },

  deleteAsset: async (id: number) => {
    try {
      execute('DELETE FROM assets WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('Delete asset error:', error);
      throw error;
    }
  },

  // Dashboard Stats
  getDashboardStats: async () => {
    try {
      // Total deliveries
      const totalDeliveries = querySingle(`
        SELECT 
          (SELECT COUNT(*) FROM store_deliveries) +
          (SELECT COUNT(*) FROM individual_deliveries) as count
      `);
      
      // Total revenue
      const totalRevenue = querySingle(`
        SELECT 
          (SELECT SUM(total_amount) FROM store_deliveries WHERE status = 'completed') +
          (SELECT SUM(total_amount) FROM individual_deliveries WHERE status = 'completed') as total
      `);
      
      // Pending deliveries
      const pendingDeliveries = querySingle(`
        SELECT 
          (SELECT COUNT(*) FROM store_deliveries WHERE status = 'pending') +
          (SELECT COUNT(*) FROM individual_deliveries WHERE status = 'pending') as count
      `);
      
      // Completed deliveries
      const completedDeliveries = querySingle(`
        SELECT 
          (SELECT COUNT(*) FROM store_deliveries WHERE status = 'completed') +
          (SELECT COUNT(*) FROM individual_deliveries WHERE status = 'completed') as count
      `);
      
      // Total returns
      const totalReturns = querySingle(`
        SELECT COUNT(*) as count FROM returns
      `);
      
      // Low stock products
      const lowStockProducts = querySingle(`
        SELECT COUNT(*) as count 
        FROM products 
        WHERE stock <= minimum_stock AND stock > 0
      `);
      
      return {
        total_deliveries: totalDeliveries?.count || 0,
        total_revenue: totalRevenue?.total || 0,
        pending_deliveries: pendingDeliveries?.count || 0,
        completed_deliveries: completedDeliveries?.count || 0,
        total_returns: totalReturns?.count || 0,
        low_stock_products: lowStockProducts?.count || 0
      };
    } catch (error) {
      console.error('Get dashboard stats error:', error);
      throw error;
    }
  },

  // Backup and Restore
  downloadBackup: () => {
    return exportDatabase();
  },

  uploadBackup: async (file: File) => {
    return importDatabase(file);
  }
};

// Export db as an alias to dbAPI for backward compatibility
export { dbAPI as db };