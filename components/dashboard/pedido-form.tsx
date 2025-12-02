'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ProductosSelector } from '@/components/dashboard/productos-selector';
import { ProductoInventario } from '@/lib/supabase-inventario';
import { getProvincias, getCantones, getDistritos, getTipoEnvio } from '@/lib/zonas';
import { User, MapPin, Truck, FileText, Package, ClipboardPaste } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface PedidoFormData {
  cliente_nombre: string;
  cliente_telefono: string;
  direccion: string;
  provincia: string;
  canton: string;
  distrito: string;
  valor_total: string;
  productos: string;
  link_ubicacion: string;
  nota_asesor: string;
  confirmado: 'true' | 'false';
  tipo_envio: string;
}

interface ProductoSeleccionado {
  nombre: string;
  stock: number;
  cantidad: number;
}

interface PedidoFormProps {
  formData: PedidoFormData;
  onFormDataChange: (data: PedidoFormData) => void;
  productosSeleccionados: ProductoSeleccionado[];
  onProductosChange: (productos: ProductoSeleccionado[]) => void;
  productosDisponibles: ProductoInventario[];
  asesorTienda: string;
  mode?: 'create' | 'edit' | 'view';
  onValidationChange?: (isValid: boolean) => void;
}

export function PedidoForm({
  formData,
  onFormDataChange,
  productosSeleccionados,
  onProductosChange,
  productosDisponibles,
  asesorTienda,
  mode = 'create',
  onValidationChange,
}: PedidoFormProps) {
  const isReadOnly = mode === 'view';
  
  const provincias = getProvincias();
  
  // Normalizar provincia para encontrar coincidencia (comparar sin importar mayúsculas/minúsculas y acentos)
  const normalizeString = (s: string) => (s || '').toString().trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const provinciaEncontrada = formData.provincia 
    ? provincias.find(p => normalizeString(p) === normalizeString(formData.provincia)) || formData.provincia
    : '';
  
  const cantones = provinciaEncontrada ? getCantones(provinciaEncontrada) : [];
  const distritos = provinciaEncontrada && formData.canton ? getDistritos(provinciaEncontrada, formData.canton) : [];
  
  // Normalizar canton y distrito también
  const cantonEncontrado = formData.canton && cantones.length > 0
    ? cantones.find(c => normalizeString(c) === normalizeString(formData.canton)) || formData.canton
    : formData.canton;
  
  const distritoEncontrado = cantonEncontrado && distritos.length > 0
    ? distritos.find(d => normalizeString(d) === normalizeString(formData.distrito)) || formData.distrito
    : formData.distrito;
  
  // Calcular tipo de envío automáticamente cuando cambian provincia, cantón o distrito
  const tipoEnvioCalculado = formData.provincia && formData.canton && formData.distrito 
    ? getTipoEnvio(formData.provincia, formData.canton, formData.distrito) 
    : null;
  
  // Actualizar tipo_envio automáticamente cuando se completa provincia, cantón y distrito
  useEffect(() => {
    if (tipoEnvioCalculado && mode !== 'view') {
      onFormDataChange({
        ...formData,
        tipo_envio: tipoEnvioCalculado,
      });
    }
  }, [tipoEnvioCalculado]);

  // Validación del formulario
  const isFormValid = useMemo(() => {
    if (mode === 'view') return true;
    
    // Validar campos obligatorios del cliente
    if (!formData.cliente_nombre?.trim()) return false;
    if (!formData.cliente_telefono?.trim()) return false;
    
    // Validar ubicación completa
    if (!formData.direccion?.trim()) return false;
    if (!formData.provincia) return false;
    if (!formData.canton) return false;
    if (!formData.distrito) return false;
    
    // Validar que haya al menos un producto
    if (productosSeleccionados.length === 0) return false;
    
    // Validar valor total
    const valorTotal = Number(formData.valor_total || 0);
    if (isNaN(valorTotal) || valorTotal <= 0) return false;
    
    // Validar tipo de envío
    const tipoEnvioFinal = formData.tipo_envio || tipoEnvioCalculado;
    if (!tipoEnvioFinal) return false;
    
    // Validar que haya tienda asignada
    if (!asesorTienda) return false;
    
    // Validar formato de teléfono
    if (formData.cliente_telefono && !/^\d+$/.test(formData.cliente_telefono)) return false;
    
    // Validar formato de URL
    if (formData.link_ubicacion && !/^https?:\/\/.+/.test(formData.link_ubicacion)) return false;
    
    return true;
  }, [formData, productosSeleccionados, tipoEnvioCalculado, asesorTienda, mode]);

  // Notificar cambios en la validación
  useEffect(() => {
    onValidationChange?.(isFormValid);
  }, [isFormValid, onValidationChange]);

  const updateField = (field: keyof PedidoFormData, value: any) => {
    if (isReadOnly) return;
    onFormDataChange({
      ...formData,
      [field]: value,
    });
  };

  const handlePasteFromClipboard = async () => {
    if (isReadOnly) return;
    try {
      const text = await navigator.clipboard.readText();
      // Validar que sea una URL válida
      if (text && (/^https?:\/\/.+/.test(text) || text.startsWith('http://') || text.startsWith('https://'))) {
        // Si no tiene protocolo, agregar https://
        const url = text.startsWith('http://') || text.startsWith('https://') ? text : `https://${text}`;
        updateField('link_ubicacion', url);
      } else {
        // Si no es una URL válida, intentar agregar https://
        updateField('link_ubicacion', text);
      }
    } catch (err) {
      console.error('Error al leer el portapapeles:', err);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-2 py-1">
      {/* Bento 1: Información del Cliente */}
      <Card className="col-span-12 md:col-span-6 lg:col-span-5 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 p-2">
        <CardHeader className="pb-1 px-0 pt-0">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1">
            <User className="w-3 h-3 text-blue-600" />
            Cliente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-0 pb-0">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Nombre <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.cliente_nombre} 
              onChange={(e) => updateField('cliente_nombre', e.target.value)} 
              placeholder="Nombre del cliente" 
              className="bg-white h-7 text-[11px] py-1 px-2" 
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Teléfono <span className="text-red-500">*</span></Label>
            <Input 
              type="tel"
              value={formData.cliente_telefono} 
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d+$/.test(value)) {
                  updateField('cliente_telefono', value);
                }
              }} 
              placeholder="88888888" 
              className="bg-white h-7 text-[11px] py-1 px-2" 
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Valor Total (CRC) <span className="text-red-500">*</span></Label>
            <Input 
              type="number" 
              min="0" 
              step="1"
              value={formData.valor_total} 
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                  updateField('valor_total', value);
                }
              }} 
              className="bg-white h-7 text-[11px] py-1 px-2" 
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bento 2: Ubicación */}
      <Card className="col-span-12 md:col-span-6 lg:col-span-7 bg-gradient-to-br from-green-50 to-green-100 border-green-200 p-2">
        <CardHeader className="pb-1 px-0 pt-0">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1">
            <MapPin className="w-3 h-3 text-green-600" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-0 pb-0">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Dirección <span className="text-red-500">*</span></Label>
            <Input 
              value={formData.direccion} 
              onChange={(e) => updateField('direccion', e.target.value)} 
              placeholder="Dirección completa" 
              className="bg-white h-7 text-[11px] py-1 px-2" 
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium text-gray-700">Provincia <span className="text-red-500">*</span></Label>
              <Select 
                value={provinciaEncontrada || formData.provincia || undefined} 
                onValueChange={(v) => updateField('provincia', v)} 
                disabled={isReadOnly}
              >
                <SelectTrigger className="bg-white h-7 text-[11px] py-1 px-2">
                  <SelectValue placeholder="Provincia">
                    {provinciaEncontrada || formData.provincia || "Provincia"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  {provincias.map(p => (
                    <SelectItem key={p} value={p} className="text-[11px] py-1">{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.provincia && !provinciaEncontrada && (
                <p className="text-[9px] text-orange-600 mt-0.5">
                  ⚠️ "{formData.provincia}" no coincide exactamente con las opciones disponibles
                </p>
              )}
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium text-gray-700">Cantón <span className="text-red-500">*</span></Label>
              <Select 
                value={cantonEncontrado || formData.canton} 
                onValueChange={(v) => updateField('canton', v)} 
                disabled={isReadOnly || !provinciaEncontrada}
              >
                <SelectTrigger className="bg-white h-7 text-[11px] py-1 px-2">
                  <SelectValue placeholder={formData.canton || "Cantón"}>
                    {formData.canton || "Cantón"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  {cantones.map(c => (
                    <SelectItem key={c} value={c} className="text-[11px] py-1">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-0.5">
              <Label className="text-[10px] font-medium text-gray-700">Distrito <span className="text-red-500">*</span></Label>
              <Select 
                value={distritoEncontrado || formData.distrito} 
                onValueChange={(v) => updateField('distrito', v)} 
                disabled={isReadOnly || !cantonEncontrado}
              >
                <SelectTrigger className="bg-white h-7 text-[11px] py-1 px-2">
                  <SelectValue placeholder={formData.distrito || "Distrito"}>
                    {formData.distrito || "Distrito"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="text-[11px]">
                  {distritos.map(d => (
                    <SelectItem key={d} value={d} className="text-[11px] py-1">{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bento 3: Configuración de Envío y Pago */}
      <Card className="col-span-12 md:col-span-6 lg:col-span-7 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 p-2">
        <CardHeader className="pb-1 px-0 pt-0">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1">
            <Truck className="w-3 h-3 text-orange-600" />
            Envío y Pago
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-0 pb-0">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Tipo de envío <span className="text-red-500">*</span></Label>
            <Select 
              value={formData.tipo_envio || ''} 
              onValueChange={(v) => updateField('tipo_envio', v)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="bg-white h-7 text-[11px] py-1 px-2">
                <SelectValue placeholder="Seleccione el tipo de envío" />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="CONTRAENTREGA" className="text-[11px] py-1">Contra Entrega</SelectItem>
                <SelectItem value="RED LOGISTIC" className="text-[11px] py-1">Mensajería Externa (Red Logistic)</SelectItem>
              </SelectContent>
            </Select>
            {tipoEnvioCalculado && !formData.tipo_envio && mode !== 'view' && (
              <p className="text-[9px] text-purple-600 mt-0.5 font-medium">
                💡 {tipoEnvioCalculado === 'CONTRAENTREGA' ? 'Contra Entrega' : 'Mensajería Externa'} (calculado automáticamente)
              </p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Estado de confirmación</Label>
            <Select 
              value={formData.confirmado} 
              onValueChange={(v) => updateField('confirmado', v)}
              disabled={isReadOnly}
            >
              <SelectTrigger className="bg-white h-7 text-[11px] py-1 px-2">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent className="text-[11px]">
                <SelectItem value="true" className="text-[11px] py-1">✅ Confirmado</SelectItem>
                <SelectItem value="false" className="text-[11px] py-1">⏳ Pendiente confirmación</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bento 4: Información Adicional */}
      <Card className="col-span-12 md:col-span-6 lg:col-span-5 bg-gradient-to-br from-indigo-50 to-indigo-100 border-indigo-200 p-2">
        <CardHeader className="pb-1 px-0 pt-0">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1">
            <FileText className="w-3 h-3 text-indigo-600" />
            Adicional
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1.5 px-0 pb-0">
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Link</Label>
            <div className="relative">
              <Input 
                type="url"
                value={formData.link_ubicacion} 
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '' || /^https?:\/\/.+/.test(value)) {
                    updateField('link_ubicacion', value);
                  }
                }} 
                placeholder="https://maps.google.com/..." 
                className="bg-white h-7 text-[11px] py-1 px-2 pr-8" 
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handlePasteFromClipboard}
                  className="absolute right-1 top-0.5 h-6 w-6 p-0 hover:bg-indigo-100 text-indigo-600"
                  title="Pegar desde portapapeles"
                >
                  <ClipboardPaste className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
            {formData.link_ubicacion && !/^https?:\/\/.+/.test(formData.link_ubicacion) && mode !== 'view' && (
              <p className="text-[9px] text-red-500 mt-0.5">Ingrese una URL válida (debe comenzar con http:// o https://)</p>
            )}
          </div>
          <div className="space-y-0.5">
            <Label className="text-[10px] font-medium text-gray-700">Nota asesor</Label>
            <Textarea 
              value={formData.nota_asesor} 
              onChange={(e) => updateField('nota_asesor', e.target.value)} 
              rows={2} 
              className="bg-white resize-none text-[11px] py-1 px-2 min-h-[45px]" 
              disabled={isReadOnly}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bento 5: Productos */}
      <Card className="col-span-12 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 p-2">
        <CardHeader className="pb-1 px-0 pt-0">
          <CardTitle className="text-[11px] font-medium flex items-center gap-1">
            <Package className="w-3 h-3 text-purple-600" />
            Productos <span className="text-red-500">*</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 px-0 pb-0 space-y-2">
          {isReadOnly ? (
            <div className="text-sm text-gray-700 py-2">
              {formData.productos || 'No especificados'}
            </div>
          ) : (
            <>
              {/* Mostrar texto de productos si existe pero no se pudo parsear */}
              {formData.productos && formData.productos.trim() && productosSeleccionados.length === 0 && (
                <div className="bg-white p-2 rounded border border-purple-200">
                  <Label className="text-[10px] font-medium text-gray-700 mb-1 block">Productos (texto original):</Label>
                  <div className="text-xs text-gray-800 font-mono">{formData.productos}</div>
                </div>
              )}
              <ProductosSelector
                productos={productosSeleccionados}
                productosDisponibles={productosDisponibles}
                onProductosChange={(productos) => {
                  onProductosChange(productos);
                  onFormDataChange({
                    ...formData,
                    productos: productos.length > 0
                      ? productos.map((p) => `${p.cantidad} X ${p.nombre}`).join(', ')
                      : formData.productos, // Mantener el texto original si no hay productos parseados
                  });
                }}
              />
              {/* Campo de texto para editar directamente si es necesario */}
              {mode === 'edit' && (
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-medium text-gray-700">Texto de productos (editar directamente):</Label>
                  <Textarea
                    value={formData.productos || ''}
                    onChange={(e) => updateField('productos', e.target.value)}
                    placeholder="Ej: GOTAS CLOROFILA x2, KING MAKER x1"
                    className="bg-white resize-none text-[11px] py-1 px-2 min-h-[60px]"
                    rows={2}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
