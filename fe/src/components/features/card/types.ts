interface BaseCard {
  title: string;
  imageUrl: string;
  href: string;
  description?: string;
}

export interface PosterCardProps extends BaseCard {
  variant: 'poster';
}

export interface StreamCardProps extends BaseCard {
  viewers: number;
  variant: 'stream';
  streamer: string;
}

export type FeatureCardProps =
  | PosterCardProps
  | StreamCardProps;