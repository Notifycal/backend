const OLD_ENV = JSON.parse(JSON.stringify(process.env));

global.beforeEach(() => {
  jest.resetModules();
  process.env = { ...OLD_ENV };
});

global.afterEach(() => {
  process.env = OLD_ENV;
  jest.clearAllMocks();
});
