const importers = {};

const importAll = (r) => r.keys().forEach((key) => importers[key] = r(key));
const context = require.context('./importers/', false, /\.js$/);
importAll(context);

export default importers;