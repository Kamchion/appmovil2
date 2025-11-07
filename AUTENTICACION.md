# Sistema de Autenticación para Vendedores

## 📱 Descripción

Sistema de autenticación con usuario/contraseña para la app móvil de vendedores, con soporte completo para modo offline.

## 🔐 Características

### **Backend (Railway)**
- ✅ Endpoint `vendorAuth.login` para autenticación con usuario/contraseña
- ✅ Generación de token JWT válido por 30 días
- ✅ Validación de rol (solo vendedores pueden acceder)
- ✅ Validación de estado activo (`isActive = 1`)
- ✅ Validación de estado no congelado (`status != 'frozen'`)
- ✅ Soporte para JWT tokens en header `Authorization: Bearer <token>`
- ✅ Endpoint `vendorAuth.verify` para verificar validez del token

### **Mobile App**
- ✅ Login con usuario y contraseña (sin OAuth)
- ✅ Modo offline: después del primer login, funciona sin conexión
- ✅ Credenciales guardadas en AsyncStorage de forma segura
- ✅ Token JWT almacenado localmente
- ✅ Validación offline contra credenciales guardadas
- ✅ Sincronización automática de clientes asignados al vendedor

## 🚀 Flujo de Autenticación

### **Primer Login (con conexión)**
1. Usuario ingresa `username` y `password`
2. App envía credenciales a `POST /api/trpc/vendorAuth.login`
3. Backend valida:
   - Usuario existe
   - Contraseña correcta
   - Rol es "vendedor"
   - Usuario está activo
   - Usuario no está congelado
4. Backend genera token JWT y devuelve:
   ```json
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": "8Hzg3c-NQQSn6EMBpRGv9",
       "username": "vendedor_test",
       "name": "Vendedor de Prueba",
       "email": "vendedor@test.com",
       "role": "vendedor",
       "isActive": 1,
       "status": "active"
     }
   }
   ```
5. App guarda en AsyncStorage:
   - Token JWT (`vendor_token`)
   - Datos del usuario (`vendor_user`)
   - Credenciales (`vendor_credentials`)
6. App sincroniza catálogo y clientes asignados

### **Logins Posteriores (sin conexión)**
1. Usuario ingresa `username` y `password`
2. App intenta login online (puede fallar si no hay conexión)
3. Si falla online, valida contra credenciales guardadas:
   - Compara username y password con valores guardados
   - Si coinciden, carga datos del usuario desde AsyncStorage
   - Muestra mensaje "Modo Offline"
4. Usuario puede trabajar completamente offline

## 📡 Uso del Token en Peticiones API

Todas las peticiones a endpoints protegidos deben incluir el token en el header:

```typescript
const token = await AsyncStorage.getItem('vendor_token');

fetch('https://api.example.com/api/trpc/sync.getCatalog', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
});
```

## 🔧 Archivos Modificados

### **Backend**
- `server/vendor-auth-router.ts` - Router de autenticación
- `server/routers.ts` - Registro del router
- `server/_core/sdk.ts` - Soporte para JWT tokens
- `server/_core/env.ts` - Agregado `jwtSecret`

### **Mobile App**
- `src/screens/LoginScreen.tsx` - UI de login con usuario/contraseña
- `src/services/api.ts` - Cliente API con soporte para Bearer token
- `src/services/sync.ts` - Sincronización de clientes asignados

## 🧪 Testing

### **Credenciales de Prueba**
- **Usuario:** `vendedor_test`
- **Contraseña:** `123456`

### **Probar Login (Backend)**
```bash
curl -X POST 'https://tu-servidor.railway.app/api/trpc/vendorAuth.login' \
  -H "Content-Type: application/json" \
  -d '{"json":{"username":"vendedor_test","password":"123456"}}'
```

### **Probar Endpoint Protegido**
```bash
TOKEN="tu_token_jwt_aqui"
curl -X GET 'https://tu-servidor.railway.app/api/trpc/sync.getStatus' \
  -H "Authorization: Bearer $TOKEN"
```

## 📋 Próximos Pasos

1. **Compilar APK actualizado** con el nuevo sistema de autenticación
2. **Probar en dispositivo físico** el flujo completo de login
3. **Verificar sincronización offline** después del primer login
4. **Probar con múltiples vendedores** para verificar asignación de clientes

## 🔒 Seguridad

- ✅ Contraseñas almacenadas en texto plano en BD (⚠️ MEJORAR con bcrypt)
- ✅ Token JWT firmado con `JWT_SECRET`
- ✅ Token válido por 30 días
- ✅ Validación de rol y estado en cada petición
- ✅ Credenciales en AsyncStorage (seguro en dispositivo)

## 📞 Soporte

Para problemas de autenticación:
1. Verificar que el usuario tenga rol "vendedor"
2. Verificar que `isActive = 1`
3. Verificar que `status = 'active'`
4. Verificar que el token no haya expirado (30 días)
5. Verificar conexión a internet para primer login
