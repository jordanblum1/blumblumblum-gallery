import Image from "next/image";
import { useRouter } from "next/router";
import { useState } from "react";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../utils/types";
import { useLastViewedPhoto } from "../utils/useLastViewedPhoto";
import SharedModal from "./SharedModal";

// Backs a deep-linked /p/<id>. `images` arrives in the stable Cloudinary
// order, where a photo's id is its index — unlike the wall, which is shuffled.
// Without the set this page was a dead end: the URL people share and bookmark
// rendered the one view with no way forward.
export default function Carousel({
  currentPhoto,
  images,
}: {
  currentPhoto: ImageProps;
  images?: ImageProps[];
}) {
  const router = useRouter();
  const [, setLastViewedPhoto] = useLastViewedPhoto();
  const [direction, setDirection] = useState(0);

  const navigation = Boolean(images && images.length > 1);
  const position = navigation ? currentPhoto.id : 0;

  function closeModal() {
    setLastViewedPhoto(currentPhoto.id);
    router.push("/", undefined, { shallow: true });
  }

  function goTo(newPosition: number) {
    const image = images?.[newPosition];
    if (!image) return;
    setDirection(newPosition > position ? 1 : -1);
    router.push(`/p/${image.id}`);
  }

  useKeypress("Escape", () => {
    closeModal();
  });
  useKeypress("ArrowRight", () => goTo(position + 1));
  useKeypress("ArrowLeft", () => goTo(position - 1));

  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <button
        className="absolute inset-0 z-30 cursor-default bg-[var(--paper)] backdrop-blur-2xl"
        onClick={closeModal}
      >
        <Image
          src={currentPhoto.blurDataUrl}
          className="pointer-events-none h-full w-full opacity-60"
          alt="blurred background"
          fill
          priority={true}
        />
      </button>
      <SharedModal
        position={position}
        direction={direction}
        images={images}
        goTo={goTo}
        currentPhoto={currentPhoto}
        closeModal={closeModal}
        navigation={navigation}
      />
    </div>
  );
}
