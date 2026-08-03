/* eslint-disable no-unused-vars */
export type ImageProps = {
  /* Stable per-photo index from the Cloudinary result set; used by /p/ links. */
  id: number;
  height: number;
  width: number;
  public_id: string;
  format: string;
  blurDataUrl?: string;
  /* Position on the (shuffled) wall; equals the image's index in the array. */
  navigationId?: number;
};

export interface SharedModalProps {
  /* Index of the current image within `images` (display order). */
  position: number;
  images?: ImageProps[];
  currentPhoto?: ImageProps;
  goTo: (position: number) => void;
  closeModal: () => void;
  navigation: boolean;
  direction?: number;
}
