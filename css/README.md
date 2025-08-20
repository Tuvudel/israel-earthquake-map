# CSS Architecture Documentation

## Overview

This CSS architecture follows modern best practices with a modular, component-based approach. The system is designed for maintainability, performance, and accessibility.

## File Structure

```
css/
├── index.css                 # Main entry point
├── base.css                  # Base styles and CSS variables
├── layout.css                # Layout components
├── utilities.css             # Basic utility classes
├── animations.css            # Animation system
├── tokens/                   # Design tokens
│   ├── typography.css        # Typography tokens
│   ├── breakpoints.css       # Breakpoint tokens
│   └── components.css        # Component tokens
├── components/               # Component styles
│   ├── filters/              # Filter components
│   ├── legend.css            # Legend component
│   ├── sidebar.css           # Sidebar component
│   ├── toggles.css           # Toggle components
│   ├── loading.css           # Loading states
│   ├── popup.css             # Popup components
│   └── statistics.css        # Statistics component
├── responsive/               # Responsive styles
│   ├── index.css             # Responsive entry point
│   ├── layout.css            # Responsive layout
│   ├── sidebar.css           # Responsive sidebar
│   ├── filters.css           # Responsive filters
│   ├── legend.css            # Responsive legend
│   ├── map.css               # Responsive map
│   ├── mobile.css            # Mobile-specific styles
│   └── toggles.css           # Responsive toggles
├── utilities/                # Utility classes
│   ├── animations.css        # Animation utilities
│   ├── modern.css            # Modern CSS features
│   ├── performance.css       # Performance optimizations
│   └── accessibility.css     # Accessibility utilities
└── mixins/                   # CSS mixins
    └── shoelace.css          # Shoelace component mixins
```

## Design System

### CSS Variables (Custom Properties)

The design system uses CSS custom properties for consistent theming:

#### Colors
- `--brand-600`: Primary brand color
- `--text-1`, `--text-2`, `--text-3`: Text colors
- `--surface-0`, `--surface-1`: Surface colors
- `--border-1`, `--border-2`: Border colors

#### Spacing
- `--spacing-1` to `--spacing-24`: Consistent spacing scale
- `--radius-1`, `--radius-2`: Border radius values

#### Typography
- `--font-family-primary`: Primary font family
- `--font-size-*`: Font size tokens
- `--line-height-*`: Line height tokens

#### Animation
- `--animation-duration-*`: Animation duration tokens
- `--animation-easing-*`: Animation easing tokens

## Animation System

### Duration Tokens
- `--animation-duration-fast`: 150ms
- `--animation-duration-normal`: 200ms
- `--animation-duration-slow`: 300ms
- `--animation-duration-bounce`: 400ms

### Easing Tokens
- `--animation-easing`: Standard easing
- `--animation-easing-bounce`: Bounce easing
- `--animation-easing-elastic`: Elastic easing
- `--animation-easing-smooth`: Smooth easing

### Utility Classes
- `.hover-lift`: Standard hover lift effect
- `.hover-lift-enhanced`: Enhanced hover lift
- `.interactive`: Interactive element transitions
- `.interactive-button`: Button-like interactions
- `.panel-transition`: Panel opacity transitions
- `.panel-slide`: Panel slide transitions
- `.table-row-hover`: Table row hover effects
- `.stat-item-hover`: Statistics item hover effects

## Performance Optimizations

### Content Visibility
- `.content-visibility-auto`: Optimize off-screen content
- `.content-visibility-hidden`: Hide off-screen content
- `.content-visibility-visible`: Force visible content

### Containment
- `.contain-layout`: Layout containment
- `.contain-paint`: Paint containment
- `.contain-size`: Size containment
- `.contain-style`: Style containment
- `.contain-strict`: Strict containment

### Hardware Acceleration
- `.gpu-accelerated`: Force hardware acceleration
- `.gpu-accelerated-3d`: 3D hardware acceleration
- `.layer`: Create new layers
- `.layer-3d`: Create 3D layers

### Will-Change
- `.will-change-transform`: Optimize transforms
- `.will-change-opacity`: Optimize opacity
- `.will-change-scroll`: Optimize scrolling
- `.will-change-auto`: Reset will-change

## Modern CSS Features

### Logical Properties
- `.logical-padding`: Logical padding
- `.logical-margin`: Logical margin
- `.logical-border`: Logical borders

### Container Queries
- `.container-responsive`: Container-based responsive design
- `@container` queries for component-based layouts

### Modern Selectors
- `.focus-visible`: Focus-visible selector
- `.has-children`: Has selector for conditional styling
- `.is-active`: State-based styling

### Layout Patterns
- `.stack`: Stack layout pattern
- `.cluster`: Cluster layout pattern
- `.sidebar`: Sidebar layout pattern
- `.grid-auto-fit`: Auto-fit grid
- `.grid-auto-fill`: Auto-fill grid

## Accessibility Features

### Focus Management
- `.focus-visible`: Focus-visible styling
- `.focus-ring`: Focus ring utilities
- `.skip-link`: Skip navigation links

### Screen Reader Support
- `.sr-only`: Screen reader only content
- `.sr-only-focusable`: Focusable screen reader content
- `.live-region`: ARIA live regions

### Motion Accessibility
- `.motion-safe`: Respect reduced motion preferences
- Automatic animation disabling for `prefers-reduced-motion`

### High Contrast Support
- `.high-contrast-mode`: High contrast mode support
- `.high-contrast`: High contrast utilities

### Touch Targets
- `.touch-target`: Minimum 44px touch targets
- `.touch-target-large`: Large touch targets

## Responsive Design

### Breakpoints
- Mobile: `< 768px`
- Tablet: `768px - 1024px`
- Desktop: `> 1024px`

### Mobile-First Approach
- Base styles for mobile
- Progressive enhancement for larger screens
- Container queries for component-based responsiveness

## Best Practices

### CSS Organization
1. **Design Tokens First**: Load tokens before other styles
2. **Animation System**: Load animations before base styles
3. **Base Styles**: Foundation styles and variables
4. **Utilities**: Reusable utility classes
5. **Components**: Component-specific styles
6. **Responsive**: Responsive overrides last

### Performance Guidelines
1. **Use CSS Containment**: Apply appropriate containment
2. **Optimize Animations**: Use hardware acceleration
3. **Content Visibility**: Optimize off-screen content
4. **Will-Change**: Use sparingly and reset when done
5. **Reduce Paint**: Minimize layout thrashing

### Accessibility Guidelines
1. **Focus Management**: Ensure visible focus indicators
2. **Color Contrast**: Maintain WCAG AA compliance
3. **Motion Preferences**: Respect user motion preferences
4. **Touch Targets**: Ensure minimum 44px touch targets
5. **Screen Reader Support**: Provide appropriate ARIA attributes

### Maintainability Guidelines
1. **CSS Variables**: Use design tokens consistently
2. **Modular Structure**: Keep components self-contained
3. **Naming Conventions**: Use BEM-like naming
4. **Documentation**: Document complex patterns
5. **Testing**: Test across different devices and browsers

## Usage Examples

### Basic Component
```css
.my-component {
    /* Use design tokens */
    background: var(--surface-0);
    color: var(--text-1);
    padding: var(--spacing-4);
    border-radius: var(--radius-2);
    
    /* Apply animations */
    transition: all var(--animation-duration-fast) var(--animation-easing);
}

.my-component:hover {
    background: var(--surface-1);
    transform: translateY(-1px);
}
```

### Performance Optimized Component
```css
.optimized-component {
    /* Performance optimizations */
    contain: layout style paint;
    content-visibility: auto;
    contain-intrinsic-size: 0 200px;
    
    /* Hardware acceleration */
    will-change: transform;
    transform: translateZ(0);
}
```

### Accessible Component
```css
.accessible-component {
    /* Touch targets */
    min-height: 44px;
    min-width: 44px;
    
    /* Focus management */
    outline: none;
}

.accessible-component:focus-visible {
    outline: 2px solid var(--brand-600);
    outline-offset: 2px;
}
```

## Browser Support

### Modern Features
- CSS Custom Properties: IE11+ (with polyfill)
- CSS Grid: IE11+ (with polyfill)
- CSS Container Queries: Modern browsers
- Logical Properties: Modern browsers
- Content Visibility: Modern browsers

### Fallbacks
- Provide fallbacks for older browsers
- Use `@supports` queries for feature detection
- Progressive enhancement approach

## Performance Monitoring

### Metrics to Track
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)

### Tools
- Lighthouse for performance auditing
- Chrome DevTools for debugging
- WebPageTest for detailed analysis

## Future Considerations

### Planned Improvements
- CSS Container Queries for more responsive components
- CSS Scroll-Driven Animations for scroll-based effects
- CSS Nesting for better organization
- CSS Cascade Layers for better specificity management

### Migration Strategy
- Gradual adoption of new features
- Feature detection for progressive enhancement
- Fallback support for older browsers
- Performance monitoring for impact assessment
