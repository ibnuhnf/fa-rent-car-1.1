'use client';

export interface CartItem {
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  dailyRate: number;
  startDate: string;
  endDate: string;
  withDriver: boolean;
  estimatedTotal?: number;
}

const CART_KEY = 'fa_rent_cart_items';

export function getCartItems(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveCartItems(items: CartItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
    window.dispatchEvent(new Event('cart-updated'));
  } catch {
    // ignore
  }
}

export function addToCart(item: CartItem): void {
  const current = getCartItems();
  const filtered = current.filter((i) => i.vehicleId !== item.vehicleId);
  filtered.push(item);
  saveCartItems(filtered);
}

export function removeFromCart(vehicleId: string): void {
  const current = getCartItems();
  saveCartItems(current.filter((i) => i.vehicleId !== vehicleId));
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CART_KEY);
    window.dispatchEvent(new Event('cart-updated'));
  } catch {
    // ignore
  }
}
