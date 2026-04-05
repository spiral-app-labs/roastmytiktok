export function HomeJsonLd() {
  const webApp = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Go Viral',
    url: 'https://goviralwith.ai',
    description:
      '6 specialized AI agents analyze your TikTok opener, diagnose why viewers leave, and give you a reshoot plan you can film today.',
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
    name: 'How Go Viral Works',
    description:
      'Upload a TikTok video and get it analyzed by 6 AI agents. Receive hook rewrites, reshoot plans, and an overall score.',
    thumbnailUrl: 'https://goviralwith.ai/og-image.png',
    uploadDate: '2026-03-01',
    contentUrl: 'https://goviralwith.ai',
    potentialAction: {
      '@type': 'ViewAction',
      target: 'https://goviralwith.ai',
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
