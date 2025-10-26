// No-op console for production builds
// This replaces console in production to prevent logging
const noop = () => { };

module.exports = {
    log: noop,
    warn: noop,
    error: noop,
    debug: noop,
    info: noop,
    trace: noop,
    table: noop,
    group: noop,
    groupEnd: noop,
    groupCollapsed: noop,
    time: noop,
    timeEnd: noop,
    timeLog: noop,
    count: noop,
    countReset: noop,
    clear: noop,
    dir: noop,
    dirxml: noop,
    assert: noop,
};
