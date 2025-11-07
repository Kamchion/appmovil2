import * as SQLite from 'expo-sqlite';

/**
 * Base de datos local SQLite para almacenamiento offline
 * Almacena productos, pedidos pendientes y configuración
 */

const DB_NAME = 'vendedor_offline.db';

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Inicializa la base de datos y crea las tablas necesarias
 */
export async function initDatabase(): Promise<void> {
  try {
    if (db) {
      console.log('✅ Base de datos ya inicializada');
      return;
    }
    
    db = await SQLite.openDatabaseAsync(DB_NAME);
    
    // Crear tabla de productos
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        sku TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        image TEXT,
        basePrice TEXT NOT NULL,
        price TEXT NOT NULL,
        stock INTEGER DEFAULT 0,
        minimumQuantity INTEGER DEFAULT 1,
        updatedAt TEXT NOT NULL,
        syncedAt TEXT NOT NULL
      );
    `);

    // Crear tabla de clientes
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        name TEXT,
        companyName TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        clientNumber TEXT,
        isActive INTEGER DEFAULT 1,
        syncedAt TEXT
      );
    `);

    // Crear tabla de pedidos pendientes
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS pending_orders (
        id TEXT PRIMARY KEY,
        clientId TEXT,
        customerNote TEXT,
        subtotal TEXT NOT NULL,
        tax TEXT NOT NULL,
        total TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
    `);

    // Crear tabla de items de pedidos pendientes
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS pending_order_items (
        id TEXT PRIMARY KEY,
        orderId TEXT NOT NULL,
        productId TEXT NOT NULL,
        productName TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        pricePerUnit TEXT NOT NULL,
        FOREIGN KEY (orderId) REFERENCES pending_orders(id) ON DELETE CASCADE
      );
    `);

    // Crear tabla de configuración
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS config (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Crear índices para mejorar rendimiento
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);');
    await db.runAsync('CREATE INDEX IF NOT EXISTS idx_pending_orders_synced ON pending_orders(synced);');

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar base de datos:', error);
    throw error;
  }
}

/**
 * Obtiene la instancia de la base de datos
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    throw new Error('Base de datos no inicializada. Llama a initDatabase() primero.');
  }
  return db;
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('✅ Base de datos cerrada');
  }
}

/**
 * Limpia toda la base de datos (útil para desarrollo)
 */
export async function clearDatabase(): Promise<void> {
  const database = getDatabase();
  
    await database.execAsync(`
    DELETE FROM pending_order_items;
    DELETE FROM pending_orders;
    DELETE FROM products;
    DELETE FROM clients;
    DELETE FROM config;
  `);
  
  console.log('✅ Base de datos limpiada');
}
