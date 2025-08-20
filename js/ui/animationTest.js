// Animation System Test
// Simple test to validate animation controller functionality
(function (global) {
  class AnimationTest {
    constructor() {
      this.testResults = [];
    }

    /**
     * Run all animation tests
     */
    async runTests() {
      console.log('🧪 Running Animation System Tests...');
      
      try {
        // Test 1: Animation Controller Initialization
        await this.testControllerInitialization();
        
        // Test 2: Animation Presets
        await this.testAnimationPresets();
        
        // Test 3: Queue System
        await this.testQueueSystem();
        
        // Test 4: Reduced Motion Support
        await this.testReducedMotion();
        
        // Test 5: CSS Animation Variables
        await this.testCSSVariables();
        
        this.printResults();
      } catch (error) {
        console.error('❌ Animation test failed:', error);
      }
    }

    /**
     * Test animation controller initialization
     */
    async testControllerInitialization() {
      try {
        if (!global.Animations) {
          throw new Error('Animation controller not found');
        }
        
        if (!global.Animations.animationPresets) {
          throw new Error('Animation presets not found');
        }
        
        if (!global.Animations.queueAnimation) {
          throw new Error('Queue animation method not found');
        }
        
        this.addResult('✅ Animation Controller Initialization', true);
      } catch (error) {
        this.addResult('❌ Animation Controller Initialization', false, error.message);
      }
    }

    /**
     * Test animation presets
     */
    async testAnimationPresets() {
      try {
        const presets = global.Animations.animationPresets;
        
        if (!presets.fast || !presets.normal || !presets.slow) {
          throw new Error('Required presets missing');
        }
        
        if (presets.fast.duration !== 150) {
          throw new Error('Fast preset duration incorrect');
        }
        
        if (presets.normal.duration !== 200) {
          throw new Error('Normal preset duration incorrect');
        }
        
        if (presets.slow.duration !== 300) {
          throw new Error('Slow preset duration incorrect');
        }
        
        this.addResult('✅ Animation Presets', true);
      } catch (error) {
        this.addResult('❌ Animation Presets', false, error.message);
      }
    }

    /**
     * Test animation queue system
     */
    async testQueueSystem() {
      try {
        const testElement = document.createElement('div');
        testElement.style.opacity = '1';
        document.body.appendChild(testElement);
        
        // Test queue animation
        const animationPromise = global.Animations.queueAnimation(async () => {
          await global.Animations.fade(testElement, 0.5, 'fast');
        }, 'test-animation');
        
        if (!animationPromise || !animationPromise.id) {
          throw new Error('Queue animation not returning task object');
        }
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Cleanup
        document.body.removeChild(testElement);
        
        this.addResult('✅ Animation Queue System', true);
      } catch (error) {
        this.addResult('❌ Animation Queue System', false, error.message);
      }
    }

    /**
     * Test reduced motion support
     */
    async testReducedMotion() {
      try {
        const originalPrefersReducedMotion = global.Animations.prefersReducedMotion;
        
        // Test that the property exists
        if (typeof global.Animations.prefersReducedMotion !== 'boolean') {
          throw new Error('Reduced motion preference not properly initialized');
        }
        
        // Test that it can be updated
        global.Animations.prefersReducedMotion = true;
        if (!global.Animations.prefersReducedMotion) {
          throw new Error('Reduced motion preference not updatable');
        }
        
        // Restore original value
        global.Animations.prefersReducedMotion = originalPrefersReducedMotion;
        
        this.addResult('✅ Reduced Motion Support', true);
      } catch (error) {
        this.addResult('❌ Reduced Motion Support', false, error.message);
      }
    }

    /**
     * Test CSS animation variables
     */
    async testCSSVariables() {
      try {
        const root = document.documentElement;
        const computedStyle = getComputedStyle(root);
        
        // Test that CSS variables are defined
        const durationFast = computedStyle.getPropertyValue('--animation-duration-fast');
        const durationNormal = computedStyle.getPropertyValue('--animation-duration-normal');
        const easing = computedStyle.getPropertyValue('--animation-easing');
        
        if (!durationFast || !durationNormal || !easing) {
          throw new Error('CSS animation variables not properly defined');
        }
        
        // Test that values are correct
        if (durationFast.trim() !== '150ms') {
          throw new Error('Fast duration variable incorrect');
        }
        
        if (durationNormal.trim() !== '200ms') {
          throw new Error('Normal duration variable incorrect');
        }
        
        this.addResult('✅ CSS Animation Variables', true);
      } catch (error) {
        this.addResult('❌ CSS Animation Variables', false, error.message);
      }
    }

    /**
     * Add test result
     */
    addResult(testName, passed, error = null) {
      this.testResults.push({
        name: testName,
        passed,
        error
      });
    }

    /**
     * Print test results
     */
    printResults() {
      console.log('\n📊 Animation System Test Results:');
      console.log('=====================================');
      
      const passed = this.testResults.filter(r => r.passed).length;
      const total = this.testResults.length;
      
      this.testResults.forEach(result => {
        if (result.passed) {
          console.log(result.name);
        } else {
          console.log(`${result.name}: ${result.error}`);
        }
      });
      
      console.log(`\n🎯 Results: ${passed}/${total} tests passed`);
      
      if (passed === total) {
        console.log('🎉 All animation system tests passed!');
      } else {
        console.log('⚠️  Some tests failed. Check the errors above.');
      }
      
      console.log('=====================================\n');
    }
  }

  // Auto-run tests when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    // Only run tests in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      setTimeout(() => {
        const test = new AnimationTest();
        test.runTests();
      }, 1000); // Wait for all scripts to load
    }
  });

  // Expose for manual testing
  global.AnimationTest = AnimationTest;

})(window);
