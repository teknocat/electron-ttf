// Node 24 removed process.binding('http_parser').
// Legacy deps (spdy/http-deceiver in webpack-dev-server 3) still expect it.
(() => {
  if (typeof process.binding !== 'function') return;

  const originalBinding = process.binding;

  try {
    // Older Node versions still provide this binding, no shim required.
    originalBinding.call(process, 'http_parser');
    return;
  } catch (err) {
    // Continue with shim path.
  }

  let httpCommon = null;
  try {
    // eslint-disable-next-line global-require
    httpCommon = require('_http_common');
  } catch (err) {
    return;
  }

  if (!httpCommon || !httpCommon.HTTPParser) return;

  process.binding = function patchedBinding(name) {
    if (name === 'http_parser') {
      const methods =
        httpCommon.methods ||
        (httpCommon.HTTPParser && httpCommon.HTTPParser.methods) ||
        [];

      return {
        HTTPParser: httpCommon.HTTPParser,
        methods
      };
    }

    return originalBinding.call(process, name);
  };
})();
