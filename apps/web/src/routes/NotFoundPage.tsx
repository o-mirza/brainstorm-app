import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="route-state">
      <h1>Page not found</h1>
      <Link to="/">Create a new room</Link>
    </main>
  );
}
