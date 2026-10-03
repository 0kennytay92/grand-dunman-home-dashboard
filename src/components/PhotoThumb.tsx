import { ImageOff, Ruler } from 'lucide-react';
import { useImageUrl, useSlow } from '../data/images';
import { useStore } from '../data/store';
import type { Photo } from '../data/types';
import { PhotoPlaceholder } from './ui';

/** A photo's thumbnail, or the coloured placeholder for sample photos. */
export function PhotoThumb({ photo, label }: { photo: Photo; label?: string }) {
  const url = useImageUrl(photo.id, 'thumb', !!photo.hasImage);
  const pins = useStore().data.measurements.filter((m) => m.pin?.photoId === photo.id).length;
  const slow = useSlow(!!photo.hasImage && !url);
  if (!photo.hasImage) return <PhotoPlaceholder roomId={photo.roomId} label={label} />;
  return (
    <div className="photo-img">
      {url ? (
        <img src={url} alt={photo.caption} loading="lazy" draggable={false} />
      ) : (
        <span className="thumb-wait">
          {slow ? <><ImageOff size={18} /> Picture not here yet – it may still be uploading from your other device</> : 'Loading picture…'}
        </span>
      )}
      {pins > 0 && (
        <span className="thumb-badge" title={`${pins} measurement${pins > 1 ? 's' : ''} on this photo`}>
          <Ruler size={12} /> {pins}
        </span>
      )}
    </div>
  );
}
