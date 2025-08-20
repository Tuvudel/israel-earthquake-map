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

### 1. Typography Implementation ✅ COMPLETED
- **Font**: Manrope (400, 600, 700 weights)
- **Fallbacks**: System UI fonts for optimal performance
- **Implementation**: Google Fonts CDN with preconnect optimization

### 2. Header Button Conversion ✅ COMPLETED
- **Component**: Convert to `<sl-button>`
- **Sizes**: `size="medium"` (desktop), `size="small"` (mobile)
- **States**: 
  - Default: Neutral background with border
  - Hover: Subtle elevation and color change
  - Active/Filled: When corresponding pane is open
  - Focus: Consistent focus ring using Shoelace tokens
- **Icons**: Maintain current SVG icons as `slot="prefix"`
- **Text**: Always visible (no mobile hiding)

### 3. Table Header Conversion ✅ COMPLETED
- **Component**: Convert to `<sl-button variant="text">`
- **Functionality**: Maintain existing sort behavior
- **Indicators**: Keep current sort direction indicators
- **Accessibility**: Proper ARIA attributes for sorting state

### 4. Filter Controls Conversion ✅ COMPLETED
- **Country/Area**: Convert to `<sl-select multiple clearable>`
- **Options**: Populate from existing data sources (make sure that when any country is selected, the 'all countries' value is filtered out automatically. same for area)
- **Events**: Handle `sl-change` events for filter updates
- **Styling**: Consistent with other form controls

### 5. Basemap Toggle Update ✅ COMPLETED
- **Tooltip**: Change to "Switch light/dark mode"
- **Component**: Keep existing `<sl-switch>` implementation, don't change it's design

### 6. Mobile/Desktop Consistency & Layout Improvements
- **Responsive Design**: Same components, different sizes
- **Touch Targets**: Minimum 44px on mobile
- **Animations**: Consistent timing and easing
- **Spacing**: Proportional scaling between breakpoints

#### 6.1 Filter Pane Layout Optimization
- **Magnitude Filter**: Keep on the left (as is)
- **Country/Area Filters**: Stack vertically in the middle, taking more space to the right
- **Date Filter**: Align to the right
- **Mobile Layout**: Ensure no extra bottom space, proper responsive sizing
- **Desktop Layout**: Prevent filters from "smushing together" on browser resize

#### 6.2 "Last Updated" Text Enhancement
- **Current**: "Last updated: [time ago]"
- **New**: "(clock icon) Updated: [time ago]" with small clock icon (matching the 'Recent' button icon)
- **Implementation**: Update HTML structure and styling

#### 6.3 Analytics Pane Header Removal
- **Remove**: "Earthquake Statistics" header from analytics pane
- **Maintain**: Statistics grid layout and functionality

#### 6.4 Events/Analytics Tab Button Consistency
- **Issue**: Highlight line beneath analytics button doesn't align properly
- **Fix**: Ensure proper alignment and consistent animation
- **Improvement**: Consider design enhancements for better site alignment

#### 6.5 Date Filter Button Visibility (Dark Mode)
- **Issue**: Unselected date filter buttons are hard to see in dark mode
- **Fix**: Improve contrast and visibility for unselected states

#### 6.6 Overall Design Consistency Review
- **Colors**: Ensure consistent color usage across all components
- **Themes**: Verify light/dark theme consistency
- **Styles**: Standardize component styling patterns
- **Animations**: Ensure consistent timing and easing functions

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETED
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

### Phase 2: Header Controls ✅ COMPLETED
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

### Phase 3: Table Headers ✅ COMPLETED
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

### Phase 4: Filter Controls ✅ COMPLETED
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

### Phase 5: Basemap Toggle ✅ COMPLETED
**Files**: `index.html`, `js/ui/theme.js`

1. **Tooltip Update**
   - Change tooltip text to "Switch light/dark mode"
   - Maintain existing functionality

### Phase 6: Layout Improvements & Consistency (NEW)
**Files**: `index.html`, `css/components/filters/layout.css`, `css/responsive/`, `js/ui/`

#### 6.1 Filter Pane Layout Optimization ✅ COMPLETED
**Files**: `index.html`, `css/components/filters/layout.css`, `css/responsive/filters.css`

1. **HTML Structure Update**
   - Reorganize filter groups for better layout
   - Stack country/area selects vertically
   - Ensure proper spacing and alignment

2. **CSS Layout Updates**
   - Modify existing `layout.css` for optimal spacing (using flexbox/grid layout)
   - Implement responsive behavior for all screen sizes
   - Fix mobile bottom spacing issues
   - Prevent desktop "smushing" on resize
   - **Parameter Documentation**: Document key CSS variables for easy adjustment

#### 6.2 "Last Updated" Enhancement ✅ COMPLETED
**Files**: `index.html`, `css/components/header.css`

1. **HTML Update**
   - Add clock icon to "last updated" text
   - Change text format to "(clock icon) Updated: [time ago]"

2. **Styling Updates**
   - Style clock icon consistently with other icons
   - Ensure proper alignment and spacing

#### 6.3 Analytics Header Removal ✅ COMPLETED
**Files**: `index.html`, `css/components/statistics.css`

1. **HTML Update**
   - Remove "Earthquake Statistics" header
   - Maintain statistics grid layout

#### 6.4 Tab Button Consistency Fix
**Files**: `css/layout.css`, `js/ui/header.js`

1. **CSS Fixes**
   - Fix highlight line alignment for analytics tab
   - Ensure consistent animation timing
   - Consider design improvements for better alignment

#### 6.5 Dark Mode Date Filter Visibility
**Files**: `css/components/filters/controls.css`

1. **Visibility Improvements**
   - Enhance contrast for unselected date filter buttons in dark mode
   - Ensure proper visibility without compromising design

#### 6.6 Overall Consistency Review
**Files**: All CSS files

1. **Color Consistency**
   - Audit and standardize color usage
   - Ensure proper contrast ratios
   - Verify theme consistency

2. **Animation Consistency**
   - Standardize transition timing (180-240ms)
   - Ensure consistent easing functions
   - Test reduced motion preferences

3. **Component Consistency**
   - Review all component styling patterns
   - Ensure consistent spacing and typography
   - Verify responsive behavior

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
- [x] Header button toggles work correctly
- [x] Table sorting functionality preserved
- [x] Filter controls update map and data
- [x] Theme switching works properly
- [ ] Mobile responsive behavior
- [ ] Filter pane layout responsiveness
- [ ] Date filter button visibility in dark mode
- [ ] Tab button alignment and animation

### Visual Testing
- [x] Light/dark theme appearance
- [ ] Mobile vs desktop consistency
- [x] Button states (default, hover, active, focus)
- [x] Typography rendering
- [ ] Component spacing and alignment
- [ ] Filter pane layout on different screen sizes
- [ ] "Last updated" text with clock icon
- [ ] Analytics pane without header

### Accessibility Testing
- [x] Keyboard navigation
- [x] Screen reader compatibility
- [x] Focus indicators
- [x] Color contrast ratios
- [ ] Updated "last updated" accessibility

### Performance Testing
- [x] Font loading performance
- [x] Component rendering speed
- [ ] Mobile performance
- [ ] Memory usage

## Success Criteria

### Design Consistency
- [x] All components use Shoelace design system
- [ ] Consistent spacing, typography, and colors
- [ ] Unified mobile/desktop experience
- [x] Proper light/dark theme support
- [ ] Filter pane layout optimization
- [ ] Tab button consistency and alignment

### Functionality Preservation
- [x] All existing features work as expected
- [ ] No regression in user experience
- [x] Improved accessibility
- [x] Better keyboard navigation
- [ ] Enhanced responsive behavior

### Performance
- [x] No significant performance degradation
- [x] Fast component rendering
- [ ] Smooth animations and transitions
- [x] Efficient font loading

### User Experience
- [x] Intuitive button states and feedback
- [ ] Clear visual hierarchy
- [x] Consistent interaction patterns
- [x] Professional, modern appearance
- [ ] Improved filter pane usability
- [ ] Better mobile experience

## Risk Mitigation

### High Risk Items
1. **JavaScript Compatibility**: Test thoroughly with existing event handlers
2. **Mobile Responsiveness**: Extensive testing on various screen sizes
3. **Theme Integration**: Verify all components work in both themes
4. **Filter Layout Changes**: Ensure no breaking changes to filter functionality
5. **Mobile/Desktop Consistency**: Ensure identical design and behavior across all screen sizes

### Mitigation Strategies
1. **Incremental Implementation**: Phase-by-phase rollout
2. **Comprehensive Testing**: Automated and manual testing at each phase
3. **Cross-Platform Testing**: Test on multiple devices and screen sizes
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
