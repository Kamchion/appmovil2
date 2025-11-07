import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Servicio de caché de imágenes
 * Descarga y almacena imágenes localmente para uso offline
 */

const IMAGE_CACHE_DIR = `${FileSystem.documentDirectory}images/`;
const CACHE_INDEX_KEY = 'image_cache_index';

interface CacheIndex {
  [imageUrl: string]: {
    localPath: string;
    cachedAt: string;
  };
}

/**
 * Inicializa el directorio de caché de imágenes
 */
export async function initImageCache(): Promise<void> {
  const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
  
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
    console.log('✅ Directorio de caché de imágenes creado');
  }
}

/**
 * Obtiene el índice de imágenes cacheadas
 */
async function getCacheIndex(): Promise<CacheIndex> {
  try {
    const indexJson = await AsyncStorage.getItem(CACHE_INDEX_KEY);
    return indexJson ? JSON.parse(indexJson) : {};
  } catch (error) {
    console.error('Error al leer índice de caché:', error);
    return {};
  }
}

/**
 * Guarda el índice de imágenes cacheadas
 */
async function saveCacheIndex(index: CacheIndex): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_INDEX_KEY, JSON.stringify(index));
  } catch (error) {
    console.error('Error al guardar índice de caché:', error);
  }
}

/**
 * Genera un nombre de archivo único basado en la URL
 */
function getFileNameFromUrl(url: string): string {
  const hash = url.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  const extension = url.split('.').pop()?.split('?')[0] || 'jpg';
  return `${Math.abs(hash)}.${extension}`;
}

/**
 * Descarga y cachea una imagen
 */
export async function cacheImage(imageUrl: string): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    // Verificar si ya está cacheada
    const index = await getCacheIndex();
    if (index[imageUrl]) {
      const fileInfo = await FileSystem.getInfoAsync(index[imageUrl].localPath);
      if (fileInfo.exists) {
        return index[imageUrl].localPath;
      }
    }

    // Descargar imagen
    const fileName = getFileNameFromUrl(imageUrl);
    const localPath = `${IMAGE_CACHE_DIR}${fileName}`;

    const downloadResult = await FileSystem.downloadAsync(imageUrl, localPath);

    if (downloadResult.status === 200) {
      // Actualizar índice
      index[imageUrl] = {
        localPath,
        cachedAt: new Date().toISOString(),
      };
      await saveCacheIndex(index);

      console.log(`✅ Imagen cacheada: ${fileName}`);
      return localPath;
    }

    return null;
  } catch (error) {
    console.error('Error al cachear imagen:', error);
    return null;
  }
}

/**
 * Obtiene la ruta local de una imagen cacheada
 * Si no está cacheada, retorna la URL original
 */
export async function getCachedImagePath(imageUrl: string | null): Promise<string | null> {
  if (!imageUrl) return null;

  try {
    const index = await getCacheIndex();
    
    if (index[imageUrl]) {
      const fileInfo = await FileSystem.getInfoAsync(index[imageUrl].localPath);
      if (fileInfo.exists) {
        return index[imageUrl].localPath;
      }
    }

    // Si no está cacheada, retornar URL original
    return imageUrl;
  } catch (error) {
    console.error('Error al obtener imagen cacheada:', error);
    return imageUrl;
  }
}

/**
 * Cachea múltiples imágenes en lote
 */
export async function cacheMultipleImages(
  imageUrls: string[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  let success = 0;
  let failed = 0;

  for (let i = 0; i < imageUrls.length; i++) {
    const url = imageUrls[i];
    onProgress?.(i + 1, imageUrls.length);

    const result = await cacheImage(url);
    if (result) {
      success++;
    } else {
      failed++;
    }
  }

  return { success, failed };
}

/**
 * Limpia el caché de imágenes
 */
export async function clearImageCache(): Promise<void> {
  try {
    const dirInfo = await FileSystem.getInfoAsync(IMAGE_CACHE_DIR);
    
    if (dirInfo.exists) {
      await FileSystem.deleteAsync(IMAGE_CACHE_DIR, { idempotent: true });
      await FileSystem.makeDirectoryAsync(IMAGE_CACHE_DIR, { intermediates: true });
    }

    await AsyncStorage.removeItem(CACHE_INDEX_KEY);
    console.log('✅ Caché de imágenes limpiado');
  } catch (error) {
    console.error('Error al limpiar caché:', error);
  }
}

/**
 * Obtiene el tamaño del caché de imágenes
 */
export async function getCacheSize(): Promise<number> {
  try {
    const index = await getCacheIndex();
    let totalSize = 0;

    for (const entry of Object.values(index)) {
      const fileInfo = await FileSystem.getInfoAsync(entry.localPath);
      if (fileInfo.exists && 'size' in fileInfo) {
        totalSize += fileInfo.size;
      }
    }

    return totalSize;
  } catch (error) {
    console.error('Error al calcular tamaño de caché:', error);
    return 0;
  }
}
