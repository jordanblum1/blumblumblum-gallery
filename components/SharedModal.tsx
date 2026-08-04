import {
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import { useEffect, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { fullSizeUrl, imageUrl } from "../utils/imageUrl";
import type { ImageProps, SharedModalProps } from "../utils/types";

// Cloudinary already returns AVIF/WebP via f_auto,q_auto, so these go straight
// to the browser rather than through the Next optimizer — one network hop
// instead of two, and a fixed ladder means every viewport hits a warm URL.
const WIDTHS = [640, 960, 1280, 1600, 2048];
const SIZES = "(max-width: 640px) 100vw, calc(100vw - 10rem)";

const srcSet = (image: ImageProps) =>
  WIDTHS.map((w) => `${imageUrl(image, w)} ${w}w`).join(", ");

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Warms the neighbours at the same URL the srcset will request, so arrowing
// across is a cache hit rather than a fresh round trip.
const ImagePreloader = ({ images }: { images: ImageProps[] }) => {
  useEffect(() => {
    images.forEach((image) => {
      const img = document.createElement("img");
      img.sizes = SIZES;
      img.srcset = srcSet(image);
    });
  }, [images]);
  return null;
};

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "6%" : "-6%",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction < 0 ? "6%" : "-6%",
    opacity: 0,
  }),
};

const chromeBase =
  "rounded-full border border-[var(--hairline)] bg-[var(--panel)] text-[var(--ink-muted)] backdrop-blur-lg transition hover:border-[var(--ink-muted)] hover:text-[var(--ink)] focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent)]";
const chromeButton = `${chromeBase} p-2`;
// Padding lives here rather than alongside chromeButton so the two never emit
// competing p-* utilities. z-10 keeps arrows above the stacked frames.
const arrowButton = `${chromeBase} absolute top-1/2 z-10 hidden -translate-y-1/2 p-3 sm:block`;

export default function SharedModal({
  position,
  images,
  goTo,
  closeModal,
  navigation,
  currentPhoto,
  direction,
}: SharedModalProps) {
  const activeThumbRef = useRef<HTMLButtonElement>(null);
  const currentImage = images ? images[position] : currentPhoto;

  const neighbours = images
    ? [images[position - 1], images[position + 1]].filter(Boolean)
    : [];

  const handlers = useSwipeable({
    onSwipedLeft: () => navigation && goTo(position + 1),
    onSwipedRight: () => navigation && goTo(position - 1),
    trackMouse: false,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackTouch: true,
  });

  // Keep the active thumbnail centred as the selection moves.
  useEffect(() => {
    activeThumbRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  }, [position]);

  if (!currentImage) return null;

  const atStart = position <= 0;
  const atEnd = position >= (images?.length ?? 0) - 1;

  return (
    <MotionConfig
      transition={{
        x: { type: "spring", stiffness: 260, damping: 32 },
        opacity: { duration: 0.18 },
      }}
    >
      <ImagePreloader images={neighbours} />

      <div
        className="relative z-50 flex h-full max-h-screen w-full flex-col"
        {...handlers}
      >
        <header className="flex shrink-0 items-center justify-between gap-2 p-3 sm:p-4">
          <button
            onClick={() => closeModal()}
            className={chromeButton}
            aria-label={navigation ? "Close" : "Back to gallery"}
          >
            {navigation ? (
              <XMarkIcon className="h-5 w-5" />
            ) : (
              <ArrowUturnLeftIcon className="h-5 w-5" />
            )}
          </button>
          <div className="flex items-center gap-2">
            {navigation && images && (
              <span className="mono-meta px-1 tabular-nums">
                {position + 1} / {images.length}
              </span>
            )}
            <a
              href={fullSizeUrl(currentImage)}
              className={chromeButton}
              target="_blank"
              title="Open fullsize version"
              rel="noreferrer"
              aria-label="Open fullsize version"
            >
              <ArrowTopRightOnSquareIcon className="h-5 w-5" />
            </a>
          </div>
        </header>

        {/* Stage. The horizontal padding reserves the arrow gutters, so the
            photo can never sit underneath the controls. */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center px-3 pb-2 sm:px-20">
          {/* Frames stack absolutely inside this box. As flex siblings the
              outgoing and incoming frames shared the row for a beat and each
              collapsed to half width, which is what made stepping jump. */}
          <div className="relative h-full w-full">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentImage.id}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="absolute inset-0 flex items-center justify-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl(currentImage, 1280)}
                  srcSet={srcSet(currentImage)}
                  sizes={SIZES}
                  alt="Photograph by Jordan Blum"
                  width={currentImage.width}
                  height={currentImage.height}
                  fetchPriority="high"
                  decoding="async"
                  className="max-h-full w-auto max-w-full rounded-lg object-contain"
                  style={
                    currentImage.blurDataUrl
                      ? {
                          backgroundImage: `url(${currentImage.blurDataUrl})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {navigation && (
            <>
              {!atStart && (
                <button
                  className={`${arrowButton} left-2 sm:left-4`}
                  onClick={() => goTo(position - 1)}
                  aria-label="Previous photo"
                >
                  <ChevronLeftIcon className="h-6 w-6" />
                </button>
              )}
              {!atEnd && (
                <button
                  className={`${arrowButton} right-2 sm:right-4`}
                  onClick={() => goTo(position + 1)}
                  aria-label="Next photo"
                >
                  <ChevronRightIcon className="h-6 w-6" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Thumbnail rail. A plain scroll container rather than an animated
            window — the old version tweened width and x on every item, which
            is what made stepping through feel unsteady. */}
        {navigation && images && (
          <div className="shrink-0 bg-gradient-to-b from-transparent to-[var(--paper)]">
            <div
              className="mx-auto flex max-w-full gap-1.5 overflow-x-auto scroll-smooth px-4 py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              role="listbox"
              aria-label="Photo thumbnails"
            >
              {images.map((image, i) => {
                const isCurrent = i === position;
                return (
                  <button
                    key={image.id}
                    ref={isCurrent ? activeThumbRef : null}
                    onClick={() => goTo(i)}
                    role="option"
                    aria-selected={isCurrent}
                    aria-label={`Photo ${i + 1}`}
                    className={`relative h-14 w-20 shrink-0 overflow-hidden rounded-md transition focus-visible:outline focus-visible:outline-1 focus-visible:outline-[var(--accent)] ${
                      isCurrent
                        ? "outline outline-2 outline-[var(--accent)]"
                        : "opacity-50 hover:opacity-90"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt=""
                      src={imageUrl(image, 160)}
                      loading={Math.abs(i - position) <= 6 ? "eager" : "lazy"}
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
