module.exports = {
  content: [
    './index.html',
    './js/**/*.js',
    './js/**/*.html'
  ],
  css: [
    './css/index.css'
  ],
  output: './css/purged/',
  safelist: [
    // Theme-related classes
    '[data-theme]',
    ':root',
    ':root[data-theme]',
    
    // Shoelace component classes (these are dynamically added)
    'sl-button',
    'sl-input',
    'sl-select',
    'sl-switch',
    'sl-tab',
    'sl-tab-group',
    'sl-tab-panel',
    'sl-badge',
    
    // Animation classes (dynamically added)
    'show',
    'hide',
    'active',
    'inactive',
    'collapsed',
    'expanded',
    'highlighted',
    'selected',
    
    // Utility classes that might be dynamically used
    'hidden',
    'visible',
    'sr-only',
    'focus-visible',
    
    // Magnitude classes (dynamically generated)
    /^mag-/,
    /^magnitude-/,
    
    // Animation classes (dynamically added)
    /^animate-/,
    /^transition-/,
    
    // State classes (dynamically added)
    /^is-/,
    /^has-/,
    /^active$/,
    /^disabled$/,
    /^loading$/,
    
    // Responsive classes
    /^container/,
    /^mobile-/,
    /^tablet-/,
    /^desktop-/
  ],
  defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
  fontFace: true,
  keyframes: true,
  variables: true
}
