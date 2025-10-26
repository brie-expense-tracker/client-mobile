// Test script to verify console stripping works
console.log('This should be visible in development');
console.warn('This should be visible in development');
console.error('This should be visible in development');

// Test that console is replaced in production builds
if (typeof __DEV__ !== 'undefined' && !__DEV__) {
    console.log('This should NOT be visible in production');
    console.warn('This should NOT be visible in production');
    console.error('This should NOT be visible in production');
}
