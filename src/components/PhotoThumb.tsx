import { Ruler } from 'lucide-react';
import { useImageUrl } from '../data/images';
import { useStore } from '../data/store';
import type { Photo } from '../data/types';
import { PhotoPlaceholder } from './ui';

/** A photo's thumbnail, or the coloured placeholder for sample photos. */
export function PhotoThumb({ photo, label }: { photo: Photo; label?: string }) {
  const url = useImageUrl(photo.id, 'thumb', !!photo.hasImage);
  const pins = useStore().data.measurements.filter((m) => m.pin?.photoId === photo.id).length;
  if (!photo.hasImage) return <PhotoPlaceholder roomId={photo.roomId} label={label} />;
  return (
    <div className="photo-img">
      {url && <img src={url} alt={photo.caption} loading="lazy" draggable={false} />}
      {pins > 0 && (
        <span className="thumb-badge" title={`${pins} measurement${pins > 1 ? 's' : ''} on this photo`}>
          <Ruler size={12} /> {pins}
        </span>
      )}
    </div>
  );
}
