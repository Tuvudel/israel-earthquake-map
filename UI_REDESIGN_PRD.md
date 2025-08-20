# UI Redesign PRD - Israel Earthquake Map

## Overview
Comprehensive UI/UX redesign to modernize the earthquake map interface with consistent design language, improved accessibility, and unified mobile/desktop experience using Shoelace components.

## Objectives
1. **Typography**: Implement Manrope font for modern, professional appearance
2. **Component Consistency**: Convert custom controls to Shoelace components
3. **Mobile/Desktop Alignment**: Ensure consistent design and behavior across all screen sizes
4. **Accessibility**: Maintain and improve keyboard navigation and screen reader support
5. **Theme Integration**: Seamless light/dark theme switching with consistent styling

## Current State Analysis

### Header Controls
- **Current**: Custom `.control-btn` elements with different mobile/desktop styling
- **Issues**: Inconsistent hover states, mobile hides text labels, different styling between breakpoints
- **Active State**: Already implemented but needs refinement

### Table Headers
- **Current**: Custom `<th>` elements with `.sortable` class and sort indicators
- **Issues**: Inconsistent with overall design system, limited accessibility features

### Filter Controls
- **Current**: Custom `.custom-multiselect` elements for Country and Area
- **Issues**: Limited keyboard navigation, inconsistent with modern UI patterns
- **Date Filter**: Currently uses noUiSlider for dual-range (will remain unchanged)

### Basemap Toggle
- **Current**: `<sl-switch>` with tooltip "Toggle basemap (Light/Dark)"
- **Issue**: Tooltip text needs updating

## Detailed Requirements

### 1. Typography Implementation
- **Font**: Manrope (400, 600, 700 weights)
- **Fallbacks**: System UI fonts for optimal performance
- **Implementation**: Google Fonts CDN with preconnect optimization

### 2. Header Button Conversion
- **Component**: Convert to `<sl-button>`
- **Sizes**: `size="medium"` (desktop), `size="small"` (mobile)
- **States**: 
  - Default: Neutral background with border
  - Hover: Subtle elevation and color change
  - Active/Filled: When corresponding pane is open
  - Focus: Consistent focus ring using Shoelace tokens
- **Icons**: Maintain current SVG icons as `slot="prefix"`
- **Text**: Always visible (no mobile hiding)

### 3. Table Header Conversion
- **Component**: Convert to `<sl-button variant="text">`
- **Functionality**: Maintain existing sort behavior
- **Indicators**: Keep current sort direction indicators
- **Accessibility**: Proper ARIA attributes for sorting state

### 4. Filter Controls Conversion
- **Country/Area**: Convert to `<sl-select multiple clearable>`
- **Options**: Populate from existing data sources (make sure that when any country is selected, the 'all countries' value is filtered out automatically. same for area)
- **Events**: Handle `sl-change` events for filter updates
- **Styling**: Consistent with other form controls

### 5. Basemap Toggle Update
- **Tooltip**: Change to "Switch light/dark mode"
- **Component**: Keep existing `<sl-switch>` implementation, don't change it's design

### 6. Mobile/Desktop Consistency
- **Responsive Design**: Same components, different sizes
- **Touch Targets**: Minimum 44px on mobile
- **Animations**: Consistent timing and easing
- **Spacing**: Proportional scaling between breakpoints

## Implementation Phases

### Phase 1: Foundation (1-2 hours)
**Files**: `index.html`, `css/base.css`

1. **Typography Setup**
   - Add Manrope font links to `<head>`
   - Update `:root` font-family declaration
   - Verify font loading and fallbacks
   - make sure the Manrope font is appllied to all UI text

2. **CSS Custom Properties Review**
   - Audit existing CSS variables
   - Ensure consistency across light/dark themes
   - Add any missing tokens for new components

### Phase 2: Header Controls (2-3 hours)
**Files**: `index.html`, `css/components/filters/pane.css`, `js/ui/header.js`

1. **Button Conversion**
   - Replace `.control-btn` elements with `<sl-button>`
   - Maintain existing IDs for JavaScript compatibility
   - Add appropriate `size` and `variant` attributes

2. **Styling Updates**
   - Remove custom `.control-btn` CSS
   - Add Shoelace button customization via `::part(base)`
   - Ensure active state styling (filled when pane open)

3. **Basemap Toggle**
   - Update tooltip text to "Switch light/dark mode"

4. **JavaScript Updates**
   - Verify existing event handlers still work
   - Update any CSS selectors if needed

### Phase 3: Table Headers (1-2 hours)
**Files**: `index.html`, `css/components/table.css`, `js/ui/table.js`

1. **Header Conversion**
   - Replace `<th class="sortable">` with `<sl-button>`
   - Use `variant="text"` for minimal appearance
   - Maintain sort indicators and functionality

2. **Styling Updates**
   - Remove custom sortable styles
   - Add Shoelace button customization
   - Ensure proper table layout

3. **JavaScript Updates**
   - Update table controller to work with new button structure
   - Maintain existing sort functionality

### Phase 4: Filter Controls (2-3 hours)
**Files**: `index.html`, `css/components/filters/controls.css`, `js/ui/filters/index.js`

1. **Select Conversion**
   - Replace `.custom-multiselect` with `<sl-select>`
   - Add `multiple` and `clearable` attributes
   - Maintain existing option data

2. **Styling Updates**
   - Remove custom multiselect CSS
   - Add Shoelace select customization
   - Ensure consistent form control appearance

3. **JavaScript Updates**
   - Update filter controller to handle `sl-change` events
   - Maintain existing filter logic and data flow
   - Test filter functionality thoroughly

### Phase 5: Mobile/Desktop Consistency (1-2 hours)
**Files**: `css/responsive.css`, various component CSS files

1. **Responsive Testing**
   - Test all breakpoints (320px, 768px, 1024px+)
   - Verify touch targets on mobile
   - Ensure consistent spacing and sizing

2. **Animation Consistency**
   - Standardize transition timing (180-240ms)
   - Ensure consistent easing functions
   - Test reduced motion preferences

3. **Theme Testing**
   - Verify light/dark theme switching
   - Test component appearance in both themes
   - Ensure proper contrast ratios

## Technical Considerations

### JavaScript Compatibility
- **Event Handling**: Ensure existing event listeners work with new components
- **Data Flow**: Maintain current filter and table update mechanisms
- **State Management**: Preserve existing panel open/close states

### Accessibility
- **Keyboard Navigation**: Test tab order and keyboard interactions
- **Screen Readers**: Verify ARIA attributes and announcements
- **Focus Management**: Ensure proper focus handling during state changes

### Performance
- **Font Loading**: Optimize Manrope font loading with preconnect
- **Component Loading**: Shoelace components are already loaded via CDN
- **Bundle Size**: Minimal impact as we're replacing custom components

### Browser Compatibility
- **Modern Browsers**: Chrome, Firefox, Safari, Edge (last 2 versions)
- **Mobile Browsers**: iOS Safari, Chrome Mobile
- **Fallbacks**: Graceful degradation for older browsers

## Testing Requirements

### Functional Testing
- [ ] Header button toggles work correctly
- [ ] Table sorting functionality preserved
- [ ] Filter controls update map and data
- [ ] Theme switching works properly
- [ ] Mobile responsive behavior

### Visual Testing
- [ ] Light/dark theme appearance
- [ ] Mobile vs desktop consistency
- [ ] Button states (default, hover, active, focus)
- [ ] Typography rendering
- [ ] Component spacing and alignment

### Accessibility Testing
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Focus indicators
- [ ] Color contrast ratios

### Performance Testing
- [ ] Font loading performance
- [ ] Component rendering speed
- [ ] Mobile performance
- [ ] Memory usage

## Success Criteria

### Design Consistency
- ✅ All components use Shoelace design system
- ✅ Consistent spacing, typography, and colors
- ✅ Unified mobile/desktop experience
- ✅ Proper light/dark theme support

### Functionality Preservation
- ✅ All existing features work as expected
- ✅ No regression in user experience
- ✅ Improved accessibility
- ✅ Better keyboard navigation

### Performance
- ✅ No significant performance degradation
- ✅ Fast component rendering
- ✅ Smooth animations and transitions
- ✅ Efficient font loading

### User Experience
- ✅ Intuitive button states and feedback
- ✅ Clear visual hierarchy
- ✅ Consistent interaction patterns
- ✅ Professional, modern appearance

## Risk Mitigation

### High Risk Items
1. **JavaScript Compatibility**: Test thoroughly with existing event handlers
2. **Mobile Responsiveness**: Extensive testing on various screen sizes
3. **Theme Integration**: Verify all components work in both themes

### Mitigation Strategies
1. **Incremental Implementation**: Phase-by-phase rollout
2. **Comprehensive Testing**: Automated and manual testing at each phase
3. **Fallback Plans**: Keep original components as backup during development
4. **User Feedback**: Test with actual users if possible


## Dependencies
- Shoelace 2.20.1 (already loaded)
- Google Fonts CDN
- Existing JavaScript architecture
- Current CSS custom properties system

## Post-Implementation
- Monitor for any regressions
- Gather user feedback
- Document any new patterns for future development
- Consider additional Shoelace component adoption
