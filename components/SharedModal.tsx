import {
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { fullSizeUrl, imageUrl } from "../utils/imageUrl";
import type { ImageProps, SharedModalProps } from "../utils/types";

const STRIP_RADIUS = 15;

// Preloads neighbor images so arrow navigation feels instant.
const ImagePreloader = ({ imageUrls }: { imageUrls: string[] }) => {
  useEffect(() => {
    imageUrls.forEach((url) => {
      const img = document.createElement("img");
      img.src = url;
    });
  }, [imageUrls]);
  return null;
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.95,
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1,
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.95,
  }),
};

const chromeButton =
  "rounded-full border border-[var(--hairline)] bg-[var(--panel)] p-2 text-[var(--ink-muted)] backdrop-blur-lg transition hover:border-[var(--ink-muted)] hover:text-[var(--ink)] focus:outline-none";

export default function SharedModal({
  position,
  images,
  goTo,
  closeModal,
  navigation,
  currentPhoto,
  direction,
}: SharedModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 853 });

  const currentImage = images ? images[position] : currentPhoto;

  const neighborUrls = images
    ? [images[position - 1], images[position + 1]]
        .filter(Boolean)
        .map((img: ImageProps) => imageUrl(img, dimensions.width))
    : [];

  const strip = images
    ? images.slice(Math.max(0, position - STRIP_RADIUS), position + STRIP_RADIUS + 1)
    : [];
  const stripOffset = Math.min(position, STRIP_RADIUS);

  const handlers = useSwipeable({
    onSwipedLeft: () => navigation && goTo(position + 1),
    onSwipedRight: () => navigation && goTo(position - 1),
    trackMouse: true,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  useEffect(() => {
    if (!currentImage) return;
    const calculateDimensions = () => {
      const maxWidth = Math.min(1280, window.innerWidth - 100);
      const maxHeight = window.innerHeight - 100;
      const ratio = Number(currentImage.width) / Number(currentImage.height);

      let width: number;
      let height: number;
      if (ratio > 1) {
        width = Math.min(maxWidth, Number(currentImage.width));
        height = width / ratio;
      } else {
        height = Math.min(maxHeight, Number(currentImage.height));
        width = height * ratio;
      }

      setDimensions({ width: Math.round(width), height: Math.round(height) });
    };

    calculateDimensions();
    window.addEventListener("resize", calculateDimensions);
    return () => window.removeEventListener("resize", calculateDimensions);
  }, [currentImage]);

  if (!currentImage) return null;

  return (
    <MotionConfig
      transition={{
        x: { type: "spring", stiffness: 100, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
      }}
    >
      <ImagePreloader imageUrls={neighborUrls} />

      <div
        className="relative z-50 flex h-full max-h-screen w-full items-center justify-center"
        {...handlers}
      >
        {/* Main image */}
        <div className="w-full overflow-hidden">
          <div className="relative flex items-center justify-center">
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={currentImage.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative"
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                  margin: "0 auto",
                  willChange: "transform, opacity",
                }}
              >
                <Image
                  src={imageUrl(currentImage, dimensions.width)}
                  alt="Photograph by Jordan Blum"
                  className="rounded-lg"
                  width={dimensions.width}
                  height={dimensions.height}
                  priority
                  style={{ objectFit: "contain" }}
                  onLoad={() => setLoaded(true)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Chrome */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-center justify-center">
          {loaded && (
            <div className="relative h-full w-full">
              {navigation && (
                <>
                  {position > 0 && (
                    <button
                      className={`absolute left-3 top-[calc(50%-16px)] p-3 ${chromeButton}`}
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => goTo(position - 1)}
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                  )}
                  {position < (images?.length ?? 0) - 1 && (
                    <button
                      className={`absolute right-3 top-[calc(50%-16px)] p-3 ${chromeButton}`}
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => goTo(position + 1)}
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </button>
                  )}
                </>
              )}
              <div className="absolute top-0 right-0 flex items-center gap-2 p-3">
                {navigation && (
                  <a
                    href={fullSizeUrl(currentImage)}
                    className={chromeButton}
                    target="_blank"
                    title="Open fullsize version"
                    rel="noreferrer"
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
              <div className="absolute top-0 left-0 flex items-center gap-2 p-3">
                <button onClick={() => closeModal()} className={chromeButton}>
                  {navigation ? (
                    <XMarkIcon className="h-5 w-5" />
                  ) : (
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Bottom thumbnail strip */}
          {navigation && (
            <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-gradient-to-b from-black/0 to-black/60">
              <motion.div
                initial={false}
                className="mx-auto mt-6 mb-6 flex aspect-[3/2] h-14"
              >
                <AnimatePresence initial={false}>
                  {strip.map((image, i) => {
                    const imagePosition = position - stripOffset + i;
                    const isCurrent = imagePosition === position;
                    return (
                      <motion.button
                        initial={{
                          width: "0%",
                          x: `${Math.max((stripOffset - 1) * -100, STRIP_RADIUS * -100)}%`,
                        }}
                        animate={{
                          scale: isCurrent ? 1.25 : 1,
                          width: "100%",
                          x: `${stripOffset * -100}%`,
                        }}
                        exit={{ width: "0%" }}
                        onClick={() => goTo(imagePosition)}
                        key={image.id}
                        className={`${
                          isCurrent ? "z-20 rounded-md shadow shadow-black/50" : "z-10"
                        } relative inline-block w-full shrink-0 transform-gpu overflow-hidden focus:outline-none`}
                      >
                        <Image
                          alt="Thumbnail"
                          width={180}
                          height={120}
                          className={`${
                            isCurrent
                              ? "brightness-110 hover:brightness-110"
                              : "brightness-50 contrast-125 hover:brightness-75"
                          } h-full transform object-cover transition`}
                          src={imageUrl(image, 180)}
                          loading={Math.abs(imagePosition - position) <= 2 ? "eager" : "lazy"}
                          priority={Math.abs(imagePosition - position) <= 1}
                        />
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
