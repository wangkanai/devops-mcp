// Jest setup file for global test configuration

// Fail tests on unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection at:', reason);
  throw reason;
});

// Optional: Add custom matchers or global test utilities here
// Example: expect.extend({ toBeValidDate: () => {...} });

// Set longer timeout for integration tests
jest.setTimeout(10000);