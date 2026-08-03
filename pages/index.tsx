import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Modal from "../components/Modal";
import cloudinary from "../utils/cloudinary";
import getBase64ImageUrl from "../utils/generateBlurPlaceholder";
import { imageUrl } from "../utils/imageUrl";
import type { ImageProps } from "../utils/types";
import { shuffle } from "../utils/shuffle";
import { useDevelopIn } from "../utils/useDevelopIn";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";

const Home: NextPage = ({ images }: { images: ImageProps[] }) => {
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
        <title>Jordan Blum&apos;s Photo Gallery</title>
        <meta property="og:image" content="https://blumblumblum.com" />
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
          <div className="intro-panel after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-5 overflow-hidden rounded-[1.5rem] px-6 pb-14 pt-64 text-center">
            <Image
              alt="Jordan Blum"
              className="rounded-full outline outline-1 outline-[var(--hairline)]"
              src="/jordan-headshot.jpg"
              width={130}
              height={130}
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
            <p className="mono-meta">{images.length} frames · shuffled hourly</p>
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
              <Image
                alt={`Photograph by Jordan Blum, frame ${id + 1}`}
                className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
                style={{ transform: "translate3d(0, 0, 0)" }}
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
      props: { images },
      revalidate: 3600,
    };
  } catch (error) {
    console.error("Error fetching images:", error);
    return {
      props: { images: [] },
      revalidate: 3600,
    };
  }
}
