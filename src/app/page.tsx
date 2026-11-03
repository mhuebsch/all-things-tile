import { getFeed } from "@/lib/feed";
import { FacebookFeed } from "@/components/facebook-feed";
export default async function Home() {
  const feed = await getFeed();
  return <main id="main-content" className="site-width home-main">
    <img className="mobile-logo" src="/images/logo.jpg" alt="All Things Tile — Custom Flooring Kitchen & Bath" width="720" height="240" />
    <p className="introduction">All Things Tile is operated by David Bond, a Tile Contractor located in Duluth, MN. David has been working in the field for over 20 years building and remodeling his custom tile installations. He enjoys the creative process of bringing design ideas into fruition. He has an unmatched work ethic and reputation for honest and timely service. You can trust he will not only respect your home, but David will work tirelessly to bring your project to life.</p>
    <FacebookFeed feed={feed} />
  </main>;
}
