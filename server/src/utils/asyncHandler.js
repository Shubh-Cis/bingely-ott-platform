// Wrap an async route handler so any thrown error / rejected promise is passed
// to Express's error middleware instead of crashing the process. Lets controllers
// be written with plain async/await and no try/catch boilerplate.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
