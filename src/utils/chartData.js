// Pure helper for turning a { name: count } breakdown object (as produced by
// clientDataService's groupByField/groupByFieldArray/groupByCalculatedTime)
// into the { name, Number }[] shape recharts expects, sorted by count desc.
export const transformDataForChart = (dataObj, filterUnknown = true) => {
  if (!dataObj) return [];
  return Object.entries(dataObj)
    .filter(([name, count]) => {
      if (
        filterUnknown &&
        (name === "Unknown" || name === "" || name === "undefined")
      )
        return false;
      return count > 0;
    })
    .map(([name, count]) => ({ name, Number: count }))
    .sort((a, b) => b.Number - a.Number);
};
