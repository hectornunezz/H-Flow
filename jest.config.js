module.exports = {
  clearMocks: true,
  moduleDirectories: ["node_modules", "<rootDir>/hflow-backend/node_modules"],
  modulePathIgnorePatterns: ["<rootDir>/hflow-frontend/.next/"],
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          target: "ES2020",
          module: "CommonJS",
          moduleResolution: "Node",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true,
          types: ["jest", "node"],
        },
      },
    ],
  },
};
