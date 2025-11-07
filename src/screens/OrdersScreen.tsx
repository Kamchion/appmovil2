import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { getDatabase } from '../database/db';
import { PendingOrder } from '../types';
import { syncPendingOrders, checkConnection } from '../services/sync';

interface OrdersScreenProps {
  navigation: any;
}

export default function OrdersScreen({ navigation }: OrdersScreenProps) {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    loadOrders();
    checkConnectionStatus();

    // Recargar cuando la pantalla recibe foco
    const unsubscribe = navigation.addListener('focus', loadOrders);
    return unsubscribe;
  }, [navigation]);

  const checkConnectionStatus = async () => {
    const online = await checkConnection();
    setIsOnline(online);
  };

  const loadOrders = async () => {
    try {
      const db = getDatabase();
      const result = await db.getAllAsync<PendingOrder>(
        'SELECT * FROM pending_orders ORDER BY createdAt DESC'
      );
      setOrders(result);
    } catch (error) {
      console.error('Error al cargar pedidos:', error);
      Alert.alert('Error', 'No se pudieron cargar los pedidos');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setRefreshing(true);

    const result = await syncPendingOrders((message) => {
      console.log('Sync progress:', message);
    });

    if (result.success) {
      Alert.alert('Éxito', result.message);
      await loadOrders();
    } else {
      Alert.alert('Error', result.message);
    }

    await checkConnectionStatus();
    setRefreshing(false);
  };

  const renderOrder = ({ item }: { item: PendingOrder }) => {
    const date = new Date(item.createdAt);
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => navigation.navigate('OrderDetail', { orderId: item.id })}
      >
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Pedido #{item.id.slice(-8)}</Text>
            <Text style={styles.orderDate}>{formattedDate}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              item.synced ? styles.syncedBadge : styles.pendingBadge,
            ]}
          >
            <Text style={styles.statusText}>
              {item.synced ? '✓ Sincronizado' : '⏳ Pendiente'}
            </Text>
          </View>
        </View>

        {item.clientId && (
          <Text style={styles.clientId}>Cliente: {item.clientId}</Text>
        )}

        {item.customerNote && (
          <Text style={styles.note} numberOfLines={2}>
            {item.customerNote}
          </Text>
        )}

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalValue}>${item.total}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const pendingCount = orders.filter((o) => !o.synced).length;

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text>Cargando pedidos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Mis Pedidos</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} pedidos • {pendingCount} pendientes
          </Text>
        </View>
        <View style={[styles.statusIndicator, isOnline ? styles.online : styles.offline]}>
          <Text style={styles.statusIndicatorText}>
            {isOnline ? '🌐' : '📱'}
          </Text>
        </View>
      </View>

      {pendingCount > 0 && isOnline && (
        <TouchableOpacity style={styles.syncBanner} onPress={handleSync}>
          <Text style={styles.syncBannerText}>
            ⚡ Tienes {pendingCount} pedido(s) pendiente(s). Toca para sincronizar
          </Text>
        </TouchableOpacity>
      )}

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>📋</Text>
          <Text style={styles.emptyTitle}>No hay pedidos</Text>
          <Text style={styles.emptySubtitle}>
            Los pedidos que crees aparecerán aquí
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => navigation.navigate('Catalog')}
          >
            <Text style={styles.createButtonText}>Crear primer pedido</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrder}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleSync}
              colors={['#2563eb']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  statusIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  online: {
    backgroundColor: '#dcfce7',
  },
  offline: {
    backgroundColor: '#fee2e2',
  },
  statusIndicatorText: {
    fontSize: 20,
  },
  syncBanner: {
    backgroundColor: '#fef3c7',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#fbbf24',
  },
  syncBannerText: {
    fontSize: 14,
    color: '#92400e',
    textAlign: 'center',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  syncedBadge: {
    backgroundColor: '#dcfce7',
  },
  pendingBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clientId: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 8,
  },
  note: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 12,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  totalLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563eb',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 24,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
