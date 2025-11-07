import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { CartItem } from '../types';
import { calculateCartTotal, clearCart } from '../services/cart';
import { getDatabase } from '../database/db';
import { checkConnection } from '../services/sync';

interface CheckoutScreenProps {
  route: {
    params: {
      cart: CartItem[];
    };
  };
  navigation: any;
}

export default function CheckoutScreen({ route, navigation }: CheckoutScreenProps) {
  const { cart } = route.params;
  const [customerNote, setCustomerNote] = useState('');
  const [clientId, setClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  React.useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    const online = await checkConnection();
    setIsOnline(online);
  };

  const generateOrderId = () => {
    return `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleCreateOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }

    setLoading(true);

    try {
      const db = getDatabase();
      const { subtotal, tax, total } = calculateCartTotal(cart);
      const orderId = generateOrderId();
      const now = new Date().toISOString();

      // Crear pedido pendiente
      await db.runAsync(
        `INSERT INTO pending_orders 
         (id, clientId, customerNote, subtotal, tax, total, createdAt, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
        [
          orderId,
          clientId || null,
          customerNote || null,
          subtotal.toString(),
          tax.toString(),
          total.toString(),
          now,
        ]
      );

      // Crear items del pedido
      for (const item of cart) {
        const itemId = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await db.runAsync(
          `INSERT INTO pending_order_items 
           (id, orderId, productId, productName, quantity, pricePerUnit)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            itemId,
            orderId,
            item.product.id,
            item.product.name,
            item.quantity,
            item.product.price,
          ]
        );
      }

      // Limpiar carrito
      await clearCart();

      Alert.alert(
        'Pedido creado',
        isOnline
          ? 'El pedido se sincronizará automáticamente'
          : 'El pedido se guardó localmente y se sincronizará cuando tengas conexión',
        [
          {
            text: 'Ver pedidos',
            onPress: () => navigation.navigate('Orders'),
          },
          {
            text: 'Crear otro pedido',
            onPress: () => navigation.navigate('Catalog'),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error al crear pedido:', error);
      Alert.alert('Error', 'No se pudo crear el pedido');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, tax, total } = calculateCartTotal(cart);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Cliente</Text>
          
          <Text style={styles.label}>ID del Cliente (Opcional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Ej: CLIENTE001"
            value={clientId}
            onChangeText={setClientId}
            autoCapitalize="characters"
          />

          <Text style={styles.label}>Notas del Pedido (Opcional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Instrucciones especiales, dirección de entrega, etc."
            value={customerNote}
            onChangeText={setCustomerNote}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen del Pedido</Text>
          
          {cart.map((item) => (
            <View key={item.product.id} style={styles.orderItem}>
              <View style={styles.orderItemInfo}>
                <Text style={styles.orderItemName}>{item.product.name}</Text>
                <Text style={styles.orderItemDetails}>
                  {item.quantity} x ${item.product.price}
                </Text>
              </View>
              <Text style={styles.orderItemTotal}>
                ${(parseFloat(item.product.price) * item.quantity).toFixed(2)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalSection}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>${subtotal.toFixed(2)}</Text>
          </View>

          {tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Impuestos:</Text>
              <Text style={styles.totalValue}>${tax.toFixed(2)}</Text>
            </View>
          )}

          <View style={[styles.totalRow, styles.grandTotal]}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>${total.toFixed(2)}</Text>
          </View>
        </View>

        <View style={styles.statusBanner}>
          <Text style={styles.statusText}>
            {isOnline
              ? '🌐 Online - El pedido se sincronizará automáticamente'
              : '📱 Offline - El pedido se guardará localmente'}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.createButton, loading && styles.createButtonDisabled]}
          onPress={handleCreateOrder}
          disabled={loading}
        >
          <Text style={styles.createButtonText}>
            {loading ? 'Creando pedido...' : 'Crear Pedido'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  orderItemInfo: {
    flex: 1,
  },
  orderItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderItemDetails: {
    fontSize: 12,
    color: '#64748b',
  },
  orderItemTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  totalSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  grandTotal: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  statusBanner: {
    backgroundColor: '#dbeafe',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statusText: {
    fontSize: 12,
    color: '#1e40af',
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
});
