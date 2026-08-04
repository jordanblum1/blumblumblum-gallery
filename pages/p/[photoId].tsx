import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import Carousel from "../../components/Carousel";
import getResults from "../../utils/cachedImages";
import cloudinary from "../../utils/cloudinary";
import getBase64ImageUrl from "../../utils/generateBlurPlaceholder";
import { imageUrl } from "../../utils/imageUrl";
import type { ImageProps } from "../../utils/types";

const PhotoPage: NextPage = ({ currentPhoto }: { currentPhoto: ImageProps }) => {
  const currentPhotoUrl = imageUrl(currentPhoto, 2560);

  return (
    <>
      <Head>
        <title>Jordan Blum&apos;s Photo Gallery</title>
        <meta property="og:image" content={currentPhotoUrl} />
        <meta name="twitter:image" content={currentPhotoUrl} />
        <link
          rel="canonical"
          href={`https://blumblumblum.com/gallery/p/${currentPhoto.id}`}
        />
      </Head>
      <main className="mx-auto max-w-[1960px] p-4">
        <Carousel currentPhoto={currentPhoto} />
      </main>
    </>
  );
};

export default PhotoPage;

export const getStaticProps: GetStaticProps = async (context) => {
  const results = await getResults();

  const images: ImageProps[] = results.resources.map((result, i) => ({
    id: i,
    height: result.height,
    width: result.width,
    public_id: result.public_id,
    format: result.format,
  }));

  const currentPhoto = images.find(
    (img) => img.id === Number(context.params.photoId),
  );
  if (!currentPhoto) {
    return { notFound: true };
  }
  currentPhoto.blurDataUrl = await getBase64ImageUrl(currentPhoto);

  return {
    props: {
      currentPhoto,
    },
  };
};

export async function getStaticPaths() {
  const results = await cloudinary.v2.search
    .expression(`folder:${process.env.CLOUDINARY_FOLDER}/*`)
    .sort_by("public_id", "desc")
    .max_results(400)
    .execute();

  return {
    paths: results.resources.map((_, i: number) => ({
      params: { photoId: i.toString() },
    })),
    fallback: false,
  };
}
