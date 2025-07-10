
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Product, CartItem } from '@/types/database';

interface CartContextType {
  items: CartItem[];
  cartItems: CartItem[]; // Add this for backward compatibility
  addToCart: (product: Product, quantity: number, requirements?: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateRequirements: (productId: string, requirements: string) => void;
  updateCartItem: (productId: string, updates: Partial<CartItem>) => void; // Add missing method
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  cartCount: number; // Add missing property
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, quantity: number, requirements?: string) => {
    setItems((currentItems) => {
      const existingItem = currentItems.find(item => item.product_id === product.id);
      
      if (existingItem) {
        return currentItems.map(item =>
          item.product_id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                requirements: requirements || item.requirements 
              }
            : item
        );
      }
      
      return [
        ...currentItems,
        {
          id: Math.random().toString(36).substr(2, 9),
          product_id: product.id,
          quantity,
          price: 0,
          product,
          requirements: requirements || ''
        } as CartItem
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setItems(currentItems =>
      currentItems.map(item =>
        item.product_id === productId ? { ...item, quantity } : item
      )
    );
  };

  const updateRequirements = (productId: string, requirements: string) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.product_id === productId 
          ? { ...item, requirements: requirements }
          : item
      )
    );
  };

  const updateCartItem = (productId: string, updates: Partial<CartItem>) => {
    setItems(currentItems =>
      currentItems.map(item =>
        item.product_id === productId 
          ? { ...item, ...updates }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setItems(currentItems =>
      currentItems.filter(item => item.product_id !== productId)
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
  };

  const cartCount = getTotalItems();

  return (
    <CartContext.Provider value={{
      items,
      cartItems: items, // Provide cartItems as alias to items
      addToCart,
      updateQuantity,
      updateRequirements,
      updateCartItem,
      removeFromCart,
      clearCart,
      getTotalItems,
      getTotalPrice,
      cartCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
