import {
  ArrowTopRightOnSquareIcon,
  ArrowUturnLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { AnimatePresence, motion, MotionConfig } from "framer-motion";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useSwipeable } from "react-swipeable";
import { range } from "../utils/range";
import type { ImageProps, SharedModalProps } from "../utils/types";

const variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95
  }),
  center: {
    zIndex: 1,
    x: 0,
    opacity: 1,
    scale: 1
  },
  exit: (direction: number) => ({
    zIndex: 0,
    x: direction < 0 ? '100%' : '-100%',
    opacity: 0,
    scale: 0.95
  })
};

export default function SharedModal({
  index,
  images,
  changePhotoId,
  closeModal,
  navigation,
  currentPhoto,
  direction,
}: SharedModalProps) {
  const [loaded, setLoaded] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 1280, height: 853 });
  
  let filteredImages = images?.filter((img: ImageProps) =>
    range(index - 15, index + 15).includes(img.id),
  );

  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const currentImage = images?.find(img => img.id === index);
      if (currentImage) {
        const nextImage = images?.find(img => img.navigationId === currentImage.navigationId + 1);
        if (nextImage) {
          changePhotoId(nextImage.id);
        }
      }
    },
    onSwipedRight: () => {
      const currentImage = images?.find(img => img.id === index);
      if (currentImage) {
        const prevImage = images?.find(img => img.navigationId === currentImage.navigationId - 1);
        if (prevImage) {
          changePhotoId(prevImage.id);
        }
      }
    },
    trackMouse: true,
    swipeDuration: 500,
    preventScrollOnSwipe: true,
    trackTouch: true
  });

  let currentImage = images ? images.find(img => img.id === index) : currentPhoto;

  useEffect(() => {
    if (currentImage) {
      const calculateDimensions = () => {
        const maxWidth = Math.min(1280, window.innerWidth - 100);
        const maxHeight = window.innerHeight - 100;
        const imageWidth = Number(currentImage.width);
        const imageHeight = Number(currentImage.height);
        const ratio = imageWidth / imageHeight;

        let width, height;

        if (ratio > 1) {
          // Landscape
          width = Math.min(maxWidth, imageWidth);
          height = width / ratio;
        } else {
          // Portrait
          height = Math.min(maxHeight, imageHeight);
          width = height * ratio;
        }

        setDimensions({
          width: Math.round(width),
          height: Math.round(height)
        });
      };

      calculateDimensions();
      window.addEventListener('resize', calculateDimensions);
      
      return () => window.removeEventListener('resize', calculateDimensions);
    }
  }, [currentImage]);

  return (
    <MotionConfig
      transition={{
        x: { type: "spring", stiffness: 100, damping: 30 },
        opacity: { duration: 0.4 },
        scale: { duration: 0.4 },
      }}
    >
      <div
        className="relative z-50 flex h-full max-h-screen w-full items-center justify-center"
        {...handlers}
      >
        {/* Main image */}
        <div className="w-full overflow-hidden">
          <div className="relative flex items-center justify-center">
            <AnimatePresence
              initial={false}
              custom={direction}
              mode="popLayout"
            >
              <motion.div
                key={index}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                className="relative"
                style={{
                  width: dimensions.width,
                  height: dimensions.height,
                  margin: '0 auto',
                  willChange: 'transform, opacity',
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  perspective: 1000,
                  WebkitPerspective: 1000,
                  transformStyle: 'preserve-3d',
                  WebkitTransformStyle: 'preserve-3d'
                }}
              >
                <Image
                  src={`https://res.cloudinary.com/${
                    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
                  }/image/upload/c_scale,w_${dimensions.width}/${
                    currentImage.public_id
                  }.${currentImage.format}`}
                  alt="Photo"
                  className="rounded-lg"
                  width={dimensions.width}
                  height={dimensions.height}
                  priority
                  style={{ 
                    objectFit: 'contain',
                    willChange: 'transform',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'translateZ(0)',
                    WebkitTransform: 'translateZ(0)'
                  }}
                  onLoad={() => setLoaded(true)}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Buttons + bottom nav bar */}
        <div className="absolute inset-0 mx-auto flex max-w-7xl items-center justify-center">
          {/* Buttons */}
          {loaded && (
            <div className="relative h-full w-full">
              {navigation && (
                <>
                  {index > 0 && (
                    <button
                      className="absolute left-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => changePhotoId(index - 1)}
                    >
                      <ChevronLeftIcon className="h-6 w-6" />
                    </button>
                  )}
                  {index + 1 < images.length && (
                    <button
                      className="absolute right-3 top-[calc(50%-16px)] rounded-full bg-black/50 p-3 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white focus:outline-none"
                      style={{ transform: "translate3d(0, 0, 0)" }}
                      onClick={() => changePhotoId(index + 1)}
                    >
                      <ChevronRightIcon className="h-6 w-6" />
                    </button>
                  )}
                </>
              )}
              <div className="absolute top-0 right-0 flex items-center gap-2 p-3 text-white">
                {navigation ? (
                  <a
                    href={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/${currentImage.public_id}.${currentImage.format}`}
                    className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
                    target="_blank"
                    title="Open fullsize version"
                    rel="noreferrer"
                  >
                    <ArrowTopRightOnSquareIcon className="h-5 w-5" />
                  </a>
                ) : null}
              </div>
              <div className="absolute top-0 left-0 flex items-center gap-2 p-3 text-white">
                <button
                  onClick={() => closeModal()}
                  className="rounded-full bg-black/50 p-2 text-white/75 backdrop-blur-lg transition hover:bg-black/75 hover:text-white"
                >
                  {navigation ? (
                    <XMarkIcon className="h-5 w-5" />
                  ) : (
                    <ArrowUturnLeftIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          )}
          {/* Bottom Nav bar */}
          {navigation && (
            <div className="fixed inset-x-0 bottom-0 z-40 overflow-hidden bg-gradient-to-b from-black/0 to-black/60">
              <motion.div
                initial={false}
                className="mx-auto mt-6 mb-6 flex aspect-[3/2] h-14"
              >
                <AnimatePresence initial={false}>
                  {filteredImages.map(({ public_id, format, id }) => (
                    <motion.button
                      initial={{
                        width: "0%",
                        x: `${Math.max((index - 1) * -100, 15 * -100)}%`,
                      }}
                      animate={{
                        scale: id === index ? 1.25 : 1,
                        width: "100%",
                        x: `${Math.max(index * -100, 15 * -100)}%`,
                      }}
                      exit={{ width: "0%" }}
                      onClick={() => changePhotoId(id)}
                      key={id}
                      className={`${
                        id === index
                          ? "z-20 rounded-md shadow shadow-black/50"
                          : "z-10"
                      } ${id === 0 ? "rounded-l-md" : ""} ${
                        id === images.length - 1 ? "rounded-r-md" : ""
                      } relative inline-block w-full shrink-0 transform-gpu overflow-hidden focus:outline-none`}
                    >
                      <Image
                        alt="small photos on the bottom"
                        width={180}
                        height={120}
                        className={`${
                          id === index
                            ? "brightness-110 hover:brightness-110"
                            : "brightness-50 contrast-125 hover:brightness-75"
                        } h-full transform object-cover transition`}
                        src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/c_scale,w_180/${public_id}.${format}`}
                      />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </MotionConfig>
  );
}
