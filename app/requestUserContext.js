const { AsyncLocalStorage } = require("async_hooks");

const storage = new AsyncLocalStorage();

function userContextMiddleware(req, res, next) {
  const userId = req.session && req.session.userId ? req.session.userId : null;
  storage.run({ userId, currency: null }, () => next());
}

function getRequestUserId() {
  const store = storage.getStore();
  return store && store.userId ? store.userId : null;
}

function getRequestCurrency() {
  const store = storage.getStore();
  return store && store.currency ? store.currency : null;
}

function setRequestCurrency(currency) {
  const store = storage.getStore();
  if (store) {
    store.currency = currency || null;
  }
}

function runWithUserId(userId, fn) {
  return storage.run({ userId, currency: null }, fn);
}

module.exports = {
  userContextMiddleware,
  getRequestUserId,
  getRequestCurrency,
  setRequestCurrency,
  runWithUserId,
};
