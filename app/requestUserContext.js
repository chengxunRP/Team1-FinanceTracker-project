const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function userContextMiddleware(req, res, next) {
  const userId = req.session && req.session.userId ? req.session.userId : null;
  storage.run({ userId }, () => next());
}

function getRequestUserId() {
  const store = storage.getStore();
  return store && store.userId ? store.userId : null;
}

function runWithUserId(userId, fn) {
  return storage.run({ userId }, fn);
}

module.exports = {
  userContextMiddleware,
  getRequestUserId,
  runWithUserId,
};
