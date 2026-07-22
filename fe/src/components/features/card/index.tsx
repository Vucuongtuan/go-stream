import { PosterCard } from "./PosterCard";
import { StreamCardVariant } from "./StreamCardVariant";
import type { FeatureCardProps } from "./types";

export type { FeatureCardProps, PosterCardProps, StreamCardProps } from "./types";

export function FeatureCard(props: FeatureCardProps) {
  if (props.variant === "poster") {
    return <PosterCard {...props} />;
  }

  return <StreamCardVariant {...props} />;
}

export default FeatureCard;
