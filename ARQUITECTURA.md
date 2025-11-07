# Arquitectura del Proyecto - App Móvil de Vendedores

## 📋 Resumen General

**Nombre:** IMPORKAM - App de Vendedores  
**Tecnología:** React Native + Expo  
**Base de datos local:** SQLite (expo-sqlite)  
**Backend:** Railway (tRPC + Express)  
**Versión actual:** 1.2.1

---

## 🏗️ Estructura del Proyecto

```
vendedor-app/
├── App.tsx                    # Punto de entrada principal
├── app.json                   # Configuración de Expo
├── eas.json                   # Configuración de EAS Build
├── package.json               # Dependencias del proyecto
│
├── assets/                    # Recursos estáticos
│   ├── icon.png              # Icono de la app
│   ├── splash-icon.png       # Splash screen
│   └── adaptive-icon.png     # Icono adaptativo (Android)
│
└── src/
    ├── screens/              # Pantallas de la aplicación
    │   ├── LoginScreen.tsx
    │   ├── CatalogScreen.tsx
    │   ├── ProductDetailScreen.tsx
    │   ├── CartScreen.tsx
    │   ├── CheckoutScreen.tsx
    │   └── OrdersScreen.tsx
    │
    ├── services/             # Servicios y lógica de negocio
    │   ├── api.ts           # Cliente API (comunicación con backend)
    │   ├── sync.ts          # Sincronización de datos
    │   ├── cart.ts          # Gestión del carrito
    │   └── imageCache.ts    # Caché de imágenes
    │
    ├── database/            # Base de datos SQLite
    │   └── db.ts           # Esquema y operaciones de BD
    │
    └── types/              # Definiciones de tipos TypeScript
        └── index.ts        # Tipos compartidos
```

---

## 🔑 Archivos Clave - Navegación y Login

### **1. App.tsx** - Punto de Entrada y Navegación

**Ubicación:** `/vendedor-app/App.tsx`

**Responsabilidades:**
- Inicialización de la base de datos SQLite
- Configuración del Stack Navigator (React Navigation)
- Gestión del estado de autenticación
- Definición de rutas de la aplicación

**Flujo de navegación:**
```
Login (si no está autenticado)
  ↓
Catalog (pantalla principal)
  ↓
ProductDetail → Cart → Checkout → Orders
```

**Código clave:**
```typescript
// Inicialización de BD al montar
useEffect(() => {
  initDatabase();
}, []);

// Stack Navigator
<Stack.Navigator initialRouteName="Login">
  <Stack.Screen name="Login" component={LoginScreen} />
  <Stack.Screen name="Catalog" component={CatalogScreen} />
  <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
  <Stack.Screen name="Cart" component={CartScreen} />
  <Stack.Screen name="Checkout" component={CheckoutScreen} />
  <Stack.Screen name="Orders" component={OrdersScreen} />
</Stack.Navigator>
```

**Dependencias:**
- `@react-navigation/native` - Navegación
- `@react-navigation/native-stack` - Stack Navigator
- `expo-sqlite` - Base de datos local

---

### **2. LoginScreen.tsx** - Autenticación

**Ubicación:** `/vendedor-app/src/screens/LoginScreen.tsx`

**Responsabilidades:**
- Interfaz de login con usuario/contraseña
- Autenticación online contra el backend
- Autenticación offline con credenciales guardadas
- Sincronización inicial de datos
- Almacenamiento de token JWT y datos del usuario

**Flujo de autenticación:**

```
Usuario ingresa credenciales
  ↓
¿Hay conexión?
  ↓
SÍ → loginOnline()
  ↓
  ├─ POST /api/trpc/vendorAuth.login
  ↓
  ├─ Recibe token JWT + datos del usuario
  ↓
  ├─ Guarda en AsyncStorage:
  │    - userToken
  │    - userData
  │    - savedUsername
  │    - savedPassword
  ↓
  ├─ Sincroniza catálogo y clientes
  ↓
  └─ Navega a Catalog
  
NO → loginOffline()
  ↓
  ├─ Lee credenciales de AsyncStorage
  ↓
  ├─ Compara usuario/contraseña
  ↓
  └─ Si coinciden → Navega a Catalog
```

**Funciones principales:**

```typescript
// Login online (con conexión)
const loginOnline = async () => {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      json: { username, password }
    })
  });
  
  const { token, user } = result;
  
  // Guardar en AsyncStorage
  await AsyncStorage.setItem('userToken', token);
  await AsyncStorage.setItem('userData', JSON.stringify(user));
  await AsyncStorage.setItem('savedUsername', username);
  await AsyncStorage.setItem('savedPassword', password);
  
  // Sincronizar datos
  await syncCatalog();
  
  // Navegar
  navigation.replace('Catalog');
};

// Login offline (sin conexión)
const loginOffline = async () => {
  const savedUsername = await AsyncStorage.getItem('savedUsername');
  const savedPassword = await AsyncStorage.getItem('savedPassword');
  
  if (username === savedUsername && password === savedPassword) {
    navigation.replace('Catalog');
  } else {
    Alert.alert('Error', 'Credenciales incorrectas');
  }
};
```

**AsyncStorage - Datos guardados:**
- `userToken` - Token JWT para autenticación
- `userData` - Datos del vendedor (id, username, name, email, etc.)
- `savedUsername` - Usuario para login offline
- `savedPassword` - Contraseña para login offline

**Estados UI:**
- `loading` - Muestra indicador de carga
- `username` - Input de usuario
- `password` - Input de contraseña

---

### **3. api.ts** - Cliente API

**Ubicación:** `/vendedor-app/src/services/api.ts`

**Responsabilidades:**
- Comunicación con el backend de Railway
- Gestión de headers y autenticación
- Funciones para endpoints específicos

**Configuración:**
```typescript
const API_BASE_URL = 'https://manus-store-production.up.railway.app';

// Helper para obtener token
export const getAuthToken = async (): Promise<string | null> => {
  return await AsyncStorage.getItem('userToken');
};

// Helper para obtener datos del usuario
export const getUserData = async (): Promise<any | null> => {
  const data = await AsyncStorage.getItem('userData');
  return data ? JSON.parse(data) : null;
};
```

**Funciones principales:**

```typescript
// Login de vendedor
export const loginVendor = async (username: string, password: string) => {
  const response = await fetch(`${API_BASE_URL}/api/trpc/vendorAuth.login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ json: { username, password } })
  });
  return response.json();
};

// Obtener clientes asignados
export const getAssignedClients = async () => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/trpc/sync.getClients`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.json();
};

// Crear pedido
export const createOrder = async (orderData: any) => {
  const token = await getAuthToken();
  const response = await fetch(`${API_BASE_URL}/api/trpc/sync.createOrder`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ json: orderData })
  });
  return response.json();
};
```

---

### **4. sync.ts** - Sincronización de Datos

**Ubicación:** `/vendedor-app/src/services/sync.ts`

**Responsabilidades:**
- Descargar catálogo de productos desde el backend
- Descargar clientes asignados al vendedor
- Guardar datos en SQLite local
- Sincronizar pedidos pendientes

**Funciones principales:**

```typescript
// Sincronizar catálogo completo
export const syncCatalog = async () => {
  try {
    // 1. Obtener productos del backend
    const response = await fetch(`${API_BASE_URL}/api/trpc/sync.getCatalog`);
    const { result } = await response.json();
    const products = result.data.json;
    
    // 2. Limpiar tabla local
    const db = await SQLite.openDatabaseAsync('vendedor.db');
    await db.runAsync('DELETE FROM products');
    
    // 3. Insertar productos
    for (const product of products) {
      await db.runAsync(
        `INSERT INTO products (sku, name, description, price, stock, image, category)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [product.sku, product.name, product.description, 
         product.price, product.stock, product.image, product.category]
      );
    }
    
    // 4. Descargar imágenes
    await cacheProductImages(products);
    
    console.log(`✅ ${products.length} productos sincronizados`);
  } catch (error) {
    console.error('Error sincronizando catálogo:', error);
    throw error;
  }
};

// Sincronizar clientes asignados
export const syncClients = async () => {
  const clients = await getAssignedClients();
  const db = await SQLite.openDatabaseAsync('vendedor.db');
  
  await db.runAsync('DELETE FROM clients');
  
  for (const client of clients) {
    await db.runAsync(
      `INSERT INTO clients (id, name, email, phone, address)
       VALUES (?, ?, ?, ?, ?)`,
      [client.id, client.name, client.email, client.phone, client.address]
    );
  }
};

// Sincronizar pedidos pendientes
export const syncPendingOrders = async () => {
  const db = await SQLite.openDatabaseAsync('vendedor.db');
  const pendingOrders = await db.getAllAsync(
    'SELECT * FROM orders WHERE synced = 0'
  );
  
  for (const order of pendingOrders) {
    try {
      await createOrder(order);
      await db.runAsync(
        'UPDATE orders SET synced = 1 WHERE id = ?',
        [order.id]
      );
    } catch (error) {
      console.error('Error sincronizando pedido:', error);
    }
  }
};
```

---

### **5. db.ts** - Base de Datos SQLite

**Ubicación:** `/vendedor-app/src/database/db.ts`

**Responsabilidades:**
- Crear y gestionar esquema de base de datos
- Operaciones CRUD sobre tablas locales
- Persistencia de datos offline

**Esquema de tablas:**

```sql
-- Productos del catálogo
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price REAL NOT NULL,
  stock INTEGER DEFAULT 0,
  image TEXT,
  category TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Clientes asignados al vendedor
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  synced_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pedidos (online y offline)
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_id INTEGER NOT NULL,
  vendor_id INTEGER NOT NULL,
  items TEXT NOT NULL,  -- JSON string
  total REAL NOT NULL,
  status TEXT DEFAULT 'pending',
  synced INTEGER DEFAULT 0,  -- 0 = pendiente, 1 = sincronizado
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES clients(id)
);

-- Carrito de compras (temporal)
CREATE TABLE IF NOT EXISTS cart (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_sku TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (product_sku) REFERENCES products(sku)
);
```

**Función de inicialización:**

```typescript
export const initDatabase = async () => {
  try {
    const db = await SQLite.openDatabaseAsync('vendedor.db');
    
    // Crear tablas
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS products (...);
      CREATE TABLE IF NOT EXISTS clients (...);
      CREATE TABLE IF NOT EXISTS orders (...);
      CREATE TABLE IF NOT EXISTS cart (...);
    `);
    
    console.log('✅ Base de datos inicializada');
  } catch (error) {
    console.error('Error inicializando BD:', error);
  }
};
```

---

## 🔐 Sistema de Autenticación

### **Backend (Railway)**

**Endpoint:** `POST /api/trpc/vendorAuth.login`

**Input:**
```json
{
  "json": {
    "username": "vendedor1",
    "password": "123456"
  }
}
```

**Output (éxito):**
```json
{
  "result": {
    "data": {
      "json": {
        "success": true,
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "user": {
          "id": 123,
          "username": "vendedor1",
          "name": "Juan Pérez",
          "email": "juan@example.com",
          "role": "vendedor",
          "isActive": 1,
          "status": "active"
        }
      }
    }
  }
}
```

**Validaciones:**
1. ✅ Usuario existe en la base de datos
2. ✅ Contraseña es correcta (bcrypt o texto plano)
3. ✅ Usuario tiene rol "vendedor"
4. ✅ Usuario está activo (`isActive = 1`)
5. ✅ Usuario no está congelado (`status != "frozen"`)

**Token JWT:**
- Algoritmo: HS256
- Expiración: 30 días
- Payload: `{ userId, username, role }`
- Secret: `JWT_SECRET` (variable de entorno)

---

## 📱 Flujo de Usuario Completo

### **1. Primera vez (con conexión)**

```
1. Usuario abre la app
   ↓
2. Ve LoginScreen
   ↓
3. Ingresa usuario y contraseña
   ↓
4. App valida contra Railway
   ↓
5. Recibe token JWT
   ↓
6. Guarda token y credenciales en AsyncStorage
   ↓
7. Sincroniza catálogo (productos + imágenes)
   ↓
8. Sincroniza clientes asignados
   ↓
9. Navega a CatalogScreen
   ↓
10. Usuario puede trabajar offline
```

### **2. Usos posteriores (sin conexión)**

```
1. Usuario abre la app
   ↓
2. Ve LoginScreen
   ↓
3. Ingresa usuario y contraseña
   ↓
4. App valida contra AsyncStorage (offline)
   ↓
5. Si coinciden → Navega a CatalogScreen
   ↓
6. Usuario trabaja con datos locales
   ↓
7. Pedidos se guardan en SQLite (synced=0)
   ↓
8. Cuando hay conexión → Sincroniza pedidos pendientes
```

---

## 🔄 Sincronización de Datos

### **Estrategia:**
- **Pull:** Descargar datos del servidor al dispositivo
- **Push:** Enviar pedidos del dispositivo al servidor
- **Offline-first:** Priorizar funcionamiento sin conexión

### **Datos sincronizados:**

| Tipo | Dirección | Frecuencia | Tabla Local |
|------|-----------|------------|-------------|
| Catálogo de productos | Backend → App | Al login | `products` |
| Imágenes de productos | Backend → App | Al login | FileSystem |
| Clientes asignados | Backend → App | Al login | `clients` |
| Pedidos nuevos | App → Backend | Al crear + periódica | `orders` |

### **Manejo de conflictos:**
- **Productos:** Siempre se sobrescriben con datos del servidor
- **Pedidos:** Se envían al servidor, nunca se eliminan localmente hasta confirmar

---

## 📦 Dependencias Principales

```json
{
  "dependencies": {
    "react-native": "0.76.1",
    "expo": "~52.0.11",
    "expo-sqlite": "~15.0.2",
    "@react-navigation/native": "^6.1.18",
    "@react-navigation/native-stack": "^6.11.0",
    "@react-native-async-storage/async-storage": "^2.0.0",
    "expo-file-system": "~18.0.4",
    "expo-image": "~2.0.3"
  }
}
```

---

## 🚀 Build y Deploy

**Plataforma:** EAS Build (Expo Application Services)

**Comando:** `npx eas-cli build --platform android --profile production`

**Configuración (eas.json):**
```json
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

**Output:** APK descargable desde Expo

---

## 🐛 Problemas Conocidos

### **1. Login no funciona en la app**
**Causa:** Contraseñas en la BD pueden estar hasheadas con bcrypt  
**Solución temporal:** Validación con fallback a texto plano  
**Solución permanente:** Usar bcrypt.compare() en el backend

### **2. Sincronización lenta**
**Causa:** Descarga de imágenes de productos  
**Solución:** Implementar descarga progresiva o lazy loading

### **3. Base de datos no se inicializa**
**Causa:** Uso de `execAsync()` en lugar de `runAsync()`  
**Solución:** Usar `runAsync()` para ejecutar SQL

---

## 📝 Próximas Mejoras

1. **Seguridad:**
   - Implementar refresh tokens
   - Encriptar credenciales en AsyncStorage
   - Usar bcrypt en todas las validaciones

2. **Sincronización:**
   - Sincronización en segundo plano
   - Indicador de estado de sincronización
   - Retry automático de pedidos fallidos

3. **UX:**
   - Splash screen personalizado
   - Animaciones de transición
   - Modo oscuro

4. **Funcionalidad:**
   - Búsqueda de productos
   - Filtros por categoría
   - Historial de pedidos
   - Notificaciones push

---

## 📞 Contacto y Soporte

**Desarrollador:** Manus AI  
**Cliente:** IMPORKAM  
**Versión:** 1.2.1  
**Fecha:** Noviembre 2025
