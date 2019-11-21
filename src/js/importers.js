const importers = {};

const importAll = (r) => r.keys().forEach((key) => {
  importers[key] = r(key);
});
const context = require.context('./importers/', false, /\.js$/);
importAll(context);

export default importers;

function getOfficial() {
  const officialList = [];
  Object.keys(importers).forEach((module) => {
    if (importers[module].official) {
      officialList.push(importers[module].id);
    }
  });
  return officialList;
}

// Array of imprter ids
export const officialList = getOfficial();
