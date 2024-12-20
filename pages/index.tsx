import type { NextPage } from "next";
import Head from "next/head";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useRef } from "react";
import Bridge from "../components/Icons/Bridge";
import Logo from "../components/Icons/Logo";
import Modal from "../components/Modal";
import cloudinary from "../utils/cloudinary";
import getBase64ImageUrl from "../utils/generateBlurPlaceholder";
import type { ImageProps } from "../utils/types";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";

function shuffleArray<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

const Home: NextPage = ({ images }: { images: ImageProps[] }) => {
  const router = useRouter();
  const { photoId } = router.query;
  const [lastViewedPhoto, setLastViewedPhoto] = useLastViewedPhoto();

  const lastViewedPhotoRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (lastViewedPhoto && !photoId) {
      lastViewedPhotoRef.current.scrollIntoView({ block: "center" });
      setLastViewedPhoto(null);
    }
  }, [photoId, lastViewedPhoto, setLastViewedPhoto]);

  return (
    <>
        <Head>
        <title>Jordan Blum's Photo Gallery</title>
        <meta
          property="og:image"
          content="https://blumblumblum.com"
        />
      </Head>
      <main className="mx-auto max-w-[1960px] p-4">
        {photoId && (
          <Modal
            images={images}
            onClose={() => {
              setLastViewedPhoto(photoId);
            }}
          />
        )}
        <div className="columns-1 gap-4 sm:columns-2 xl:columns-3 2xl:columns-4">
          <div className="after:content relative mb-5 flex h-[629px] flex-col items-center justify-end gap-4 overflow-hidden rounded-lg bg-white/10 px-6 pb-16 pt-64 text-center text-white shadow-highlight after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight lg:pt-0">
            <div className="absolute inset-0 flex items-center justify-center opacity-20">
              <span className="flex max-h-full max-w-full items-center justify-center">
                <Bridge />
              </span>
              <span className="absolute left-0 right-0 bottom-0 h-[400px] bg-gradient-to-b from-black/0 via-black to-black"></span>
            </div>
            <Logo />
            <p className="max-w-[40ch] text-white/75 sm:max-w-[32ch]">
              Welcome to my personal photo gallery! Here you'll find a collection of my favorite photos I've taken over the past few year. If you'd like to contact me, visit <a href="https://blumjordan.com" className="font-semibold hover:text-white">blumjordan.com</a>.
            </p>
            <Image
              alt="Jordan Blum"
              className="rounded-full"
              src="/jordan-headshot.jpg"
              width={150}
              height={150}
            />
          </div>
          {images.map(({ id, public_id, format, blurDataUrl }) => (
            <Link
              key={id}
              href={`/?photoId=${id}`}
              as={`/p/${id}`}
              ref={id === Number(lastViewedPhoto) ? lastViewedPhotoRef : null}
              shallow
              className="after:content group relative mb-5 block w-full cursor-zoom-in after:pointer-events-none after:absolute after:inset-0 after:rounded-lg after:shadow-highlight"
            >
              <Image
                alt="Next.js Conf photo"
                className="transform rounded-lg brightness-90 transition will-change-auto group-hover:brightness-110"
                style={{ transform: "translate3d(0, 0, 0)" }}
                placeholder="blur"
                blurDataURL={blurDataUrl}
                src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_720/${public_id}.${format}`}
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
      <footer className="p-6 text-center text-white/80 sm:p-12">
        For more projects by Jordan, visit{" "}
        <a href="https://blumblumblum.com/" className="font-semibold hover:text-white">
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

    let reducedResults: ImageProps[] = [];
    
    // First, create array with sequential IDs and navigation order
    reducedResults = results.resources.map((result, i) => ({
      id: i,
      height: result.height,
      width: result.width,
      public_id: result.public_id,
      format: result.format,
      navigationId: i // Add navigationId for sequential navigation
    }));

    // Create a mapping of original positions before shuffling
    const originalOrder = reducedResults.map((_, i) => i);
    const shuffledOrder = shuffleArray(originalOrder);

    // Create the randomized array while preserving IDs and navigation order
    const randomizedResults = shuffledOrder.map(newIndex => ({
      ...reducedResults[newIndex],
      id: reducedResults[newIndex].id, // Preserve the original ID
      navigationId: newIndex // Use the new position for navigation
    }));

    const blurImagePromises = randomizedResults.map((image: ImageProps) => {
      return getBase64ImageUrl(image);
    });
    const imagesWithBlurDataUrls = await Promise.all(blurImagePromises);

    for (let i = 0; i < randomizedResults.length; i++) {
      randomizedResults[i].blurDataUrl = imagesWithBlurDataUrls[i];
    }

    return {
      props: {
        images: randomizedResults,
      },
      revalidate: 3600, // Revalidate every hour (3600 seconds)
    };
  } catch (error) {
    console.error('Error fetching images:', error);
    return {
      props: {
        images: [],
      },
      revalidate: 3600,
    };
  }
}
