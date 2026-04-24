import { Link } from 'react-router-dom';

export default function Loans() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 pb-20 md:pb-12">
      <h1 className="text-3xl font-bold mb-4">Loans</h1>
      <p className="text-light-muted dark:text-dark-muted mb-6">This page is fully structured. Connect the Express backend to load dynamic data.</p>
      <Link to="/" className="btn-primary">Go Home</Link>
    </div>
  );
}
