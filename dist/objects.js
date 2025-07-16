export function applyObjectProperties(layer, properties) {
    const type = layer && layer instanceof L.Marker && !(layer instanceof L.CircleMarker)
        ? 'marker'
        : layer instanceof L.CircleMarker
            ? 'circle'
            : layer instanceof L.Polygon && !(layer instanceof L.Rectangle)
                ? 'polygon'
                : layer instanceof L.Rectangle
                    ? 'rectangle'
                    : layer instanceof L.Polyline
                        ? 'polyline'
                        : layer instanceof L.ImageOverlay
                            ? 'image'
                            : 'unknown';
    if (!layer.properties)
        layer.properties = {};
    layer.properties.name = properties.name;
    layer.properties.description = properties.description;
    if (type === 'marker') {
        const iconName = properties.icon || 'place';
        layer.setIcon(L.divIcon({
            className: 'custom-marker-icon',
            html: `<div style="background:${properties.color};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;"><i class="material-icons" style="color:#fff;font-size:20px;">${iconName}</i></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 28]
        }));
        layer.properties.color = properties.color;
        layer.properties.icon = iconName;
        layer.options.color = properties.color;
    }
    else if (type === 'polygon' || type === 'circle' || type === 'rectangle') {
        layer.setStyle({
            fillColor: properties.fillColor,
            color: properties.color,
            fillOpacity: properties.fillOpacity,
        });
        layer.properties.color = properties.color;
        layer.properties.fillColor = properties.fillColor;
        layer.properties.fillOpacity = properties.fillOpacity;
        layer.options.color = properties.color;
        layer.options.fillColor = properties.fillColor;
        layer.options.fillOpacity = properties.fillOpacity;
    }
    else if (type === 'polyline') {
        layer.setStyle({
            color: properties.color,
            weight: properties.weight,
            opacity: properties.opacity,
            dashArray: properties.style === 'dashed' ? '10, 10' : properties.style === 'dotted' ? '2, 8' : null
        });
        layer.properties.color = properties.color;
        layer.properties.weight = properties.weight;
        layer.properties.opacity = properties.opacity;
        layer.properties.style = properties.style;
        layer.options.color = properties.color;
        layer.options.weight = properties.weight;
        layer.options.opacity = properties.opacity;
        layer.options.dashArray = properties.style === 'dashed' ? '10, 10' : properties.style === 'dotted' ? '2, 8' : null;
    }
}
