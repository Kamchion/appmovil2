# App de Vendedores IMPORKAM - Offline First

Aplicación móvil Android para vendedores de ruta con funcionalidad offline completa.

## 🚀 Características

### ✅ Funcionalidad Offline
- Catálogo de productos almacenado localmente
- Creación de pedidos sin conexión
- Sincronización automática al detectar internet
- Imágenes cacheadas en el dispositivo

### ✅ Sincronización
- Descarga automática del catálogo
- Subida de pedidos pendientes
- Sincronización incremental (solo cambios)
- Indicadores de estado online/offline

### ✅ Base de Datos Local
- SQLite para almacenamiento persistente
- Productos, pedidos y configuración
- Optimizada para rendimiento

## 📦 Tecnologías

- **React Native** con Expo
- **TypeScript** para type safety
- **SQLite** para base de datos local
- **AsyncStorage** para configuración
- **NetInfo** para detección de conexión
- **FileSystem** para caché de imágenes

## 🛠️ Instalación

```bash
# Instalar dependencias
cd vendedor-app
npm install

# Iniciar en desarrollo
npm start

# Compilar para Android
npm run android
```

## 📱 Estructura del Proyecto

```
src/
├── screens/          # Pantallas de la app
│   ├── LoginScreen.tsx
│   └── CatalogScreen.tsx
├── services/         # Servicios de API y sync
│   ├── api.ts
│   └── sync.ts
├── database/         # Configuración de SQLite
│   └── db.ts
├── types/            # Tipos TypeScript
│   └── index.ts
└── utils/            # Utilidades
```

## 🔄 Flujo de Sincronización

### 1. Primera vez (Descarga completa)
```
Login → Descargar catálogo completo → Guardar en SQLite → Listo para usar offline
```

### 2. Sincronizaciones posteriores (Incremental)
```
Detectar conexión → Subir pedidos pendientes → Descargar solo cambios → Actualizar local
```

### 3. Modo Offline
```
Ver catálogo local → Crear pedidos → Guardar en cola → Esperar conexión
```

## 📊 Base de Datos Local

### Tablas

**products**
- Catálogo completo de productos
- Precios según rol del vendedor
- Stock y cantidades mínimas

**pending_orders**
- Pedidos creados offline
- Estado de sincronización
- Información del cliente

**pending_order_items**
- Items de cada pedido
- Cantidades y precios
- Relación con productos

**config**
- Configuración de la app
- Timestamp de última sync
- Preferencias del usuario

## 🌐 API Endpoints

La app se conecta a:
```
https://manus-store-production.up.railway.app/api/trpc
```

### Endpoints utilizados:
- `sync.getCatalog` - Descarga catálogo completo
- `sync.uploadOrders` - Sube pedidos offline
- `sync.getChanges` - Obtiene cambios incrementales
- `sync.getStatus` - Verifica estado de sync

## 🔐 Autenticación

- Login con usuario/email y contraseña
- Token de sesión almacenado localmente
- Sesión persistente entre reinicios

## ✅ Funcionalidades Implementadas

- [x] Pantalla de login con autenticación
- [x] Catálogo de productos offline
- [x] Pantalla de detalle de producto
- [x] Carrito de compras funcional
- [x] Creación de pedidos offline
- [x] Historial de pedidos
- [x] Sincronización automática
- [x] Caché de imágenes
- [x] Detección de conexión
- [x] Base de datos SQLite
- [x] Navegación con tabs

## 📝 Próximas Mejoras

- [ ] Búsqueda y filtros en catálogo
- [ ] Notificaciones push
- [ ] Reportes de ventas
- [ ] Modo oscuro
- [ ] Exportar pedidos a PDF
- [ ] Escaneo de códigos de barras

## 🐛 Debugging

```bash
# Ver logs en tiempo real
npx expo start --android

# Limpiar caché
npx expo start --clear

# Ver logs de SQLite
# Agregar console.log en database/db.ts
```

## 📦 Compilar APK

```bash
# Compilar APK de desarrollo
eas build --platform android --profile development

# Compilar APK de producción
eas build --platform android --profile production
```

## 👥 Soporte

Para problemas o preguntas, contacta al equipo de desarrollo.
