# 🔍 Análisis Profundo: Backend Web ↔️ App Móvil

## 📋 Resumen Ejecutivo

He realizado un análisis completo del código del backend (`manus-store`) y la app móvil (`vendedor-app`) para identificar las discrepancias que causaban los errores de sincronización.

---

## ❌ Problemas Encontrados

### 1. Endpoint Incorrecto para Clientes

**Problema:**
- La app móvil llamaba a `sync.getAssignedClients`
- El backend solo tiene `sync.getClients`

**Ubicación en código:**
- Backend: `/home/ubuntu/manus-store/server/sync-router.ts` línea 150
- App móvil: `/home/ubuntu/vendedor-app/src/services/api.ts` línea 336

**Evidencia del backend:**
```typescript
// sync-router.ts línea 150
getClients: protectedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    // ...
    const clients = await db
      .select({...})
      .from(users)
      .where(
        and(
          eq(users.role, "cliente"),
          eq(users.isActive, 1),
          eq(users.assignedVendorId, ctx.user.id) // ✅ Filtra por vendedor
        )
      );
    
    return {
      success: true,
      clients: clients.map((c) => ({
        ...c,
        priceType: c.priceType || 'ciudad',
      })),
    };
  }),
```

**Solución aplicada:**
```typescript
// Antes (INCORRECTO):
const response = await fetch(`${TRPC_BASE_URL}/sync.getAssignedClients?batch=1`, {

// Después (CORRECTO):
const response = await fetch(`${TRPC_BASE_URL}/sync.getClients?batch=1`, {
```

---

### 2. Endpoint de Historial No Existe

**Problema:**
- La app móvil intentaba llamar a `sync.getOrderHistory`
- Este endpoint **NO EXISTE** en el backend

**Endpoints disponibles en el backend:**
```typescript
export const syncRouter = router({
  getCatalog: protectedProcedure,      // ✅ Existe
  getChanges: protectedProcedure,      // ✅ Existe
  getClients: protectedProcedure,      // ✅ Existe
  uploadOrders: protectedProcedure,    // ✅ Existe
  getStatus: protectedProcedure,       // ✅ Existe
  // getOrderHistory: NO EXISTE ❌
});
```

**Solución aplicada:**
- Comentado el código de sincronización de historial
- Agregado TODO para implementar en el backend

```typescript
// Sincronizar historial de pedidos
// TODO: Implementar endpoint getOrderHistory en el backend
/*
onProgress?.('Sincronizando historial de pedidos...');
try {
  const historyResponse = await getOrderHistory();
  // ...
} catch (historyError) {
  console.warn('⚠️ Error al sincronizar historial:', historyError);
}
*/
```

---

## ✅ Correcciones Aplicadas

### 1. Endpoint de Clientes Corregido

**Archivo:** `src/services/api.ts`

**Cambios:**
- Línea 336: `sync.getAssignedClients` → `sync.getClients`
- Línea 346: Logs de error actualizados

### 2. Sincronización de Historial Deshabilitada

**Archivo:** `src/services/sync.ts`

**Cambios:**
- Líneas 192-251: Código comentado
- Agregado TODO para futura implementación

### 3. Botón de Sincronización

**Estado:** ✅ Ya existía en el Dashboard

**Ubicación:** `src/screens/DashboardHomeScreen.tsx`

**Características:**
- Botón visible en la barra superior
- Muestra estado online/offline
- Indicador de progreso durante sincronización
- Mensajes de estado en tiempo real
- Alertas de éxito/error

---

## 📊 Formato de Respuestas del Backend

### getCatalog

**Request:**
```
GET /api/trpc/sync.getCatalog?batch=1
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "result": {
      "data": {
        "json": {
          "success": true,
          "timestamp": "2025-11-08T...",
          "products": [
            {
              "id": "...",
              "sku": "...",
              "name": "...",
              "description": "...",
              "category": "...",
              "image": "https://...",
              "basePrice": "100.00",
              "price": "100.00",
              "stock": 50,
              "isActive": true,
              "minQuantity": 1,
              "minimumQuantity": 1,
              ...
            }
          ]
        }
      }
    }
  }
]
```

### getClients

**Request:**
```
GET /api/trpc/sync.getClients?batch=1
Authorization: Bearer {token}
```

**Response:**
```json
[
  {
    "result": {
      "data": {
        "json": {
          "success": true,
          "clients": [
            {
              "id": "...",
              "name": "...",
              "email": "...",
              "role": "cliente",
              "companyName": "...",
              "phone": "...",
              "address": "...",
              "priceType": "ciudad",
              "assignedVendorId": "...",
              "isActive": 1,
              ...
            }
          ]
        }
      }
    }
  }
]
```

**Nota importante:** El backend ya filtra automáticamente por `assignedVendorId` igual al ID del vendedor logueado.

---

## 🔧 Cómo Funciona la Sincronización

### Flujo Completo

1. **Usuario presiona "Sincronizar"** en el Dashboard
2. **Verificación de conexión** con `checkConnection()`
3. **Sincronización de catálogo** con `getCatalog()`
   - Descarga todos los productos activos
   - Guarda en tabla `products` de SQLite
   - Descarga imágenes y las cachea localmente
4. **Sincronización de clientes** con `getClients()`
   - Descarga clientes asignados al vendedor
   - Guarda en tabla `clients` de SQLite
5. **Subida de pedidos pendientes** con `uploadOrders()`
   - Sube pedidos creados offline
   - Marca como sincronizados en SQLite
6. **Resultado final**
   - Muestra alerta con resumen
   - Actualiza timestamp de última sincronización

### Código de Sincronización

**Archivo:** `src/services/sync.ts`

```typescript
export async function fullSync(
  onProgress?: (message: string) => void
): Promise<SyncResult> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  // 1. Descargar catálogo
  onProgress?.('Descargando catálogo...');
  const response = await getCatalog();
  
  // 2. Guardar productos en SQLite
  for (const product of response.products) {
    await db.runAsync(
      `INSERT OR REPLACE INTO products (...) VALUES (...)`,
      [...]
    );
  }

  // 3. Descargar imágenes
  onProgress?.('Descargando imágenes...');
  const imageUrls = response.products
    .map(p => p.image)
    .filter(Boolean);
  await cacheMultipleImages(imageUrls);

  // 4. Sincronizar clientes
  onProgress?.('Sincronizando clientes...');
  const clientsResponse = await getAssignedClients();
  for (const client of clientsResponse.clients) {
    await db.runAsync(
      `INSERT OR REPLACE INTO clients (...) VALUES (...)`,
      [...]
    );
  }

  // 5. Subir pedidos pendientes
  onProgress?.('Subiendo pedidos pendientes...');
  const pendingOrders = await db.getAllAsync(
    `SELECT * FROM pending_orders WHERE synced = 0`
  );
  
  if (pendingOrders.length > 0) {
    await uploadPendingOrders();
  }

  return {
    success: true,
    message: `${response.products.length} productos actualizados`,
    productsUpdated: response.products.length,
    ordersSynced: pendingOrders.length,
  };
}
```

---

## 🧪 Cómo Probar

### Requisitos
1. Usuario vendedor con clientes asignados
2. Conexión a internet
3. Backend en producción funcionando

### Pasos de Prueba

1. **Instalar APK v1.5.0**
   ```bash
   adb install imporkam-vendedores-v1.5.0.apk
   ```

2. **Login**
   - Usuario: `omar`
   - Contraseña: `123456`

3. **Sincronizar**
   - Presionar botón "Sincronizar" en Dashboard
   - Observar mensajes de progreso
   - Verificar alerta de éxito

4. **Verificar Clientes**
   - Ir a pantalla "Clientes"
   - Debe mostrar clientes asignados al vendedor

5. **Verificar Catálogo**
   - Ir a "Pedidos" → "Seleccionar Cliente"
   - Debe navegar al catálogo
   - Debe mostrar 51 productos

### Logs Esperados

```
🔄 Descargando catálogo...
📦 Response length: 51
✅ Catálogo descargado: 51 productos
👥 Descargando clientes asignados al vendedor...
📦 Clients response preview: [{"result":{"data":{"json":{"success":true,"clients":[...]
✅ Clientes descargados: 3
```

---

## 📝 Recomendaciones para el Backend

### 1. Implementar endpoint getOrderHistory

```typescript
// Agregar en sync-router.ts
getOrderHistory: protectedProcedure
  .input(z.object({
    limit: z.number().optional().default(50),
  }))
  .query(async ({ ctx, input }) => {
    const db = await getDb();
    
    // Obtener pedidos del vendedor
    const vendorOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, ctx.user.id))
      .orderBy(desc(orders.createdAt))
      .limit(input.limit);

    // Obtener items de cada pedido
    const ordersWithItems = await Promise.all(
      vendorOrders.map(async (order) => {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        
        return {
          ...order,
          items,
        };
      })
    );

    return {
      success: true,
      orders: ordersWithItems,
    };
  }),
```

### 2. Agregar endpoint getAssignedClients (alias)

Para mantener compatibilidad con versiones anteriores:

```typescript
// Agregar en sync-router.ts
getAssignedClients: protectedProcedure
  .input(z.object({}).optional())
  .query(async ({ ctx }) => {
    // Reutilizar la lógica de getClients
    return syncRouter.getClients({ ctx });
  }),
```

---

## 🎯 Próximos Pasos

### Corto Plazo
1. ✅ Corregir endpoint de clientes → **COMPLETADO**
2. ✅ Deshabilitar sincronización de historial → **COMPLETADO**
3. ⏳ Compilar APK v1.5.0 → **EN PROGRESO**
4. ⏳ Probar sincronización de clientes → **PENDIENTE**

### Mediano Plazo
1. Implementar `getOrderHistory` en el backend
2. Habilitar sincronización de historial en la app
3. Agregar pantalla de historial de pedidos
4. Mejorar manejo de errores de red

### Largo Plazo
1. Sincronización incremental (solo cambios)
2. Sincronización automática en segundo plano
3. Notificaciones push para nuevos pedidos
4. Modo offline completo con cola de sincronización

---

## 📊 Versiones

### v1.5.0 (2025-11-08)
- ✅ Endpoint de clientes corregido: `getClients`
- ✅ Sincronización de historial deshabilitada
- ✅ Botón de sincronización ya existente
- ✅ Logs mejorados para debugging

### v1.4.1 (2025-11-08)
- ❌ Usaba endpoint incorrecto: `getAssignedClients`
- ❌ Intentaba sincronizar historial inexistente

---

## 🔗 Enlaces Útiles

- **Backend:** https://manus-store-production.up.railway.app
- **Repositorio Backend:** https://github.com/Kamchion/manus-store
- **Repositorio App:** https://github.com/Kamchion/appmovil2
- **Documentación tRPC:** https://trpc.io/docs

---

## 📧 Contacto

Para dudas o problemas, revisar los logs de la app con:
```bash
adb logcat | grep -i "catálogo\|sync\|cliente"
```
