# Guía de Compilación y Despliegue

Esta guía explica cómo compilar y distribuir la aplicación Android de vendedores.

## 📋 Requisitos Previos

1. **Cuenta de Expo** (gratuita)
   - Regístrate en: https://expo.dev/signup
   - Instala EAS CLI: `npm install -g eas-cli`
   - Login: `eas login`

2. **Configuración del proyecto**
   - El proyecto ya está configurado en `app.json`
   - Package name: `com.imporkam.vendedores`

## 🏗️ Compilar APK

### Opción 1: APK de Desarrollo (Recomendado para pruebas)

```bash
cd /home/ubuntu/vendedor-app

# Primera vez: configurar EAS
eas build:configure

# Compilar APK de desarrollo
eas build --platform android --profile development

# O compilar APK de preview (más rápido)
eas build --platform android --profile preview
```

### Opción 2: APK de Producción

```bash
# Compilar APK de producción
eas build --platform android --profile production
```

## 📱 Instalar en Dispositivo

### Método 1: Descargar desde Expo

1. Después de compilar, Expo te dará una URL
2. Abre la URL en el navegador del teléfono
3. Descarga e instala el APK

### Método 2: Transferir manualmente

```bash
# Descargar APK desde Expo
eas build:download --platform android --latest

# Transferir a dispositivo via USB
adb install nombre-del-archivo.apk
```

## 🧪 Probar en Desarrollo

### Expo Go (Desarrollo rápido)

```bash
# Iniciar servidor de desarrollo
npm start

# Escanear QR con Expo Go app
```

**Nota:** Expo Go tiene limitaciones con SQLite y algunas funcionalidades nativas. Para pruebas completas, usa APK de desarrollo.

### Development Build (Recomendado)

```bash
# Compilar development build
eas build --platform android --profile development

# Instalar en dispositivo
# Luego ejecutar:
npm start --dev-client
```

## 📦 Perfiles de Build

El proyecto tiene 3 perfiles en `eas.json`:

### 1. Development
- Para desarrollo y debugging
- Incluye herramientas de desarrollo
- Permite hot reload
- Tamaño: ~50MB

### 2. Preview
- Para pruebas internas
- Sin herramientas de desarrollo
- Optimizado pero no firmado
- Tamaño: ~25MB

### 3. Production
- Para distribución final
- Totalmente optimizado
- Firmado con keystore
- Tamaño: ~20MB

## 🔑 Configurar Keystore (Producción)

Para builds de producción, necesitas un keystore:

```bash
# Generar keystore automáticamente
eas build --platform android --profile production

# O usar keystore existente
# Editar eas.json y agregar:
{
  "build": {
    "production": {
      "android": {
        "buildType": "apk",
        "credentialsSource": "local"
      }
    }
  }
}
```

## 🚀 Distribución

### Opción 1: Distribución Interna

1. Compilar APK de preview o production
2. Compartir link de descarga de Expo
3. Los vendedores descargan e instalan

### Opción 2: Google Play Store

1. Compilar AAB (Android App Bundle):
```bash
eas build --platform android --profile production
```

2. Subir a Google Play Console
3. Configurar release interno/beta/producción

### Opción 3: Distribución Directa

1. Descargar APK compilado
2. Subir a servidor propio o Google Drive
3. Compartir link directo

## 🔄 Actualizar la App

### Actualizaciones OTA (Over The Air)

Para cambios de JavaScript/React Native (sin cambios nativos):

```bash
# Publicar actualización
eas update --branch production --message "Descripción del cambio"
```

Las apps se actualizarán automáticamente al abrirse.

### Actualizaciones Completas

Para cambios nativos o versión mayor:

1. Incrementar versión en `app.json`
2. Compilar nuevo APK
3. Distribuir nueva versión

## 📊 Monitoreo

### Ver builds

```bash
# Listar builds
eas build:list

# Ver detalles de un build
eas build:view [BUILD_ID]
```

### Logs

```bash
# Ver logs de un build
eas build:view [BUILD_ID] --logs
```

## 🐛 Troubleshooting

### Error: "SDK location not found"

```bash
# Instalar Android SDK via Expo
eas build --platform android --profile development --local
```

### Error: "Keystore not found"

```bash
# Dejar que Expo maneje el keystore
eas build --platform android --profile production --auto-submit
```

### APK muy grande

1. Habilitar ProGuard en `app.json`:
```json
{
  "android": {
    "enableProguardInReleaseBuilds": true
  }
}
```

2. Usar AAB en lugar de APK para Play Store

## 📝 Notas Importantes

1. **Primera compilación** puede tardar 15-20 minutos
2. **Builds subsecuentes** son más rápidos (~5-10 min)
3. **Expo tiene límite gratuito** de builds mensuales
4. **APK de desarrollo** es más grande pero permite debugging
5. **Production builds** requieren keystore para firmar

## 🔗 Enlaces Útiles

- Expo Build Docs: https://docs.expo.dev/build/introduction/
- EAS CLI Reference: https://docs.expo.dev/eas/cli/
- Android Permissions: https://docs.expo.dev/versions/latest/config/app/#permissions
- Expo Updates: https://docs.expo.dev/eas-update/introduction/
