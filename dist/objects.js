import { getObjectType, setObjectProperty, applyObjectStyle } from './utils.js';
export function applyObjectProperties(layer, properties) {
    console.log('applyObjectProperties: Викликано з layer:', layer);
    console.log('applyObjectProperties: properties:', properties);
    if (!layer) {
        console.error('applyObjectProperties: layer є null або undefined');
        return;
    }
    const type = getObjectType(layer);
    console.log('applyObjectProperties: тип об\'єкта:', type);
    // Встановлюємо базові властивості
    setObjectProperty(layer, 'name', properties.name);
    setObjectProperty(layer, 'description', properties.description);
    if (type === 'marker') {
        console.log('applyObjectProperties: properties.icon =', properties.icon, 'тип:', typeof properties.icon);
        const iconName = properties.icon || 'place';
        const color = properties.color || '#1976d2';
        console.log('applyObjectProperties: встановлюємо іконку маркера:', iconName, 'колір:', color);
        const icon = L.divIcon({
            className: 'custom-marker-icon',
            html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="material-icons" style="color:#fff;font-size:20px;">${iconName}</i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
        });
        console.log('applyObjectProperties: встановлюємо іконку:', icon);
        layer.setIcon(icon);
        setObjectProperty(layer, 'color', color);
        setObjectProperty(layer, 'icon', iconName);
        layer.options.color = color;
        console.log('applyObjectProperties: іконка маркера встановлена. layer.properties:', layer.properties);
    }
    else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        const color = properties.color || '#1976d2';
        const fillColor = properties.fillColor || '#1976d2';
        const fillOpacity = properties.fillOpacity ?? 0.2;
        applyObjectStyle(layer, {
            fillColor: fillColor,
            color: color,
            fillOpacity: fillOpacity,
        });
        setObjectProperty(layer, 'color', color);
        setObjectProperty(layer, 'fillColor', fillColor);
        setObjectProperty(layer, 'fillOpacity', fillOpacity);
    }
    else if (type === 'polyline') {
        const color = properties.color || '#1976d2';
        const weight = properties.weight || 3;
        const opacity = properties.opacity ?? 1;
        const dashArray = properties.style === 'dashed' ? '10, 10' :
            properties.style === 'dotted' ? '2, 8' : null;
        applyObjectStyle(layer, {
            color: color,
            weight: weight,
            opacity: opacity,
            dashArray: dashArray
        });
        setObjectProperty(layer, 'color', color);
        setObjectProperty(layer, 'weight', weight);
        setObjectProperty(layer, 'opacity', opacity);
        setObjectProperty(layer, 'style', properties.style);
    }
}
//# sourceMappingURL=objects.js.map