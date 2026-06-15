export type Movie = {
  id: string;
  title: string;
  director: string;
  recommender: string;
  src: string;
};

const directors: Record<string, string> = {
  花样年华: "王家卫",
  重庆森林: "王家卫",
  楚门的世界: "彼得·威尔",
  罗拉快跑: "汤姆·提克",
  被嫌弃的松子的一生: "中岛哲也",
  闻香识女人: "马丁·布莱斯",
  四百击: "弗朗索瓦·特吕弗",
};

const posterModules = import.meta.glob(
  "../../picture/poster/{card,waiting}/*.{jpg,jpeg,png,webp}",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

export const movieDatabase: Movie[] = Object.entries(posterModules)
  .map(([path, src]) => {
    const filename = decodeURIComponent(path.split("/").pop() ?? "");
    const stem = filename.replace(/\.[^.]+$/, "");
    const separator = stem.lastIndexOf("-");
    const title = separator > 0 ? stem.slice(0, separator) : stem;

    return {
      id: title,
      title,
      director: directors[title] ?? "导演信息待补充",
      recommender: separator > 0 ? stem.slice(separator + 1) : "匿名",
      src,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

export function getMovieById(id: string) {
  return movieDatabase.find((movie) => movie.id === id);
}

export function searchMovies(query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
  if (!normalizedQuery) return [];

  return movieDatabase.filter((movie) =>
    [movie.title, movie.director].some((value) =>
      value.toLocaleLowerCase("zh-CN").includes(normalizedQuery),
    ),
  );
}
