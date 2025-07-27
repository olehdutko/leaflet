import { getObjectType, setObjectProperty, applyObjectStyle } from './utils.js';
export function applyObjectProperties(layer, properties) {
    const type = getObjectType(layer);
    // Встановлюємо базові властивості
    setObjectProperty(layer, 'name', properties.name);
    setObjectProperty(layer, 'description', properties.description);
    if (type === 'marker') {
        const iconName = properties.icon || 'place';
        const color = properties.color || '#1976d2';
        layer.setIcon(L.divIcon({
            className: 'custom-marker-icon',
            html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;margin-top:2px;"><i class="material-icons" style="color:#fff;font-size:20px;transform:rotate(45deg);">${iconName}</i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
        }));
        setObjectProperty(layer, 'color', color);
        setObjectProperty(layer, 'icon', iconName);
        layer.options.color = color;
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