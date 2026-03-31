export function HomeJsonLd() {
  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Roast My TikTok',
    url: 'https://roastmytiktok.com',
    description:
      '6 specialized AI agents analyze and roast your TikTok videos — hook rewrites, reshoot plans, and brutally honest scores.',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    creator: {
      '@type': 'Organization',
      name: 'Spiral App Labs',
    },
    featureList: [
      'Hook Rewrite Workshop',
      'Reshoot Plan',
      'Hold-Strength Read',
      'Score and Grade',
      '6 AI Agent Analysis',
    ],
  };

  const videoObject = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: 'How Roast My TikTok Works',
    description:
      'Upload a TikTok video and get it analyzed by 6 AI agents. Receive hook rewrites, reshoot plans, and an overall score.',
    thumbnailUrl: 'https://roastmytiktok.com/og-image.png',
    uploadDate: '2026-03-01',
    contentUrl: 'https://roastmytiktok.com',
    potentialAction: {
      '@type': 'ViewAction',
      target: 'https://roastmytiktok.com',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoObject) }}
      />
    </>
  );
}
