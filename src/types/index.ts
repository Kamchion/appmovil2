/**
 * Tipos TypeScript para la aplicación de vendedores
 */

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category: string | null;
  image: string | null;
  basePrice: string;
  price: string;
  stock: number;
  minimumQuantity: number;
  updatedAt: string;
  syncedAt: string;
}

export interface PendingOrder {
  id: string;
  clientId?: string;
  customerNote?: string;
  subtotal: string;
  tax: string;
  total: string;
  createdAt: string;
  synced: number; // 0 = no sincronizado, 1 = sincronizado
}

export interface PendingOrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  quantity: number;
  pricePerUnit: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface SyncStatus {
  lastSyncTimestamp: string | null;
  pendingOrders: number;
  totalProducts: number;
  isOnline: boolean;
}

export interface ApiCatalogResponse {
  success: boolean;
  timestamp: string;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    description: string | null;
    category: string | null;
    image: string | null;
    basePrice: string;
    price: string;
    stock: number;
    minimumQuantity: number;
    updatedAt: string;
  }>;
  totalProducts: number;
}

export interface ApiUploadOrdersResponse {
  success: boolean;
  uploaded: number;
  failed: number;
  results: Array<{
    success: boolean;
    orderId?: string;
    createdAtOffline: string;
  }>;
  errors: Array<{
    success: boolean;
    error: string;
    createdAtOffline: string;
  }>;
}
