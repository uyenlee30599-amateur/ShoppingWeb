import { imageUrl } from "../utils/api";
export default function AppImage({ alt, src, ...props }) {
  return <img loading="lazy" alt={alt} src={imageUrl(src)} {...props} />;
}
