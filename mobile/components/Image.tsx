import { Image as ExpoImage } from 'expo-image';
import { forwardRef, type ComponentRef, type ComponentPropsWithoutRef } from 'react';

const DEFAULT_BLURHASH =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj[';

type ExpoImageProps = ComponentPropsWithoutRef<typeof ExpoImage>;

export type ImageProps = Omit<ExpoImageProps, 'source'> & {
  /** Local asset from `require()` or a remote image URL. */
  src?: ExpoImageProps['source'];
};

const Image = forwardRef<ComponentRef<typeof ExpoImage>, ImageProps>(
  ({ src, placeholder = { blurhash: DEFAULT_BLURHASH }, contentFit = 'cover', transition = 200, ...props }, ref) => {
    if (src == null) {
      return null;
    }

    return (
      <ExpoImage
        ref={ref}
        source={src}
        placeholder={placeholder}
        contentFit={contentFit}
        transition={transition}
        {...props}
      />
    );
  },
);

Image.displayName = 'Image';

export default Image;
