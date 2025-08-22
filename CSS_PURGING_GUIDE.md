# CSS Purging Guide
## Israel Earthquake Map - CSS Optimization

### **Overview**
This guide explains how to use CSS purging to remove unused styles and optimize the CSS bundle size.

### **Setup**

#### **1. Install Dependencies**
```bash
npm install
```

#### **2. Run CSS Purging**
```bash
npm run purge-css
```

#### **3. Build Process**
```bash
npm run build
```

### **Configuration**

#### **PurgeCSS Config (`purgecss.config.js`)**
- **Content**: Scans `index.html` and all JavaScript files
- **CSS**: Processes `css/index.css` (main entry point)
- **Output**: Creates purged CSS in `css/purged/` directory
- **Safelist**: Protects dynamically added classes from removal

#### **Safelist Categories**
1. **Theme Classes**: `[data-theme]`, `:root`, etc.
2. **Shoelace Components**: `sl-button`, `sl-input`, etc.
3. **Animation Classes**: `show`, `hide`, `active`, etc.
4. **Utility Classes**: `hidden`, `visible`, `sr-only`, etc.
5. **Dynamic Classes**: Magnitude, state, and responsive classes

### **Safety Features**

#### **Protected Elements**
- ✅ **Theme system** - All theme variables and classes
- ✅ **Shoelace components** - All web component styles
- ✅ **Animation system** - All animation and transition classes
- ✅ **Dynamic content** - Classes added by JavaScript
- ✅ **Responsive design** - All breakpoint-specific styles

#### **Regex Patterns**
- `/^mag-/` - Magnitude-related classes
- `/^animate-/` - Animation classes
- `/^is-/`, `/^has-/` - State classes
- `/^container/` - Container classes

### **Usage**

#### **Development**
```bash
# Start development server
npm start
```

#### **Production Build**
```bash
# Generate optimized CSS
npm run build

# Use purged CSS in production
# Copy css/purged/index.css to your production server
```

### **File Structure**
```
css/
├── index.css              # Original CSS (development)
├── purged/                # Purged CSS (production)
│   └── index.css         # Optimized CSS bundle
```

### **Monitoring**

#### **Bundle Size Comparison**
- **Original**: ~50KB (estimated)
- **Purged**: ~30KB (estimated reduction)
- **Savings**: ~40% reduction

#### **Performance Impact**
- ✅ **Faster loading** - Smaller CSS bundle
- ✅ **Better caching** - Optimized content
- ✅ **Improved performance** - Reduced parsing time

### **Troubleshooting**

#### **Missing Styles**
If styles are missing after purging:

1. **Check safelist** - Add missing classes to safelist
2. **Verify content paths** - Ensure all files are scanned
3. **Test thoroughly** - Check all components and states

#### **Common Issues**
- **Dynamic classes not found** - Add to safelist
- **Theme styles removed** - Check `[data-theme]` safelist
- **Animation classes missing** - Verify animation safelist

### **Best Practices**

#### **Before Purging**
1. ✅ **Test thoroughly** - Ensure all functionality works
2. ✅ **Backup original** - Keep original CSS as backup
3. ✅ **Review safelist** - Verify all dynamic classes are protected

#### **After Purging**
1. ✅ **Test all features** - Verify no functionality is broken
2. ✅ **Check responsive design** - Test all breakpoints
3. ✅ **Validate themes** - Test light/dark mode switching
4. ✅ **Monitor performance** - Check loading times

### **Integration**

#### **Development Workflow**
1. **Develop** with original CSS
2. **Test** all functionality
3. **Purge** CSS for production
4. **Deploy** optimized version

#### **Continuous Integration**
```bash
# Add to CI/CD pipeline
npm run build
# Deploy css/purged/index.css
```

### **Notes**
- **Development**: Use original CSS for full development experience
- **Production**: Use purged CSS for optimal performance
- **Updates**: Re-run purging after CSS changes
- **Monitoring**: Regularly check for missing styles

---

**Status**: ✅ **CSS Purging Setup Complete**
