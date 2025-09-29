# 🔗 Sistema de WebSockets en Tiempo Real

Este proyecto incluye un sistema completo de WebSockets que proporciona actualizaciones en tiempo real para todas las operaciones del sistema.

## 🏗️ Arquitectura

### Backend (NestJS)
- **EventsGateway**: Gateway principal de WebSocket usando Socket.IO
- **Eventos automáticos**: Se emiten eventos en todos los servicios (campaigns, content, translations)
- **Rooms por usuario**: Cada usuario se une a su propio room para recibir solo sus notificaciones

### Frontend (Next.js)
- **useWebSocket**: Hook personalizado para manejar conexiones WebSocket
- **NotificationProvider**: Context que maneja notificaciones automáticas
- **useRealTimeUpdates**: Hook para actualizar datos automáticamente
- **ConnectionStatus**: Indicador visual del estado de conexión

## 🚀 Funcionalidades

### Eventos en Tiempo Real
- ✅ **Campaigns**: Creación, actualización, eliminación
- ✅ **Content**: Creación, actualización, eliminación, generación de IA
- ✅ **Translations**: Creación, actualización, eliminación
- ✅ **AI Generation**: Inicio, éxito, fallos de generación

### Notificaciones Toast
- 🎯 Campaigns con emoji específico
- 📝 Content con estados visuales
- 🌍 Translations con idiomas
- 🤖 AI operations con feedback en tiempo real

### Reconexión Automática
- ⚡ Reconexión automática después de desconexión
- 🔄 Re-join a rooms después de reconexión
- ⏱️ Configuración de timeouts y reintentos

## 📝 Uso en Componentes

### Actualizaciones Automáticas de Datos
```tsx
import { useRealTimeUpdates } from '@/hooks/useRealTimeUpdates';

// En tu componente
useRealTimeUpdates({
  onCampaignUpdate: loadCampaigns,    // Refrescar campaigns
  onContentUpdate: loadContent,       // Refrescar content
  onTranslationUpdate: loadTranslations, // Refrescar translations
  campaignId: 'specific-campaign-id', // Opcional: filtrar por campaign
  contentId: 'specific-content-id',   // Opcional: filtrar por content
  enabled: true,                      // Activar/desactivar
});
```

### Hook de WebSocket Directo
```tsx
import { useWebSocket } from '@/hooks/useWebSocket';

const { socket, isConnected, on, off, emit } = useWebSocket();

// Escuchar eventos específicos
useEffect(() => {
  on('content:updated', (data) => {
    console.log('Content updated:', data);
  });

  return () => {
    off('content:updated');
  };
}, [on, off]);
```

## 🔧 Configuración

### Variables de Entorno
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Backend Gateway
```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
```

## 🎨 Componentes UI

### ConnectionStatus
Muestra el estado de conexión en tiempo real:
- 🟢 Verde: "Live updates active" (conectado)
- 🔴 Rojo: "Connecting..." (desconectado)

### Notificaciones Toast
Automáticas para todos los eventos:
- 🎯 Campaign operations
- 📝 Content operations  
- 🌍 Translation operations
- 🤖 AI generation status

## 📊 Eventos Disponibles

### Campaigns
- `campaign:created` - Nueva campaña
- `campaign:updated` - Campaña actualizada
- `campaign:deleted` - Campaña eliminada

### Content
- `content:created` - Nuevo contenido
- `content:updated` - Contenido actualizado
- `content:deleted` - Contenido eliminado

### Translations
- `translation:created` - Nueva traducción
- `translation:updated` - Traducción actualizada
- `translation:deleted` - Traducción eliminada

### AI Operations
- `ai:generation-started` - Generación de IA iniciada
- `ai:generated` - Contenido generado exitosamente
- `ai:generation-failed` - Error en generación

## 🔐 Seguridad

- ✅ Autenticación JWT automática
- ✅ Rooms por usuario (aislamiento de datos)
- ✅ CORS configurado correctamente
- ✅ Validación de permisos en backend

## 🚀 Estado Actual

**✅ COMPLETAMENTE IMPLEMENTADO**

- ✅ Backend Gateway funcionando
- ✅ Frontend hooks implementados
- ✅ Notificaciones automáticas
- ✅ Actualizaciones de datos en tiempo real
- ✅ Reconexión automática
- ✅ Indicador de estado de conexión
- ✅ Integrado en todas las páginas principales

## 🎯 Páginas con Actualizaciones en Tiempo Real

1. **Dashboard** (`/dashboard`): Lista de campaigns se actualiza automáticamente
2. **Campaign Details** (`/campaigns/[id]`): Campaign info y content list se actualizan
3. **Translations** (`/campaigns/[id]/content/[contentId]/translations`): Lista de traducciones se actualiza automáticamente

¡El sistema está completamente funcional y listo para usar! 🚀
