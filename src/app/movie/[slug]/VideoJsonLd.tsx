export default function VideoJsonLd({ title, url, thumbnailUrl }: {
  title: string; url: string; thumbnailUrl?: string;
}) {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'VideoObject',
    name: title,
    description: title,
    thumbnailUrl: thumbnailUrl ? [thumbnailUrl] : undefined,
    embedUrl: url,
    contentUrl: url,
    uploadDate: new Date().toISOString()
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
