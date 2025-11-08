import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Obtiene el historial de pedidos del vendedor desde el backend
 */
export async function getOrderHistory(): Promise<{
  success: boolean;
  orders: Array<{
    id: string;
    userId: string;
    clientId: string;
    orderNumber: string;
    status: string;
    subtotal: string;
    tax: string;
    total: string;
    notes: string | null;
    customerName: string | null;
    customerContact: string | null;
    customerNote: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{
      id: string;
      productId: string;
      productName: string;
      quantity: number;
      pricePerUnit: string;
      subtotal: string;
      customText: string | null;
      customSelect: string | null;
    }>;
  }>;
}> {
  const token = await AsyncStorage.getItem('vendor_token');
  
  if (!token) {
    throw new Error('No hay sesión activa');
  }

  const API_BASE_URL = 'https://manus-store-production.up.railway.app';
  const TRPC_BASE_URL = `${API_BASE_URL}/api/trpc`;

  console.log('🔄 Descargando historial de pedidos...');
  
  const response = await fetch(`${TRPC_BASE_URL}/sync.getOrderHistory?batch=1`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Error getOrderHistory:', response.status, errorText);
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  console.log('📦 Order history response preview:', JSON.stringify(data).substring(0, 200));
  
  // Parsear respuesta tRPC batch
  if (Array.isArray(data) && data[0]?.result?.data?.json) {
    const result = data[0].result.data.json;
    console.log('✅ Historial descargado:', result.orders?.length || 0, 'pedidos');
    
    return {
      success: result.success !== undefined ? result.success : true,
      orders: result.orders || [],
    };
  }
  
  console.error('❌ Formato de respuesta inesperado:', data);
  throw new Error('Formato de respuesta inesperado');
}
