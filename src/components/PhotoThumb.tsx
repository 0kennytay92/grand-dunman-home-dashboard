import { useImageUrl } from '../data/images';
import type { Photo } from '../data/types';
import { PhotoPlaceholder } from './ui';

/** A photo's thumbnail, or the coloured placeholder for sample photos. */
export function PhotoThumb({ photo, label }: { photo: Photo; label?: string }) {
  const url = useImageUrl(photo.id, 'thumb', !!photo.hasImage);
  if (!photo.hasImage) return <PhotoPlaceholder roomId={photo.roomId} label={label} />;
  return (
    <div className="photo-img">
      {url && <img src={url} alt={photo.caption} loading="lazy" draggable={false} />}
    </div>
  );
}
