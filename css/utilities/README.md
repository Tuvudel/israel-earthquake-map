# CSS Utilities Documentation

## Overview
This directory contains utility classes organized by functionality. All utilities are designed to be composable and follow modern CSS best practices.

## File Structure

### `animations.css`
Animation utility classes for common transitions and transforms.
- `.animate-fade-in` - Fade in animation
- `.animate-slide-up` - Slide up animation
- `.animate-scale` - Scale animation
- `.animate-bounce` - Bounce animation

### `keyframes.css`
Custom keyframe animations for complex animations.
- `@keyframes fadeIn` - Fade in keyframes
- `@keyframes slideUp` - Slide up keyframes
- `@keyframes scale` - Scale keyframes
- `@keyframes bounce` - Bounce keyframes

### `modern.css`
Modern CSS features and contemporary utilities.
- **Container Queries**: `.container-responsive` (future use)
- **Logical Properties**: `.logical-padding`, `.logical-margin`, `.logical-border` (RTL support)
- **Grid Utilities**: `.grid-auto-fit`, `.grid-auto-fill` (responsive grids)
- **Flexbox Utilities**: `.flex-center`, `.flex-between`, etc.
- **Container Classes**: `.container` (responsive container)

### `performance.css`
Performance optimization utilities.
- **Content Visibility**: `.content-visibility-auto`, `.content-visibility-hidden`, `.content-visibility-visible`
- **Containment**: `.contain-layout`, `.contain-paint`, `.contain-strict`
- **Will Change**: `.will-change-transform`, `.will-change-opacity`
- **Hardware Acceleration**: `.gpu-accelerated`, `.gpu-accelerated-3d`
- **Layer Creation**: `.layer`, `.layer-3d`

### `accessibility.css`
Accessibility-focused utilities.
- **Focus Management**: `.focus-visible`, `.focus-ring`
- **Screen Reader**: `.sr-only`, `.sr-only-focusable`, `.hidden`
- **Skip Links**: `.skip-link`
- **ARIA Utilities**: `[aria-expanded]` selectors
- **Color Contrast**: `.high-contrast`, `.high-contrast-text`

## Usage Guidelines

### Performance Utilities
Apply performance utilities to large components:
```css
.large-component {
    content-visibility: auto;
    contain-intrinsic-size: 0 500px;
    contain: layout style paint;
}
```

### Accessibility Utilities
Use accessibility utilities for better user experience:
```css
.interactive-element {
    /* Apply focus ring utility */
}
```

### Modern Utilities
Use modern utilities for responsive design:
```css
.responsive-container {
    /* Use container queries when supported */
}
```

## Future Considerations

### Container Queries
Container queries are available for future use when browser support improves:
```css
@container (min-width: 400px) {
    .container-responsive {
        /* Responsive layout */
    }
}
```

### Logical Properties
Logical properties are ready for RTL support:
```css
.rtl-ready {
    padding-block: var(--spacing-4);
    padding-inline: var(--spacing-6);
}
```

### Performance Optimization
Performance utilities are applied to large components:
- Sidebar: `content-visibility: visible` with `contain-intrinsic-size`
- Table: `content-visibility: auto` for large datasets
- Map: Hardware acceleration and containment

## Best Practices

1. **Use utilities for common patterns** - Don't reinvent the wheel
2. **Apply performance utilities to large components** - Improve rendering performance
3. **Use accessibility utilities for interactive elements** - Ensure WCAG compliance
4. **Keep utilities composable** - Combine multiple utilities as needed
5. **Document new utilities** - Add comments for future developers

## Browser Support

- **Modern browsers**: Full support for all utilities
- **Legacy browsers**: Graceful degradation for modern features
- **Performance utilities**: Progressive enhancement
- **Accessibility utilities**: Universal support
