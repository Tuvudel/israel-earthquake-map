module.exports = {
  extends: [
    'stylelint-config-standard',
    'stylelint-config-recommended',
  ],
  
  plugins: [
    'stylelint-order',
    'stylelint-scss',
  ],
  
  rules: {
    // ===== ITCSS ENFORCEMENT =====
    
    // Enforce import order (ITCSS hierarchy)
    'order/order': [
      'custom-properties',
      'dollar-variables',
      'declarations',
      'rules',
      'at-rules',
    ],
    
    // Enforce property order (Layout → Visual → Interactive)
    'order/properties-order': [
      // Layout
      'position',
      'top',
      'right',
      'bottom',
      'left',
      'z-index',
      'display',
      'flex',
      'flex-direction',
      'flex-wrap',
      'flex-basis',
      'flex-grow',
      'flex-shrink',
      'align-items',
      'align-content',
      'justify-content',
      'order',
      'grid',
      'grid-template',
      'grid-template-areas',
      'grid-template-rows',
      'grid-template-columns',
      'grid-area',
      'grid-row',
      'grid-column',
      'grid-gap',
      'grid-row-gap',
      'grid-column-gap',
      'float',
      'clear',
      
      // Box Model
      'width',
      'min-width',
      'max-width',
      'height',
      'min-height',
      'max-height',
      'margin',
      'margin-top',
      'margin-right',
      'margin-bottom',
      'margin-left',
      'padding',
      'padding-top',
      'padding-right',
      'padding-bottom',
      'padding-left',
      'border',
      'border-width',
      'border-style',
      'border-color',
      'border-top',
      'border-top-width',
      'border-top-style',
      'border-top-color',
      'border-right',
      'border-right-width',
      'border-right-style',
      'border-right-color',
      'border-bottom',
      'border-bottom-width',
      'border-bottom-style',
      'border-bottom-color',
      'border-left',
      'border-left-width',
      'border-left-style',
      'border-left-color',
      'border-radius',
      'border-top-left-radius',
      'border-top-right-radius',
      'border-bottom-right-radius',
      'border-bottom-left-radius',
      'border-image',
      'border-image-source',
      'border-image-slice',
      'border-image-width',
      'border-image-outset',
      'border-image-repeat',
      'outline',
      'outline-width',
      'outline-style',
      'outline-color',
      'outline-offset',
      
      // Typography
      'color',
      'font',
      'font-family',
      'font-size',
      'font-style',
      'font-variant',
      'font-weight',
      'font-stretch',
      'font-size-adjust',
      'line-height',
      'letter-spacing',
      'text-align',
      'text-align-last',
      'text-decoration',
      'text-decoration-color',
      'text-decoration-line',
      'text-decoration-style',
      'text-decoration-skip',
      'text-underline-position',
      'text-underline-offset',
      'text-indent',
      'text-justify',
      'text-outline',
      'text-transform',
      'text-wrap',
      'text-overflow',
      'text-emphasis',
      'text-emphasis-color',
      'text-emphasis-style',
      'text-emphasis-position',
      'text-shadow',
      'white-space',
      'word-spacing',
      'word-wrap',
      'word-break',
      'tab-size',
      'hyphens',
      'content',
      'quotes',
      'counter-reset',
      'counter-increment',
      'resize',
      'cursor',
      'user-select',
      'nav-index',
      'nav-up',
      'nav-right',
      'nav-down',
      'nav-left',
      
      // Visual
      'background',
      'background-color',
      'background-image',
      'background-repeat',
      'background-attachment',
      'background-position',
      'background-position-x',
      'background-position-y',
      'background-clip',
      'background-origin',
      'background-size',
      'box-shadow',
      'fill',
      'stroke',
      'opacity',
      'filter',
      'backdrop-filter',
      'mix-blend-mode',
      'isolation',
      
      // Interactive
      'transition',
      'transition-delay',
      'transition-timing-function',
      'transition-duration',
      'transition-property',
      'transform',
      'transform-origin',
      'animation',
      'animation-name',
      'animation-duration',
      'animation-play-state',
      'animation-timing-function',
      'animation-delay',
      'animation-iteration-count',
      'animation-direction',
      'scroll-behavior',
      'scroll-margin',
      'scroll-padding',
      'overscroll-behavior',
      'overscroll-behavior-x',
      'overscroll-behavior-y',
      'scroll-snap-type',
      'scroll-snap-align',
      'scroll-snap-stop',
      
      // Misc
      'appearance',
      'clip',
      'clip-path',
      'mask',
      'mask-border',
      'mask-border-source',
      'mask-border-slice',
      'mask-border-width',
      'mask-border-outset',
      'mask-border-repeat',
      'mask-border-mode',
      'mask-type',
      'mask-composite',
      'mask-mode',
      'mask-origin',
      'mask-position',
      'mask-repeat',
      'mask-size',
      'mask-clip',
      'mask-image',
      'pointer-events',
      'overflow',
      'overflow-x',
      'overflow-y',
      'overflow-wrap',
      'overflow-anchor',
      'overflow-block',
      'overflow-inline',
      'overflow-clip-margin',
      'contain',
      'contain-intrinsic-size',
      'contain-intrinsic-block-size',
      'contain-intrinsic-inline-size',
      'contain-intrinsic-width',
      'contain-intrinsic-height',
      'box-sizing',
      'display',
      'empty-cells',
      'table-layout',
      'caption-side',
      'border-spacing',
      'border-collapse',
      'content-visibility',
      'contain-layout',
      'contain-style',
      'contain-paint',
      'contain-size',
      'contain-intrinsic-size',
      'contain-intrinsic-block-size',
      'contain-intrinsic-inline-size',
      'contain-intrinsic-width',
      'contain-intrinsic-height',
      'contain-intrinsic-min-width',
      'contain-intrinsic-min-height',
      'contain-intrinsic-max-width',
      'contain-intrinsic-max-height',
    ],
    
    // ===== DESIGN TOKEN ENFORCEMENT =====
    
    // Enforce use of CSS custom properties for colors
    'color-no-hex': true,
    'color-named': 'never',
    
    // Enforce use of design tokens for spacing
    'declaration-property-value-allowed-list': {
      'margin': ['0', 'var(--spacing-xs)', 'var(--spacing-sm)', 'var(--spacing-md)', 'var(--spacing-lg)', 'var(--spacing-xl)', 'auto'],
      'padding': ['0', 'var(--spacing-xs)', 'var(--spacing-sm)', 'var(--spacing-md)', 'var(--spacing-lg)', 'var(--spacing-xl)'],
      'font-size': ['var(--font-size-xs)', 'var(--font-size-sm)', 'var(--font-size-base)', 'var(--font-size-lg)', 'var(--font-size-xl)', 'var(--font-size-2xl)', 'var(--font-size-3xl)'],
      'border-radius': ['0', 'var(--border-radius-sm)', 'var(--border-radius-md)', 'var(--border-radius-lg)', '50%'],
    },
    
    // ===== NAMING CONVENTIONS =====
    
    // Enforce BEM methodology
    'selector-class-pattern': '^[a-z]([a-z0-9-]+)?(__([a-z0-9]+-?)+)?(--([a-z0-9]+-?)+){0,2}$',
    
    // Enforce kebab-case for custom properties
    'custom-property-pattern': '^[a-z][a-z0-9-]+$',
    
    // ===== ACCESSIBILITY =====
    
    // Enforce focus styles
    'selector-pseudo-class-no-unknown': [
      true,
      {
        ignorePseudoClasses: ['focus-visible', 'focus-within'],
      },
    ],
    
    // ===== PERFORMANCE =====
    
    // Prevent deep nesting (max 3 levels)
    'max-nesting-depth': 3,
    
    // Prevent universal selectors
    'selector-no-universal': true,
    
    // Prevent ID selectors
    'selector-no-id': true,
    
    // Prevent attribute selectors when possible
    'selector-no-attribute': true,
    
    // ===== CODE QUALITY =====
    
    // Enforce consistent spacing
    'declaration-block-semicolon-newline-after': 'always',
    'declaration-block-trailing-semicolon': 'always',
    'block-closing-brace-newline-after': 'always',
    'block-opening-brace-newline-after': 'always',
    'block-opening-brace-space-before': 'always',
    
    // Enforce consistent quotes
    'string-quotes': 'single',
    
    // Enforce consistent units
    'unit-allowed-list': ['px', 'em', 'rem', '%', 'deg', 'ms', 's', 'vh', 'vw', 'fr', 'auto', '0'],
    
    // Prevent duplicate properties
    'declaration-block-no-duplicate-properties': true,
    
    // Prevent empty rules
    'block-no-empty': true,
    
    // Prevent empty sources
    'no-empty-source': true,
    
    // Prevent invalid hex colors
    'color-no-invalid-hex': true,
    
    // Prevent units on zero values
    'length-zero-no-unit': true,
    
    // Prevent vendor prefixes (use autoprefixer)
    'property-no-vendor-prefix': true,
    'value-no-vendor-prefix': true,
    'selector-no-vendor-prefix': true,
    
    // ===== SCIENTIFIC VISUALIZATION SPECIFIC =====
    
    // Allow specific color values for magnitude indicators
    'declaration-property-value-allowed-list': {
      'color': [
        'var(--mag-minor)',
        'var(--mag-light)', 
        'var(--mag-moderate)',
        'var(--mag-strong)',
        'var(--mag-major)',
        'var(--text-1)',
        'var(--text-2)',
        'var(--text-3)',
        'var(--text-muted)',
        'var(--text-on-accent)',
        'inherit',
        'transparent',
        'currentColor',
      ],
    },
    
    // ===== OVERRIDES =====
    
    // Allow important for utility classes
    'declaration-no-important': [
      true,
      {
        ignore: ['utilities'],
      },
    ],
    
    // Allow vendor prefixes for specific properties
    'property-no-vendor-prefix': [
      true,
      {
        ignoreProperties: ['appearance', 'user-select'],
      },
    ],
  },
  
  // ===== FILE-SPECIFIC RULES =====
  
  overrides: [
    {
      files: ['**/tokens/**/*.css'],
      rules: {
        // Tokens files should only contain custom properties
        'selector-max-id': 0,
        'selector-max-class': 0,
        'selector-max-type': 0,
        'selector-max-universal': 0,
        'selector-max-attribute': 0,
        'selector-max-pseudo-class': 0,
        'selector-max-combinators': 0,
        'selector-max-compound-selectors': 0,
      },
    },
    {
      files: ['**/utilities/**/*.css'],
      rules: {
        // Utilities can use important
        'declaration-no-important': null,
        // Utilities can be more specific
        'selector-max-compound-selectors': 2,
      },
    },
    {
      files: ['**/themes/**/*.css'],
      rules: {
        // Themes can override component styles
        'selector-max-specificity': '0,2,1',
        // Themes can use attribute selectors
        'selector-no-attribute': null,
      },
    },
  ],
  
  // ===== IGNORE PATTERNS =====
  
  ignoreFiles: [
    'node_modules/**/*',
    'dist/**/*',
    'build/**/*',
    '**/*.min.css',
    '**/vendor/**/*',
    '**/third-party/**/*',
  ],
  
  // ===== REPORTING =====
  
  reportDescriptionlessDisables: true,
  reportInvalidScopeDisables: true,
  reportNeedlessDisables: true,
  
  // ===== SEVERITY LEVELS =====
  
  defaultSeverity: 'error',
  
  // ===== CUSTOM MESSAGES =====
  
  message: {
    rejected: 'This violates our ITCSS methodology and design system guidelines.',
    'color-no-hex': 'Use CSS custom properties for colors instead of hex values.',
    'selector-no-id': 'Use classes instead of IDs for styling to maintain low specificity.',
    'max-nesting-depth': 'Deep nesting increases specificity and makes styles harder to maintain.',
  },
};
