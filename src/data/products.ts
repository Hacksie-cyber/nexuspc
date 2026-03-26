export interface Product {
  id: number;
  name: string;
  category: string;
  brand: string;
  price: number;
  oldPrice?: number | null;
  img: string;
  icon: string;
  description?: string;
  specs: string[];
  socket?: string;
  ramType?: string;
  watts?: number;
  stock: number;
  perf: {
    gaming: number;
    office: number;
    editing: number;
  };
}

export const PRODUCTS: Product[] = [];

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🛒' },
  { id: 'laptop', label: 'Laptops', icon: '💻' },
  { id: 'cpu', label: 'Processors', icon: '🔲' },
  { id: 'gpu', label: 'Graphics Cards', icon: '🎮' },
  { id: 'motherboard', label: 'Motherboards', icon: '📟' },
  { id: 'ram', label: 'Memory', icon: '💾' },
  { id: 'storage', label: 'Storage', icon: '🗃️' },
  { id: 'psu', label: 'Power Supply', icon: '⚡' },
  { id: 'case', label: 'PC Cases', icon: '🖥️' },
  { id: 'drone', label: 'Drones', icon: '🚁' },
  { id: 'chair', label: 'Chairs', icon: '🪑' },
  { id: 'monitor', label: 'Monitors', icon: '🖥️' },
];
