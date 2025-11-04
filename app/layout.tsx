import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Why is Sora 2 good? ? Web Search',
  description: 'Metasearch across Wikipedia, DuckDuckGo Instant Answer, and Hacker News.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main className="container">
          <header className="header">
            <h1>Why is Sora 2 good?</h1>
            <p className="tag">Search the web to find out</p>
          </header>
          {children}
          <footer className="footer">Built for agentic-b1315951</footer>
        </main>
      </body>
    </html>
  );
}
