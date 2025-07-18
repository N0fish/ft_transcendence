import { Match } from "../models/stats";

const categoriesSeries = (matches: Match[]): [string[], number[]] => {
  const categories: Map<string, number> = new Map();

  matches.forEach(el => {
    try {
      const date = new Date(el.playedAt);
      const dateKey = date.toISOString().slice(0, 16);
      const formattedKey = dateKey.replace('T', ' ');
      const isWin = (el.result === "Win");

      if (!categories.has(formattedKey)) {
        categories.set(formattedKey, isWin ? 1 : 0);
      } else if (isWin) {
        categories.set(formattedKey, (categories.get(formattedKey) || 0) + 1);
      }
    } catch (error) {
      console.log(error);
      return "";
    }
  });

  const sortedEntries = [...categories.entries()].sort(([a], [b]) => +new Date(a) - +new Date(b));

  return [sortedEntries.map(([k]) => k), sortedEntries.map(([_, v]) => v)];
}

export const getGraphOptions = (matches: Match[]): any => {
  const [categories, data] = categoriesSeries(matches);
  return {
    grid: {
      show: false,
    },
    chart: {
      type: 'line',
      height: "300px",
    },
    series: [{
      data,
      name: "wins",
    }],
    xaxis: {
      categories,
      tooltip: {
        enabled: false,
      },
      labels: {
        style: {
          colors: "#f3f4f6",
          fontSize: "12px",
        },
      },
    },
    yaxis: {
      labels: {
        style: {
          colors: "#f3f4f6",
          fontSize: "12px",
        },
        formatter: (val: number) => Math.round(val).toString(),
      },
    },
    tooltip: {
      enabled: true,
      theme: "dark",
    },
  }
}