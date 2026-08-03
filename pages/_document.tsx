import Document, { Head, Html, Main, NextScript } from "next/document";

class MyDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="icon" href="/favicon.ico" />
          <link
            rel="preload"
            href="/fonts/switzer-400.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <link
            rel="preload"
            href="/fonts/switzer-500.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
          <meta name="theme-color" content="#160f0d" />
          <meta
            name="description"
            content="A gallery of photos by Jordan Blum."
          />
          <meta property="og:site_name" content="blumblumblum.com" />
          <meta
            property="og:description"
            content="A gallery of photos by Jordan Blum."
          />
          <meta property="og:title" content="Jordan Blum's Photo Gallery" />
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="Jordan Blum's Photo Gallery" />
          <meta
            name="twitter:description"
            content="A gallery of photos by Jordan Blum."
          />
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
