export type Movie = {
  id: string;
  title: string;
  director: string;
  recommender: string;
  src: string;
  tmdbId?: number;
};

type TmdbMovieResult = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  release_date?: string;
};

type TmdbSearchResponse = {
  results?: TmdbMovieResult[];
};

type TmdbCreditsResponse = {
  crew?: Array<{
    job?: string;
    name?: string;
  }>;
};

const movieCacheKey = "letsmovie.movies.v1";
const tmdbApiBaseUrl = "https://api.themoviedb.org/3";
const tmdbImageBaseUrl = "https://image.tmdb.org/t/p/w500";
const tmdbApiKey = import.meta.env.VITE_TMDB_API_KEY as string | undefined;

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

const localMovieDatabase: Movie[] = Object.entries(posterModules)
  .map(([path, src]) => {
    const filename = decodeURIComponent(path.split("/").pop() ?? "");
    const stem = filename.replace(/\.[^.]+$/, "");
    const separator = stem.lastIndexOf("-");
    const title = separator > 0 ? stem.slice(0, separator) : stem;

    return {
      id: title,
      title,
      director: directors[title] ?? "",
      recommender: separator > 0 ? stem.slice(separator + 1) : "匿名",
      src,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, "zh-CN"));

function readCachedMovies(): Movie[] {
  if (typeof window === "undefined") return [];

  try {
    const storedValue = window.localStorage.getItem(movieCacheKey);
    if (!storedValue) return [];

    const parsedValue = JSON.parse(storedValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch {
    return [];
  }
}

function writeCachedMovies(movies: Movie[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(movieCacheKey, JSON.stringify(movies));
}

export function saveMovies(movies: Movie[]) {
  const existingMovies = readCachedMovies();
  const movieMap = new Map(existingMovies.map((movie) => [movie.id, movie]));

  movies.forEach((movie) => {
    movieMap.set(movie.id, movie);
  });

  writeCachedMovies([...movieMap.values()]);
}

export function saveMovie(movie: Movie) {
  saveMovies([movie]);
}

export function getMovieById(id: string) {
  return (
    readCachedMovies().find((movie) => movie.id === id) ??
    localMovieDatabase.find((movie) => movie.id === id)
  );
}

async function getMovieDirector(tmdbId: number) {
  if (!tmdbApiKey) return "";

  const creditsParams = new URLSearchParams({
    api_key: tmdbApiKey,
    language: "zh-CN",
  });

  try {
    const response = await fetch(
      `${tmdbApiBaseUrl}/movie/${tmdbId}/credits?${creditsParams}`,
    );
    if (!response.ok) return "";

    const data = (await response.json()) as TmdbCreditsResponse;
    return (
      data.crew
        ?.filter((person) => person.job === "Director" && person.name)
        .map((person) => person.name)
        .join(" / ") ?? ""
    );
  } catch {
    return "";
  }
}

export async function searchMovies(query: string) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery || !tmdbApiKey) return [];

  const searchParams = new URLSearchParams({
    api_key: tmdbApiKey,
    query: normalizedQuery,
    language: "zh-CN",
    include_adult: "false",
    page: "1",
  });

  const response = await fetch(`${tmdbApiBaseUrl}/search/movie?${searchParams}`);
  if (!response.ok) {
    throw new Error(`TMDB movie search failed: ${response.status}`);
  }

  const data = (await response.json()) as TmdbSearchResponse;
  const baseMovies = (data.results ?? [])
    .filter((movie) => movie.poster_path)
    .slice(0, 12);

  const movies = await Promise.all(
    baseMovies.map(async (movie): Promise<Movie> => {
      const title = movie.title ?? movie.name ?? "未命名影片";
      const director = await getMovieDirector(movie.id);

      return {
        id: `tmdb-${movie.id}`,
        tmdbId: movie.id,
        title,
        director,
        recommender: "小杨",
        src: `${tmdbImageBaseUrl}${movie.poster_path}`,
      };
    }),
  );

  saveMovies(movies);
  return movies;
}
