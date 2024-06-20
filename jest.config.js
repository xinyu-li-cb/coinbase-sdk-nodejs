module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  extensionsToTreatAsEsm: [".ts"],
  coveragePathIgnorePatterns: ["node_modules", "client", "__tests__"],
  collectCoverage: true,
  collectCoverageFrom: ["./src/coinbase/**"],
  coverageReporters: ["html"],
  verbose: true,
  maxWorkers: 1,
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      statements: 95,
      lines: 95,
    },
  },
};
