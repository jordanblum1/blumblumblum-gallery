import { ArrowsPointingOutIcon } from "@heroicons/react/24/outline";
import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Modal from "../components/Modal";
import BlumMark from "../components/BlumMark";
import ScrollToTop from "../components/ScrollToTop";
import cloudinary from "../utils/cloudinary";
import getBase64ImageUrl from "../utils/generateBlurPlaceholder";
import { imageUrl } from "../utils/imageUrl";
import type { ImageProps } from "../utils/types";
import { shuffle } from "../utils/shuffle";
import { useDevelopIn } from "../utils/useDevelopIn";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";

// Social preview falls back to the logo when Cloudinary is unreachable, so the
// tag is always a real image — it previously pointed at the site URL.
const FALLBACK_OG_IMAGE = "https://blumblumblum.com/gallery/BLUM-Tag-Logo.png";

const Home: NextPage = ({
  images,
  ogImage,
}: {
  images: ImageProps[];
  ogImage: string;
}) => {
  const router = useRouter();
  const { photoId } = router.query;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);
  const galleryRef = useRef<HTMLElement>(null);
  useDevelopIn(galleryRef);

  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current?.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  return (
    <>
      <Head>
        <title>Jordan Blum · Photos</title>
        <meta property="og:image" content={ogImage} />
        {/* The app also answers on its .vercel.app origin behind CloudFront,
            so point crawlers at the public URL regardless of which host served. */}
        <link rel="canonical" href="https://blumblumblum.com/gallery" />
      </Head>
      <main ref={galleryRef} className="mx-auto max-w-[1960px] p-4">
        {photoId && (
          <Modal
            images={images}
            onClose={() => {
              setLastViewedPhoto(photoId);
            }}
          />
        )}
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          <div className="intro-panel after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-5 overflow-hidden rounded-[1.5rem] px-6 pb-14 pt-56 text-center">
            {/* Wordmark sits behind the portrait and fades upward into the panel. */}
            <BlumMark className="pointer-events-none absolute inset-x-0 top-16 mx-auto h-40 w-[78%] text-[var(--accent)] opacity-[0.16] [mask-image:linear-gradient(to_top,black_70%,transparent)]" />
            <Image
              alt="Jordan Blum"
              className="relative rounded-full outline outline-1 outline-[var(--hairline)]"
              src="/jordan-portrait.webp"
              width={150}
              height={150}
              priority
            />
            <h1 className="text-2xl font-medium tracking-[-0.04em] text-[var(--ink)]">
              Photographs by Jordan Blum
            </h1>
            <p className="max-w-[34ch] text-[var(--ink-muted)]">
              A collection of my favorite frames from the past few years.
              Prints develop as you scroll. Say hi at{" "}
              <a
                href="https://jordanblum.com"
                className="font-medium text-[var(--accent)] transition hover:text-[var(--ink)]"
              >
                jordanblum.com
              </a>
              .
            </p>
          </div>
          {images.map(({ id, public_id, format, blurDataUrl }, displayIndex) => (
            <Link
              key={id}
              href={`/?photoId=${id}`}
              as={`/p/${id}`}
              ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
              shallow
              className="develop after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
              style={{ transitionDelay: `${(displayIndex % 4) * 50}ms` }}
            >
              {/* The lift lives on the image, not the link: .develop owns the
                  link's transform for the reveal and the two would collide. */}
              <Image
                alt={`Photograph by Jordan Blum, frame ${id + 1}`}
                className="rounded-lg brightness-[0.97] transition duration-[var(--duration-default)] ease-[var(--ease)] will-change-transform group-hover:-translate-y-0.5 group-hover:brightness-105 group-hover:drop-shadow-[0_10px_20px_rgba(43,37,33,0.22)] motion-reduce:transform-none motion-reduce:transition-none"
                placeholder="blur"
                blurDataURL={blurDataUrl}
                src={imageUrl({ public_id, format }, 720)}
                width={720}
                height={480}
                sizes="(max-width: 640px) 100vw,
                  (max-width: 1280px) 50vw,
                  (max-width: 1536px) 33vw,
                  25vw"
              />
              {/* Expand affordance; fades in with the hover lift. */}
              <span className="pointer-events-none absolute right-3 top-3 rounded-full border border-[var(--hairline)] bg-[var(--panel)] p-1.5 text-[var(--ink)] opacity-0 backdrop-blur-lg transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                <ArrowsPointingOutIcon className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </main>
      <footer className="p-6 text-center text-[var(--ink-muted)] sm:p-12">
        For more projects by Jordan, visit{" "}
        <a
          href="https://blumblumblum.com/"
          className="font-medium text-[var(--accent)] transition hover:text-[var(--ink)]"
        >
          blumblumblum.com
        </a>
      </footer>
      <ScrollToTop />
    </>
  );
};

export default Home;

export async function getStaticProps() {
  try {
    const results = await cloudinary.v2.search
      .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
      .sort_by("public_id", "desc")
      .max_results(400)
      .execute();

    // id is the stable per-photo index (used by /p/[photoId] links); display
    // order is shuffled once per ISR revalidate for a fresh wall every hour.
    const ordered: ImageProps[] = results.resources.map((result, i) => ({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
    }));

    const images = shuffle(ordered).map((image, displayIndex) => ({
      ...image,
      navigationId: displayIndex,
    }));

    const blurDataUrls = await Promise.all(images.map(getBase64ImageUrl));
    images.forEach((image, i) => {
      image.blurDataUrl = blurDataUrls[i];
    });

    return {
      // ordered[0] is the newest photo and is stable across revalidates, unlike
      // the shuffled `images` — a shuffled pick would churn the preview hourly.
      props: {
        images,
        ogImage: ordered.length ? imageUrl(ordered[0], 1200) : FALLBACK_OG_IMAGE,
      },
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error fetching images:", error);
    return {
      props: { images: [], ogImage: FALLBACK_OG_IMAGE },
      revalidate: 3600,
    };
  }
}
