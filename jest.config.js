/** @type {import('jest').Config} */
const config = {
  verbose: true,
  testEnvironment: "node",
  setupFilesAfterEnv: ["jest-extended/all"],
};

module.exports = config;
