import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiCatalogResponse, ApiUploadOrdersResponse } from '../types';

/**
 * Servicio de API para comunicación con el backend
 * Maneja autenticación y sincronización
 */

export const API_BASE_URL = 'https://manus-store-production.up.railway.app';
const TRPC_BASE_URL = `${API_BASE_URL}/api/trpc`;

const TOKEN_KEY = 'vendor_token';

/**
 * Obtiene el token de autenticación almacenado
 */
async function getAuthToken(): Promise<string | null> {
  return await AsyncStorage.getItem(TOKEN_KEY);
}

/**
 * Guarda el token de autenticación
 */
export async function setAuthToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

/**
 * Elimina el token de autenticación (logout)
 */
export async function clearAuthToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
  await AsyncStorage.removeItem('vendor_user');
  await AsyncStorage.removeItem('vendor_credentials');
}

/**
 * Realiza una petición HTTP con autenticación
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('No hay sesión activa. Por favor inicia sesión.');
  }

  const response = await fetch(`${TRPC_BASE_URL}/${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`Error HTTP: ${response.status}`);
  }

  return await response.json();
}

/**
 * Descarga el catálogo completo de productos
 */
export async function downloadCatalog(
  lastSyncTimestamp?: string
): Promise<ApiCatalogResponse> {
  const params = lastSyncTimestamp
    ? `?input=${encodeURIComponent(JSON.stringify({ lastSyncTimestamp }))}`
    : '';
  
  return await apiRequest<ApiCatalogResponse>(
    `sync.getCatalog${params}`,
    { method: 'GET' }
  );
}

/**
 * Sube pedidos pendientes al servidor
 */
export async function uploadPendingOrders(
  orders: Array<{
    clientId?: string;
    customerNote?: string;
    items: Array<{
      productId: string;
      quantity: number;
      pricePerUnit: string;
    }>;
    createdAtOffline: string;
  }>
): Promise<ApiUploadOrdersResponse> {
  return await apiRequest<ApiUploadOrdersResponse>(
    'sync.uploadOrders',
    {
      method: 'POST',
      body: JSON.stringify({ orders }),
    }
  );
}

/**
 * Obtiene cambios incrementales del catálogo
 */
export async function getChanges(
  lastSyncTimestamp: string
): Promise<ApiCatalogResponse> {
  const params = `?input=${encodeURIComponent(JSON.stringify({ lastSyncTimestamp }))}`;
  
  return await apiRequest<ApiCatalogResponse>(
    `sync.getChanges${params}`,
    { method: 'GET' }
  );
}

/**
 * Verifica el estado de sincronización
 */
export async function getSyncStatus(): Promise<{
  success: boolean;
  timestamp: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  catalog: {
    totalProducts: number;
    lastUpdate: string;
  };
  pendingOrders: number;
}> {
  return await apiRequest(
    'sync.getStatus',
    { method: 'GET' }
  );
}

/**
 * Obtiene clientes asignados al vendedor
 */
export async function getAssignedClients(): Promise<{
  success: boolean;
  clients: Array<{
    id: number;
    name: string;
    email: string;
    phone: string;
    address: string;
    priceType: string;
  }>;
}> {
  const params = `?input=${encodeURIComponent(JSON.stringify({}))}`;  
  return await apiRequest(
    `sync.getClients${params}`,
    { method: 'GET' }
  );
}
