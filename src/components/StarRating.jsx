import { HiStar } from 'react-icons/hi';

export default function StarRating({ value = 0, size = 'text-base' }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <HiStar
          key={star}
          className={`${size} ${star <= value ? 'text-myland-gold' : 'text-myland-mist'}`}
        />
      ))}
    </span>
  );
}
