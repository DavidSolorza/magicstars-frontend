'use client';

import { useState, useEffect, useMemo } from 'react';
import { ProductoInventario } from '@/lib/supabase-inventario';
import { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Search,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Plus,
  ChevronLeft,
  ChevronRight,
  Layers,
  Trash2,
  Edit,
  Loader2,
} from 'lucide-react';
import { ProductFormModal } from '@/components/dashboard/product-form-modal';
import { Input } from '@/components/ui/input';
import { API_URLS } from '@/lib/config';

interface UnmappedProduct {
  id: string;
  name: string;
  orderIds: string[];
  occurrences: number;
  lastSeen: string;
}

interface ProductMapping {
  unmappedName: string;
  mappedProductName: string;
  createdAt: string;
  isCombo?: boolean;
  comboId?: string;
  quantity?: number; // Cantidad para mapeos simples (no combos)
}

interface ComboItem {
  productName: string;
  quantity: number;
}

interface ProductCombo {
  id: string;
  name: string;
  items: ComboItem[];
  createdAt: string;
}

interface UnmappedProductsManagerProps {
  orders: Order[];
  inventory: ProductoInventario[];
  onMappingSaved?: () => void;
  onInventoryUpdate?: (newProduct: ProductoInventario) => void;
  defaultStore?: string;
}

const STORAGE_KEY = 'product_mappings';
const COMBOS_STORAGE_KEY = 'product_combos';

// Función para parsear productos de un string
// Los productos entre paréntesis son considerados "no encontrados"
// Ejemplo: "1X GEL PYTHON, (1 X EVIL GOODS! | SEBO DE RES | NUTRICIÓN INTENSA)"
// - "1X GEL PYTHON" es un producto encontrado
// - "(1 X EVIL GOODS! | SEBO DE RES | NUTRICIÓN INTENSA)" es un producto no encontrado
const parseProductosString = (productosStr: string | undefined): Array<{ name: string; quantity?: number; isUnmapped?: boolean }> => {
  if (!productosStr) return [];
  
  const products: Array<{ name: string; quantity?: number; isUnmapped?: boolean }> = [];
  
  // Primero, extraer todos los productos entre paréntesis (no encontrados)
  // Guardamos tanto el match completo (con paréntesis) como el contenido (sin paréntesis)
  const unmappedPattern = /(\([^)]+\))/g;
  const unmappedMatches: Array<{ full: string; content: string }> = [];
  let match;
  
  while ((match = unmappedPattern.exec(productosStr)) !== null) {
    unmappedMatches.push({
      full: match[1], // Con paréntesis: "(1 X EVIL GOODS! | SEBO DE RES | NUTRICIÓN INTENSA)"
      content: match[1].slice(1, -1).trim() // Sin paréntesis: "1 X EVIL GOODS! | SEBO DE RES | NUTRICIÓN INTENSA"
    });
  }
  
  // Remover los productos entre paréntesis del string para procesar los encontrados
  let productosSinParentesis = productosStr.replace(/\([^)]+\)/g, '').trim();
  
  // Procesar productos no encontrados (entre paréntesis)
  unmappedMatches.forEach(({ full, content }) => {
    const trimmed = content.trim();
    if (trimmed) {
      // Intentar extraer cantidad si existe (ej: "1 X EVIL GOODS!")
      const qtyMatch = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/i);
      if (qtyMatch) {
        // Guardar el nombre completo con paréntesis para mostrarlo
        const nameWithParentheses = `(${trimmed})`;
        products.push({
          name: nameWithParentheses, // Guardamos con paréntesis para mostrarlo
          quantity: parseInt(qtyMatch[1], 10),
          isUnmapped: true,
        });
      } else {
        // Guardar el nombre completo con paréntesis
        const nameWithParentheses = `(${trimmed})`;
        products.push({
          name: nameWithParentheses, // Guardamos con paréntesis para mostrarlo
          isUnmapped: true,
        });
      }
    }
  });
  
  // Procesar productos encontrados (sin paréntesis)
  if (productosSinParentesis) {
    // Limpiar comas múltiples y espacios
    productosSinParentesis = productosSinParentesis.replace(/,\s*,/g, ',').trim();
    
    if (productosSinParentesis) {
      // Dividir por comas
      productosSinParentesis.split(',').forEach(part => {
        const trimmed = part.trim();
        if (trimmed) {
          // Intentar extraer cantidad si existe (ej: "1X GEL PYTHON" o "2 X PRODUCTO")
          const qtyMatch = trimmed.match(/^(\d+)\s*[xX]\s*(.+)$/i);
          if (qtyMatch) {
            products.push({
              name: qtyMatch[2].trim(),
              quantity: parseInt(qtyMatch[1], 10),
              isUnmapped: false,
            });
          } else {
            products.push({
              name: trimmed,
              isUnmapped: false,
            });
          }
        }
      });
    }
  }
  
  return products;
};

// Función para extraer el contenido sin paréntesis de un nombre
// Ejemplo: "(1 X EVIL GOODS!)" -> "1 X EVIL GOODS!"
const extractNameWithoutParentheses = (name: string): string => {
  if (name.startsWith('(') && name.endsWith(')')) {
    return name.slice(1, -1).trim();
  }
  return name;
};

// Función para limpiar el nombre del producto para mostrarlo (remover cantidad)
// Ejemplo: "(1 X OIL OREGANO)" -> "(OIL OREGANO)"
// Ejemplo: "(2 X LEMME BURN)" -> "(LEMME BURN)"
const cleanProductNameForDisplay = (name: string): string => {
  if (!name.startsWith('(') || !name.endsWith(')')) {
    return name; // Si no tiene paréntesis, devolver tal cual
  }
  
  // Extraer contenido sin paréntesis
  const content = name.slice(1, -1).trim();
  
  // Remover cantidad al inicio (ej: "1 X ", "2X ", "1X", etc.)
  const cleanedContent = content.replace(/^\d+\s*[xX]\s*/i, '').trim();
  
  // Devolver con paréntesis
  return `(${cleanedContent})`;
};

// Función para normalizar nombres de productos
// Si el nombre tiene paréntesis, los removemos para la normalización
// También removemos la cantidad al inicio para agrupar productos iguales con diferentes cantidades
const normalizeProductName = (name: string): string => {
  // Remover paréntesis si existen para normalización
  const nameWithoutParens = extractNameWithoutParentheses(name);

  // Remover cantidad al inicio (ej: "1 X ", "2X ", "1X", etc.)
  const nameWithoutQuantity = nameWithoutParens.replace(/^\d+\s*[xX]\s*/i, '').trim();

  return nameWithoutQuantity
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
};

// Cargar mapeos guardados
const loadMappings = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    const mappings: ProductMapping[] = JSON.parse(stored);
    const result: Record<string, string> = {};
    mappings.forEach(m => {
      result[normalizeProductName(m.unmappedName)] = m.mappedProductName;
    });
    return result;
  } catch {
    return {};
  }
};

// Guardar mapeo
const saveMapping = (unmappedName: string, mappedProductName: string, isCombo: boolean = false, comboId?: string, quantity?: number) => {
  if (typeof window === 'undefined') return;
  try {
    const existing: ProductMapping[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const normalized = normalizeProductName(unmappedName);
    
    // Eliminar mapeos existentes para este producto
    const filtered = existing.filter(m => normalizeProductName(m.unmappedName) !== normalized);
    
    // Agregar nuevo mapeo
    filtered.push({
      unmappedName,
      mappedProductName,
      createdAt: new Date().toISOString(),
      isCombo,
      comboId,
      quantity: quantity && quantity > 1 ? quantity : undefined,
    });
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error guardando mapeo:', error);
  }
};

// Cargar combos guardados
const loadCombos = (): ProductCombo[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(COMBOS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Guardar combo
const saveCombo = (combo: ProductCombo) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCombos();
    const filtered = existing.filter(c => c.id !== combo.id);
    filtered.push(combo);
    localStorage.setItem(COMBOS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error guardando combo:', error);
  }
};

// Eliminar combo
const deleteCombo = (comboId: string) => {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadCombos();
    const filtered = existing.filter(c => c.id !== comboId);
    localStorage.setItem(COMBOS_STORAGE_KEY, JSON.stringify(filtered));
    
    // También eliminar mapeos relacionados
    const mappings: ProductMapping[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const filteredMappings = mappings.filter(m => m.comboId !== comboId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filteredMappings));
  } catch (error) {
    console.error('Error eliminando combo:', error);
  }
};

export function UnmappedProductsManager({
  orders,
  inventory,
  onMappingSaved,
  onInventoryUpdate,
  defaultStore,
}: UnmappedProductsManagerProps) {
  const [unmappedProducts, setUnmappedProducts] = useState<UnmappedProduct[]>([]);
  const [selectedUnmapped, setSelectedUnmapped] = useState<UnmappedProduct | null>(null);
  const [selectedMappedProduct, setSelectedMappedProduct] = useState<string>('');
  const [mappingQuantity, setMappingQuantity] = useState<number>(1);
  const [showMappingDialog, setShowMappingDialog] = useState(false);
  const [savedMappings, setSavedMappings] = useState<Record<string, string>>({});
  const [savedMappingsWithQuantity, setSavedMappingsWithQuantity] = useState<Record<string, ProductMapping>>({});
  const [productSearchTerm, setProductSearchTerm] = useState<string>('');
  const [unmappedSearchTerm, setUnmappedSearchTerm] = useState<string>('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [newProductName, setNewProductName] = useState<string>('');
  const [showComboModal, setShowComboModal] = useState(false);
  const [combos, setCombos] = useState<ProductCombo[]>([]);
  const [comboItems, setComboItems] = useState<ComboItem[]>([]);
  const [comboName, setComboName] = useState<string>('');
  const [selectedComboProduct, setSelectedComboProduct] = useState<string>('');
  const [selectedComboQuantity, setSelectedComboQuantity] = useState<number>(1);
  const [showCreateProductFromComboModal, setShowCreateProductFromComboModal] = useState(false);
  const [newProductNameFromCombo, setNewProductNameFromCombo] = useState<string>('');
  const [comboProductSearchTerm, setComboProductSearchTerm] = useState<string>('');
  const [editingComboItemIndex, setEditingComboItemIndex] = useState<number | null>(null);
  const [editingComboItemQuantity, setEditingComboItemQuantity] = useState<number>(1);
  const [isSavingMapping, setIsSavingMapping] = useState(false);
  const [isSavingCombo, setIsSavingCombo] = useState(false);
  
  const ITEMS_PER_PAGE = 5;

  // Cargar mapeos y combos guardados al inicio
  useEffect(() => {
    const mappings = loadMappings();
    setSavedMappings(mappings);
    
    // Cargar mapeos completos con cantidad
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const allMappings: ProductMapping[] = JSON.parse(stored);
          const mappingsMap: Record<string, ProductMapping> = {};
          allMappings.forEach(m => {
            const normalized = normalizeProductName(m.unmappedName);
            mappingsMap[normalized] = m;
          });
          setSavedMappingsWithQuantity(mappingsMap);
        }
      } catch {
        // Ignorar errores
      }
    }
    
    setCombos(loadCombos());
  }, []);

  // Detectar productos no encontrados
  // Ahora solo consideramos como "no encontrados" los productos que vienen entre paréntesis en el campo productos
  useEffect(() => {
    const inventoryNames = new Set(
      inventory.map(p => normalizeProductName(p.producto || ''))
    );

    const unmappedMap = new Map<string, UnmappedProduct>();

    orders.forEach(order => {
      if (!order.productos) return;
      
      const parsedProducts = parseProductosString(order.productos);
      
      // Solo procesar productos marcados como no encontrados (isUnmapped: true)
      // Estos son los que vienen entre paréntesis en el string de productos
      parsedProducts
        .filter(product => product.isUnmapped === true)
        .forEach(({ name }) => {
          const normalized = normalizeProductName(name);
          
          // Verificar si tiene mapeo guardado (incluyendo combos)
          // Si ya tiene mapeo, no lo mostramos como no encontrado
          const hasMapping = savedMappings[normalized];
          
          if (!hasMapping) {
            const existing = unmappedMap.get(normalized);
            if (existing) {
              existing.occurrences += 1;
              if (!existing.orderIds.includes(order.id)) {
                existing.orderIds.push(order.id);
              }
              // Actualizar última vez visto
              if (new Date(order.createdAt) > new Date(existing.lastSeen)) {
                existing.lastSeen = order.createdAt;
              }
            } else {
              unmappedMap.set(normalized, {
                id: `unmapped-${normalized}`,
                name,
                orderIds: [order.id],
                occurrences: 1,
                lastSeen: order.createdAt,
              });
            }
          }
        });
    });

    const unmappedList = Array.from(unmappedMap.values())
      .sort((a, b) => b.occurrences - a.occurrences);

    setUnmappedProducts(unmappedList);
  }, [orders, inventory, savedMappings]);

  const handleOpenMapping = (unmapped: UnmappedProduct) => {
    setSelectedUnmapped(unmapped);
    // Buscar si hay un mapeo guardado
    const normalized = normalizeProductName(unmapped.name);
    const existingMapping = savedMappings[normalized];
    const existingMappingFull = savedMappingsWithQuantity[normalized];
    
    // Intentar extraer cantidad del nombre del producto (sin paréntesis)
    // Ejemplo: "(2 X TURKESTERONE)" -> "2 X TURKESTERONE" -> cantidad: 2
    let extractedQuantity = 1;
    const nameWithoutParens = extractNameWithoutParentheses(unmapped.name);
    const quantityMatch = nameWithoutParens.match(/^(\d+)\s*[xX]\s*/i);
    if (quantityMatch) {
      extractedQuantity = parseInt(quantityMatch[1], 10) || 1;
    }
    
    setSelectedMappedProduct(existingMapping || '');
    setMappingQuantity(existingMappingFull?.quantity || extractedQuantity);
    setProductSearchTerm(''); // Limpiar búsqueda al abrir
    setShowMappingDialog(true);
  };

  const handleSaveMapping = async () => {
    if (!selectedUnmapped || !selectedMappedProduct) return;

    setIsSavingMapping(true);

    const normalized = normalizeProductName(selectedUnmapped.name);

    // Mapeo simple - siempre enviar al endpoint de diccionario
    // Los combos solo se crean cuando el usuario usa el botón "Crear combo" explícitamente
    saveMapping(selectedUnmapped.name, selectedMappedProduct, false, undefined, 1);

    // Actualizar estado local
    setSavedMappings(prev => ({
      ...prev,
      [normalized]: selectedMappedProduct,
    }));

    // Enviar al endpoint de diccionario (producto simple)
    try {
      // Extraer el nombre del producto sin la cantidad (ej: "(1 X TURKESTERONE)" -> "TURKESTERONE")
      const nombreSinCantidad = extractNameWithoutParentheses(selectedUnmapped.name)
        .replace(/^\d+\s*[xX]\s*/i, '') // Remover "1 X " o "2X " del inicio
        .trim();

      const payload = {
        producto_existente: selectedMappedProduct, // Producto del inventario seleccionado
        producto_nuevo: nombreSinCantidad, // Nombre sin cantidad ni paréntesis (producto no encontrado)
      };

      console.log('📤 Enviando mapeo simple al diccionario:', {
        endpoint: API_URLS.ADD_DICCIONARIO,
        payload,
        detalle: {
          producto_original_completo: selectedUnmapped.name,
          producto_sin_cantidad: nombreSinCantidad,
          producto_inventario: selectedMappedProduct,
        },
      });

      const response = await fetch(API_URLS.ADD_DICCIONARIO, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error al enviar mapeo al diccionario:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.log('✅ Mapeo enviado al diccionario exitosamente:', responseData);
      }
    } catch (error) {
      console.error('❌ Error al enviar mapeo al diccionario:', error);
    } finally {
      setIsSavingMapping(false);
    }

    // Remover de la lista de no mapeados
    setUnmappedProducts(prev =>
      prev.filter(p => normalizeProductName(p.name) !== normalized)
    );

    setShowMappingDialog(false);
    onMappingSaved?.();
  };

  const handleOpenComboModal = () => {
    setComboName(selectedUnmapped?.name || '');
    setComboItems([]);
    setSelectedComboProduct('');
    setSelectedComboQuantity(1);
    setComboProductSearchTerm('');
    setEditingComboItemIndex(null);
    setEditingComboItemQuantity(1);
    setShowComboModal(true);
  };

  const handleAddComboItem = () => {
    if (!selectedComboProduct || selectedComboQuantity < 1) return;
    
    const normalizedSelected = normalizeProductName(selectedComboProduct);
    const existingIndex = comboItems.findIndex(
      item => normalizeProductName(item.productName) === normalizedSelected
    );
    
    if (existingIndex >= 0) {
      // Actualizar cantidad si ya existe
      const updated = [...comboItems];
      updated[existingIndex].quantity += selectedComboQuantity;
      setComboItems(updated);
    } else {
      // Agregar nuevo item
      setComboItems([...comboItems, {
        productName: selectedComboProduct,
        quantity: selectedComboQuantity,
      }]);
    }
    
    // Limpiar selección
    setSelectedComboProduct('');
    setSelectedComboQuantity(1);
    setComboProductSearchTerm('');
  };

  const handleEditComboItemQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updated = [...comboItems];
    updated[index].quantity = newQuantity;
    setComboItems(updated);
  };

  const handleStartEditComboItem = (index: number) => {
    setEditingComboItemIndex(index);
    setEditingComboItemQuantity(comboItems[index].quantity);
  };

  const handleSaveEditComboItem = (index: number) => {
    if (editingComboItemQuantity < 1) {
      setEditingComboItemQuantity(1);
    }
    handleEditComboItemQuantity(index, editingComboItemQuantity);
    setEditingComboItemIndex(null);
  };

  const handleRemoveComboItem = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const handleSaveCombo = async () => {
    // Validaciones mejoradas
    if (!comboName.trim()) {
      return;
    }

    if (comboItems.length === 0) {
      return;
    }

    // Validar que todos los items tengan cantidad válida
    const invalidItems = comboItems.filter(item => !item.productName.trim() || item.quantity < 1);
    if (invalidItems.length > 0) {
      return;
    }

    if (!selectedUnmapped) return;

    setIsSavingCombo(true);

    const comboId = `combo-${Date.now()}`;
    const combo: ProductCombo = {
      id: comboId,
      name: comboName.trim(),
      items: comboItems.map(item => ({
        productName: item.productName.trim(),
        quantity: item.quantity,
      })),
      createdAt: new Date().toISOString(),
    };

    saveCombo(combo);
    setCombos(prev => [...prev, combo]);

    // Guardar mapeo del producto no encontrado al combo
    const normalized = normalizeProductName(selectedUnmapped.name);
    const comboMappingName = `COMBO:${combo.name}`;
    saveMapping(selectedUnmapped.name, comboMappingName, true, comboId);

    setSavedMappings(prev => ({
      ...prev,
      [normalized]: comboMappingName,
    }));

    // Enviar al endpoint de diccionario de combos
    try {
      // Extraer el nombre del producto no encontrado sin cantidad ni paréntesis
      const nombreSinCantidad = extractNameWithoutParentheses(selectedUnmapped.name)
        .replace(/^\d+\s*[xX]\s*/i, '') // Remover "1 X " o "2X " del inicio
        .trim();

      // Crear string con formato "1 X PRODUCTO1, 3 X PRODUCTO2"
      const comboNuevoString = comboItems
        .map(item => `${item.quantity} X ${item.productName.trim()}`)
        .join(', ');

      const payload = {
        nombre_combo: nombreSinCantidad, // Producto no encontrado sin cantidad ni paréntesis
        productos_combo: comboNuevoString, // String con formato "1 X PRODUCTO1, 3 X PRODUCTO2"
      };

      console.log('📤 Enviando combo al diccionario:', {
        endpoint: API_URLS.ADD_DICCIONARIO_COMBOS,
        payload,
        detalle: {
          producto_original_completo: selectedUnmapped.name,
          nombre_combo: nombreSinCantidad,
          productos_combo: comboNuevoString,
          items: comboItems,
        },
      });

      const response = await fetch(API_URLS.ADD_DICCIONARIO_COMBOS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error al enviar combo al diccionario:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
        });
      } else {
        const responseData = await response.json().catch(() => ({}));
        console.log('✅ Combo enviado al diccionario exitosamente:', responseData);
      }
    } catch (error) {
      console.error('❌ Error al enviar combo al diccionario:', error);
    } finally {
      setIsSavingCombo(false);
    }

    // Remover de la lista de no mapeados
    setUnmappedProducts(prev =>
      prev.filter(p => normalizeProductName(p.name) !== normalized)
    );

    setShowComboModal(false);
    setShowMappingDialog(false);
    onMappingSaved?.();
  };

  // Filtrar productos no encontrados por búsqueda
  const filteredUnmappedProducts = useMemo(() => {
    if (!unmappedSearchTerm.trim()) {
      return unmappedProducts;
    }
    
    const searchLower = normalizeProductName(unmappedSearchTerm);
    return unmappedProducts.filter(product =>
      normalizeProductName(product.name).includes(searchLower)
    );
  }, [unmappedProducts, unmappedSearchTerm]);

  // Resetear página cuando cambia el número de productos o el filtro de búsqueda
  useEffect(() => {
    setCurrentPage(1);
  }, [filteredUnmappedProducts.length, unmappedSearchTerm]);

  // Paginación
  const totalPages = Math.ceil(filteredUnmappedProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    return filteredUnmappedProducts.slice(start, end);
  }, [filteredUnmappedProducts, currentPage]);

  // Obtener productos únicos del inventario para el selector con búsqueda
  const availableProducts = useMemo(() => {
    const unique = new Map<string, string>();
    inventory.forEach(p => {
      const name = p.producto || '';
      if (name) {
        unique.set(normalizeProductName(name), name);
      }
    });
    const allProducts = Array.from(unique.values()).sort();
    
    // Filtrar por término de búsqueda si existe
    if (productSearchTerm.trim()) {
      const searchLower = normalizeProductName(productSearchTerm);
      return allProducts.filter(p => normalizeProductName(p).includes(searchLower));
    }
    
    return allProducts;
  }, [inventory, productSearchTerm]);

  // Productos disponibles para el combo (con búsqueda)
  const availableComboProducts = useMemo(() => {
    const unique = new Map<string, string>();
    inventory.forEach(p => {
      const name = p.producto || '';
      if (name) {
        unique.set(normalizeProductName(name), name);
      }
    });
    const allProducts = Array.from(unique.values()).sort();
    
    // Filtrar por término de búsqueda si existe
    if (comboProductSearchTerm.trim()) {
      const searchLower = normalizeProductName(comboProductSearchTerm);
      return allProducts.filter(p => normalizeProductName(p).includes(searchLower));
    }
    
    return allProducts;
  }, [inventory, comboProductSearchTerm]);

  const handleCreateProduct = () => {
    setNewProductName(selectedUnmapped?.name || productSearchTerm || '');
    setShowCreateProductModal(true);
  };

  const handleSaveNewProduct = (productData: Omit<ProductoInventario, 'idx'>) => {
    // Crear nuevo producto
    const newProduct: ProductoInventario = {
      ...productData,
      idx: Date.now(), // ID temporal
    };
    
    // Actualizar inventario
    onInventoryUpdate?.(newProduct);
    
    // Asignar automáticamente el producto recién creado
    setSelectedMappedProduct(productData.producto);
    setShowCreateProductModal(false);
    
    // Si hay un producto no encontrado seleccionado, guardar el mapeo automáticamente
    if (selectedUnmapped) {
      const normalized = normalizeProductName(selectedUnmapped.name);
      saveMapping(selectedUnmapped.name, productData.producto);
      setSavedMappings(prev => ({
        ...prev,
        [normalized]: productData.producto,
      }));
      
      // Remover de la lista
      setUnmappedProducts(prev =>
        prev.filter(p => normalizeProductName(p.name) !== normalized)
      );
      
      setShowMappingDialog(false);
      onMappingSaved?.();
    }
  };

  const handleCreateProductFromCombo = () => {
    // Usar el nombre del producto no encontrado si está disponible, sino el término de búsqueda
    const productName = selectedUnmapped?.name || selectedComboProduct || comboProductSearchTerm || '';
    setNewProductNameFromCombo(productName);
    setShowCreateProductFromComboModal(true);
  };

  const handleSaveNewProductFromCombo = (productData: Omit<ProductoInventario, 'idx'>) => {
    // Crear nuevo producto
    const newProduct: ProductoInventario = {
      ...productData,
      idx: Date.now(), // ID temporal
    };
    
    // Actualizar inventario
    onInventoryUpdate?.(newProduct);
    
    // Cerrar modal de creación
    setShowCreateProductFromComboModal(false);
    
    // Verificar si el producto ya existe en el combo
    const normalizedNew = normalizeProductName(productData.producto);
    const existingIndex = comboItems.findIndex(
      item => normalizeProductName(item.productName) === normalizedNew
    );
    
    if (existingIndex >= 0) {
      // Actualizar cantidad si ya existe
      const updated = [...comboItems];
      updated[existingIndex].quantity += selectedComboQuantity;
      setComboItems(updated);
    } else {
      // Agregar automáticamente el producto recién creado al combo con la cantidad seleccionada
      setComboItems(prev => [...prev, {
        productName: productData.producto,
        quantity: selectedComboQuantity,
      }]);
    }
    
    // Limpiar selección
    setSelectedComboProduct('');
    setSelectedComboQuantity(1);
    setComboProductSearchTerm('');
  };

  if (unmappedProducts.length === 0) {
    return (
      <>
        {/* Header mejorado con gradiente */}
        <div className="relative rounded-2xl bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 p-8 text-white overflow-hidden mb-6">
          <div className="absolute inset-0 opacity-20"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Package className="h-4 w-4" />
                Estado del inventario
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Productos No Encontrados
              </h1>
              <p className="text-white/90 text-base">
                ¡Excelente! Todos los productos están correctamente definidos en el inventario.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {/* Header mejorado con gradiente */}
      <div className="relative rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500 p-8 text-white overflow-hidden mb-6">
        <div className="absolute inset-0 opacity-20"></div>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm shadow-lg">
              <AlertTriangle className="h-8 w-8 text-white" />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-white mb-3">
                <Package className="h-4 w-4" />
                Gestión de productos no mapeados
              </p>
              <h1 className="text-4xl font-bold tracking-tight text-white mb-2">
                Productos No Encontrados
              </h1>
              <p className="text-white/90 text-base">
                {unmappedSearchTerm 
                  ? `${filteredUnmappedProducts.length} de ${unmappedProducts.length} productos`
                  : `${unmappedProducts.length} producto${unmappedProducts.length !== 1 ? 's' : ''} requieren mapeo`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="secondary" className="text-sm px-4 py-2 bg-white/20 backdrop-blur-sm text-white border-white/30">
              {unmappedSearchTerm ? filteredUnmappedProducts.length : unmappedProducts.length}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-10 w-10 p-0 bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
            >
              {isCollapsed ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronUp className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {!isCollapsed && (
      <Card>
        <CardContent>
            <Alert className="mb-4 border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-900">
                Estos productos aparecen en pedidos pero no están en el inventario. 
                Asigna cada uno a un producto real para que se recuerde en el futuro.
              </AlertDescription>
            </Alert>

            {/* Buscador de productos no encontrados */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar productos no encontrados..."
                  value={unmappedSearchTerm}
                  onChange={(e) => setUnmappedSearchTerm(e.target.value)}
                  className="h-10 pl-9 pr-9 rounded-full"
                />
                {unmappedSearchTerm && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUnmappedSearchTerm('')}
                    className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 p-0 hover:bg-slate-100"
                  >
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                )}
              </div>
            </div>

            {paginatedProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="p-3 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                  <Package className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No hay productos para mostrar</h3>
                <p className="text-sm text-gray-500">
                  {unmappedSearchTerm 
                    ? 'No se encontraron productos que coincidan con la búsqueda'
                    : 'Todos los productos están mapeados correctamente'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {paginatedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50/50 p-3 transition-colors hover:bg-amber-50 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="font-semibold text-sm text-foreground truncate">
                          {cleanProductNameForDisplay(product.name)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6">
                        <span className="flex items-center gap-1">
                          <span className="font-medium">{product.occurrences}</span>
                          {product.occurrences === 1 ? 'aparición' : 'apariciones'}
                        </span>
                        <span>•</span>
                        <span>
                          {product.orderIds.length} pedido{product.orderIds.length !== 1 ? 's' : ''}
                        </span>
                        <span>•</span>
                        <span>
                          Último: {new Date(product.lastSeen).toLocaleDateString('es-CR')}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenMapping(product)}
                      className="ml-4 shrink-0 h-8"
                    >
                      <ArrowRight className="mr-2 h-3.5 w-3.5" />
                      Asignar
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 border-t px-3 py-1.5 bg-gray-50/50">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                  
                  {/* Indicadores de página con puntos */}
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => {
                      const pageNum = i + 1;
                      // Mostrar solo algunos puntos: primeros, últimos, y alrededor de la actual
                      const showDot = 
                        pageNum === 1 || 
                        pageNum === totalPages ||
                        (pageNum >= currentPage - 1 && pageNum <= currentPage + 1) ||
                        (currentPage <= 3 && pageNum <= 5) ||
                        (currentPage >= totalPages - 2 && pageNum >= totalPages - 4);
                      
                      if (!showDot) {
                        // Mostrar puntos suspensivos
                        if (pageNum === currentPage - 2 && currentPage > 4) {
                          return <span key={pageNum} className="text-gray-400 text-[10px]">...</span>;
                        }
                        if (pageNum === currentPage + 2 && currentPage < totalPages - 3) {
                          return <span key={pageNum} className="text-gray-400 text-[10px]">...</span>;
                        }
                        return null;
                      }
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`h-1.5 w-1.5 rounded-full transition-all ${
                            currentPage === pageNum
                              ? 'bg-amber-600 w-4'
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          aria-label={`Ir a página ${pageNum}`}
                        />
                      );
                    })}
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="h-6 w-6 p-0 hover:bg-gray-200"
                  >
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialog para mapear producto */}
      <Dialog open={showMappingDialog} onOpenChange={setShowMappingDialog}>
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[500px] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg leading-tight">
                  Asignar Producto No Encontrado (producto nuevo)
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {selectedUnmapped 
                    ? `Mapear "${cleanProductNameForDisplay(selectedUnmapped.name)}" a un producto del inventario. Este mapeo se guardará automáticamente.`
                    : 'Selecciona el producto real del inventario o crea uno nuevo'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {selectedUnmapped && (
            <div className="space-y-4">
              {/* Producto no encontrado */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-xs font-medium text-amber-900 mb-1">Producto No Encontrado</p>
                <p className="font-semibold text-sm text-foreground">{cleanProductNameForDisplay(selectedUnmapped.name)}</p>
                <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{selectedUnmapped.occurrences} apariciones</span>
                  <span>•</span>
                  <span>{selectedUnmapped.orderIds.length} pedidos</span>
                </div>
              </div>

              {/* Selector de producto real */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Asignar a Producto del Inventario *
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  Selecciona un producto existente, crea uno nuevo o define un combo
                </p>
                <div className="flex gap-2">
                  <Select value={selectedMappedProduct} onValueChange={setSelectedMappedProduct}>
                    <SelectTrigger className="h-10 flex-1">
                      <SelectValue placeholder="Buscar y seleccionar producto..." />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 border-b">
                        <div className="relative">
                          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                          <input
                            type="text"
                            placeholder="Buscar producto..."
                            value={productSearchTerm}
                            onChange={(e) => setProductSearchTerm(e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-8 py-1.5 text-sm"
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <div className="max-h-[300px] overflow-y-auto">
                        {/* Opción para crear combo */}
                        <div className="p-2 border-b bg-purple-50/50">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenComboModal();
                            }}
                            className="w-full justify-start gap-2 h-9 text-xs border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium"
                          >
                            <Layers className="h-3.5 w-3.5" />
                            Crear combo: "{selectedUnmapped ? cleanProductNameForDisplay(selectedUnmapped.name) : productSearchTerm || 'Nuevo Combo'}"
                          </Button>
                        </div>
                        
                        {availableProducts.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            {productSearchTerm.trim() 
                              ? 'No se encontraron productos que coincidan con la búsqueda'
                              : 'No hay productos disponibles en el inventario'}
                          </div>
                        ) : (
                          availableProducts.map((productName) => (
                            <SelectItem key={productName} value={productName}>
                              {productName}
                            </SelectItem>
                          ))
                        )}
                      </div>
                    </SelectContent>
                  </Select>
                  <div className="flex flex-col gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={mappingQuantity}
                      onChange={(e) => setMappingQuantity(parseInt(e.target.value, 10) || 1)}
                      className="w-20 h-10 bg-red-50 border-red-200 text-red-400 cursor-not-allowed"
                      placeholder="1"
                      disabled
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {mappingQuantity > 1 
                    ? `Se creará un combo automático con ${mappingQuantity} unidades de este producto.`
                    : 'Este mapeo se guardará y se aplicará automáticamente en futuros pedidos.'}
                </p>
              </div>

              {/* Vista previa */}
              {selectedMappedProduct && (
                <div className="rounded-lg border border-green-200 bg-green-50/50 p-3">
                  <p className="text-xs font-medium text-green-900 mb-1">Mapeo</p>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-foreground">{cleanProductNameForDisplay(selectedUnmapped.name)}</span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-green-700">
                      {selectedMappedProduct}
                      {mappingQuantity > 1 && (
                        <span className="ml-1 text-xs text-muted-foreground">x{mappingQuantity}</span>
                      )}
                    </span>
                  </div>
                  {mappingQuantity > 1 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Se creará como combo: {selectedMappedProduct} x{mappingQuantity}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowMappingDialog(false)}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
              disabled={isSavingMapping}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMapping}
              disabled={!selectedMappedProduct || isSavingMapping}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
            >
              {isSavingMapping ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isSavingMapping ? 'Guardando...' : 'Guardar Mapeo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para crear nuevo producto */}
      <ProductFormModal
        open={showCreateProductModal}
        onOpenChange={setShowCreateProductModal}
        product={newProductName ? {
          producto: newProductName,
          cantidad: 0,
          tienda: defaultStore || 'ALL STARS',
        } as ProductoInventario : null}
        onSave={handleSaveNewProduct}
        stores={defaultStore ? [defaultStore] : ['ALL STARS', 'Para Machos CR', 'BeautyFan']}
        hideStoreField={!!defaultStore}
        defaultStore={defaultStore}
      />

      {/* Modal para crear combo */}
      <Dialog 
        open={showComboModal} 
        onOpenChange={(open) => {
          setShowComboModal(open);
          if (!open) {
            // Limpiar estados al cerrar
            setComboName('');
            setComboItems([]);
            setSelectedComboProduct('');
            setSelectedComboQuantity(1);
            setComboProductSearchTerm('');
            setEditingComboItemIndex(null);
            setEditingComboItemQuantity(1);
          }
        }}
      >
        <DialogContent className="max-h-[90vh] w-[95vw] max-w-[600px] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-100">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-lg leading-tight">
                  Crear Combo de Productos
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs">
                  {selectedUnmapped 
                    ? `Define el combo para "${cleanProductNameForDisplay(selectedUnmapped.name)}". Agrega productos del inventario con sus cantidades.`
                    : 'Define los productos y cantidades que incluye este combo'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre del combo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Nombre del Combo *
              </label>
              <Input
                value={comboName}
                onChange={(e) => setComboName(e.target.value)}
                placeholder="Ej: Combo Premium, Combo Familiar..."
                className="h-10"
              />
            </div>

            {/* Agregar productos al combo */}
            <div className="space-y-2">
              <label className="text-sm font-semibold">
                Agregar Productos al Combo
              </label>
              <div className="flex gap-2">
                <Select 
                  value={selectedComboProduct} 
                  onValueChange={(value) => {
                    setSelectedComboProduct(value);
                    setComboProductSearchTerm('');
                  }}
                >
                  <SelectTrigger className="h-10 flex-1">
                    <SelectValue placeholder="Seleccionar producto..." />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Buscar producto..."
                          value={comboProductSearchTerm}
                          onChange={(e) => setComboProductSearchTerm(e.target.value)}
                          className="w-full rounded-md border border-input bg-background px-8 py-1.5 text-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                        />
                      </div>
                    </div>
                    <div className="max-h-[250px] overflow-y-auto">
                      {availableComboProducts.length === 0 ? (
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          {comboProductSearchTerm.trim() 
                            ? 'No se encontraron productos que coincidan con la búsqueda'
                            : 'No hay productos disponibles en el inventario'}
                        </div>
                      ) : (
                        availableComboProducts.map((productName) => (
                          <SelectItem key={productName} value={productName}>
                            {productName}
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground">Cant.</label>
                  <Input
                    type="number"
                    min="1"
                    value={selectedComboQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 1;
                      setSelectedComboQuantity(Math.max(1, val));
                    }}
                    className="w-20 h-10"
                    placeholder="1"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-muted-foreground opacity-0">Agregar</label>
                  <Button
                    type="button"
                    onClick={handleAddComboItem}
                    disabled={!selectedComboProduct || selectedComboQuantity < 1}
                    size="sm"
                    className="h-10"
                    title={!selectedComboProduct ? 'Selecciona un producto primero' : 'Agregar al combo'}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {selectedComboProduct && (
                <p className="text-xs text-muted-foreground">
                  Se agregará: <span className="font-medium">{selectedComboProduct}</span> x{selectedComboQuantity}
                </p>
              )}
            </div>

            {/* Lista de productos en el combo */}
            {comboItems.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Productos en el Combo ({comboItems.length})
                </label>
                <div className="space-y-2 max-h-[250px] overflow-y-auto border rounded-lg p-2">
                  {comboItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded border hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Package className="h-4 w-4 text-slate-600 shrink-0" />
                        <span className="text-sm font-medium truncate flex-1">{item.productName}</span>
                        {editingComboItemIndex === index ? (
                          <div className="flex items-center gap-1.5">
                            <Input
                              type="number"
                              min="1"
                              value={editingComboItemQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10) || 1;
                                setEditingComboItemQuantity(Math.max(1, val));
                              }}
                              className="w-16 h-7 text-xs"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSaveEditComboItem(index);
                                } else if (e.key === 'Escape') {
                                  setEditingComboItemIndex(null);
                                }
                              }}
                              autoFocus
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEditComboItem(index)}
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              title="Guardar"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingComboItemIndex(null)}
                              className="h-7 w-7 p-0 text-muted-foreground hover:bg-slate-200"
                              title="Cancelar"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border">
                              x{item.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStartEditComboItem(index)}
                              className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Editar cantidad"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveComboItem(index)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {comboItems.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Total de productos: {comboItems.reduce((sum, item) => sum + item.quantity, 0)} unidades
                  </p>
                )}
              </div>
            )}

            {/* Vista previa */}
            {comboItems.length > 0 && (
              <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                <p className="text-xs font-medium text-purple-900 mb-2">Vista Previa del Combo</p>
                <p className="font-semibold text-sm text-foreground mb-2">{comboName || 'Sin nombre'}</p>
                <div className="space-y-1">
                  {comboItems.map((item, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {item.productName} x{item.quantity}
                    </div>
                  ))}
                </div>
                <div className="mt-2 pt-2 border-t border-purple-200">
                  <p className="text-xs font-semibold text-purple-700">
                    Total: {comboItems.reduce((sum, item) => sum + item.quantity, 0)} unidades
                  </p>
                </div>
              </div>
            )}

            {/* Mensajes de validación */}
            {comboItems.length === 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  Agrega al menos un producto al combo antes de guardar.
                </AlertDescription>
              </Alert>
            )}
            {!comboName.trim() && comboItems.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-900 text-xs">
                  El nombre del combo es requerido.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex-col gap-2 border-t pt-3 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setShowComboModal(false)}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
              disabled={isSavingCombo}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCombo}
              disabled={!comboName.trim() || comboItems.length === 0 || isSavingCombo}
              className="h-9 w-full text-xs sm:w-auto"
              size="sm"
            >
              {isSavingCombo ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isSavingCombo ? 'Guardando...' : 'Guardar Combo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para crear nuevo producto desde el combo */}
      <ProductFormModal
        open={showCreateProductFromComboModal}
        onOpenChange={setShowCreateProductFromComboModal}
        product={newProductNameFromCombo ? {
          producto: newProductNameFromCombo,
          cantidad: 0,
          tienda: defaultStore || 'ALL STARS',
        } as ProductoInventario : null}
        onSave={handleSaveNewProductFromCombo}
        stores={defaultStore ? [defaultStore] : ['ALL STARS', 'Para Machos CR', 'BeautyFan']}
        hideStoreField={!!defaultStore}
        defaultStore={defaultStore}
      />
    </>
  );
}

