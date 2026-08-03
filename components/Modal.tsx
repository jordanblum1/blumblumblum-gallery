import { Dialog } from "@headlessui/react";
import { motion } from "framer-motion";
import { useRouter } from "next/router";
import { useRef, useState } from "react";
import useKeypress from "react-use-keypress";
import type { ImageProps } from "../utils/types";
import SharedModal from "./SharedModal";

// `images` arrives in display (wall) order; a photo's stable id is what /p/
// links and the ?photoId= query use. Arrows walk the wall order.
export default function Modal({
  images,
  onClose,
}: {
  images: ImageProps[];
  onClose?: () => void;
}) {
  const overlayRef = useRef();
  const router = useRouter();

  const [curId, setCurId] = useState(Number(router.query.photoId));
  const [direction, setDirection] = useState(0);
  const position = images.findIndex((img) => img.id === curId);

  function handleClose() {
    router.push("/", undefined, { shallow: true });
    onClose();
  }

  function goTo(newPosition: number) {
    const image = images[newPosition];
    if (!image) return;
    setDirection(newPosition > position ? 1 : -1);
    setCurId(image.id);
    router.push({ query: { photoId: image.id } }, `/p/${image.id}`, {
      shallow: true,
    });
  }

  useKeypress("ArrowRight", () => goTo(position + 1));
  useKeypress("ArrowLeft", () => goTo(position - 1));

  return (
    <Dialog
      static
      open={true}
      onClose={handleClose}
      initialFocus={overlayRef}
      className="fixed inset-0 z-10 flex items-center justify-center"
    >
      <Dialog.Overlay
        ref={overlayRef}
        as={motion.div}
        key="backdrop"
        className="fixed inset-0 z-30 bg-[var(--veil)] backdrop-blur-2xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      />
      <SharedModal
        position={position}
        direction={direction}
        images={images}
        goTo={goTo}
        closeModal={handleClose}
        navigation={true}
      />
    </Dialog>
  );
}
