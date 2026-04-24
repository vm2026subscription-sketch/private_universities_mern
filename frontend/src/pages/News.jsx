import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Newspaper, Search, Tag } from 'lucide-react';
import api from '../utils/api';
import { CardSkeleton } from '../components/common/LoadingSkeleton';

const NEWS_CATEGORIES = ['all', 'admissions', 'results', 'rankings', 'international', 'scholarships', 'general'];

export default function News() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [articles, setArticles] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadNews = async () => {
      setLoading(true);
      try {
        const query = selectedCategory === 'all' ? '' : `?category=${selectedCategory}`;
        const { data } = await api.get(`/news${query}`);
        if (active) setArticles(data.data || []);
      } catch {
        if (active) setArticles([]);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadNews();
    return () => {
      active = false;
    };
  }, [selectedCategory]);

  const filteredArticles = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return articles;

    return articles.filter((article) => (
      [
        article.title,
        article.summary,
        article.source,
        article.category,
        (article.tags || []).join(' '),
      ].join(' ').toLowerCase().includes(query)
    ));
  }, [articles, search]);

  const featuredArticle = filteredArticles[0];
  const remainingArticles = filteredArticles.slice(1);

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-10">
        <div>
          <span className="badge badge-blue mb-4 inline-flex">Daily Coverage</span>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Education News & Alerts</h1>
          <p className="text-light-muted dark:text-dark-muted max-w-2xl">
            Read recent admission, result, scholarship, and ranking updates fetched from your Express backend.
          </p>
        </div>

        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-light-muted dark:text-dark-muted" />
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search news title, source, tags..."
            className="w-full rounded-2xl border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-8">
        {NEWS_CATEGORIES.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize transition-colors ${
              selectedCategory === category
                ? 'bg-primary text-white'
                : 'bg-light-card dark:bg-dark-card hover:bg-primary-50 dark:hover:bg-dark-border'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {loading ? (
        <CardSkeleton count={6} />
      ) : filteredArticles.length === 0 ? (
        <div className="card p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">No news articles found</h2>
          <p className="text-light-muted dark:text-dark-muted">
            Try another category or add articles in the backend seed/data source.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {featuredArticle ? (
            <article className="card p-8 bg-gradient-to-br from-primary-50 via-white to-orange-50 dark:from-dark-card dark:via-dark-card dark:to-dark-bg">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="badge badge-orange capitalize">{featuredArticle.category || 'general'}</span>
                <span className="text-sm text-light-muted dark:text-dark-muted inline-flex items-center gap-2">
                  <CalendarDays className="w-4 h-4" />
                  {featuredArticle.publishedAt ? new Date(featuredArticle.publishedAt).toLocaleDateString() : 'Recently updated'}
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{featuredArticle.title}</h2>
              <p className="text-light-muted dark:text-dark-muted mb-5 max-w-3xl">
                {featuredArticle.summary || featuredArticle.content || 'No summary available.'}
              </p>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-2">
                  <Newspaper className="w-4 h-4 text-primary" />
                  {featuredArticle.source || 'Vidyarthi Mitra'}
                </span>
                {!!featuredArticle.tags?.length && (
                  <span className="inline-flex items-center gap-2 text-light-muted dark:text-dark-muted">
                    <Tag className="w-4 h-4 text-primary" />
                    {featuredArticle.tags.join(', ')}
                  </span>
                )}
              </div>
            </article>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {remainingArticles.map((article) => (
              <article key={article._id} className="card p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <span className="badge badge-blue capitalize">{article.category || 'general'}</span>
                  <span className="text-xs text-light-muted dark:text-dark-muted">
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : 'Recent'}
                  </span>
                </div>
                <h3 className="text-lg font-semibold mb-3 line-clamp-2">{article.title}</h3>
                <p className="text-sm text-light-muted dark:text-dark-muted line-clamp-3 mb-4">
                  {article.summary || article.content || 'No summary available.'}
                </p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-primary font-medium">{article.source || 'Vidyarthi Mitra'}</span>
                  {!!article.tags?.length ? (
                    <span className="text-light-muted dark:text-dark-muted text-xs">
                      {article.tags.slice(0, 2).join(', ')}
                    </span>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
