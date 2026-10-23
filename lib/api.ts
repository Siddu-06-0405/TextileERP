export const API_BASE_URL = 'http://localhost:4000/api/v1';

export const getDashboardStats = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stats`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard statistics');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching dashboard statistics:', error);
    throw error;
  }
};

export const getRecentOrders = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/recent-orders`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch recent orders');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching recent orders:', error);
    throw error;
  }
};

export const getStockAlerts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/stock-alerts`, {
      cache: "no-store", // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error("Failed to fetch stock alerts");
    }

    const data = await response.json();
    return data; // { success: boolean, stockAlerts: [...] }
  } catch (error) {
    console.error("Error fetching stock alerts:", error);
    throw error;
  }
};

export const getLatestProducts = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/latest-products`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch latest products');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching latest products:', error);
    throw error;
  }
};

export const createProduct = async (productData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/products/addProduct`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(productData),
    });

    if (!response.ok) {
      throw new Error('Failed to create product');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating product:', error);
    throw error;
  }
};

export const uploadProductImages = async (files) => {
  try {
    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('images', file);
    });

    const response = await fetch(`${API_BASE_URL}/products/upload-images`, {
      method: 'POST',
      body: formData,

    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Image upload failed');
    }

    return await response.json();
  } catch (error) {
    console.error('Image upload error:', error);
    throw error;
  }
};

export const getRecentOrdersByProduct = async (productId: string, limit = 5) => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/products/recent/orders/${productId}?limit=${limit}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch recent orders for product");
    }

    return await response.json(); // { success, product, recentOrders: [...] }
  } catch (error) {
    console.error("Error fetching recent product orders:", error);
    throw error;
  }
};
