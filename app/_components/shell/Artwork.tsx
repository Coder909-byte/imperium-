import Image from "next/image";
import city from "@/content/assets/shell/cole-consummation.webp";
import military from "@/content/assets/shell/royer-vercingetorix.webp";

export function Artwork({ auth = false, fullBleed = false }: { auth?: boolean; fullBleed?: boolean }) {
  return (
    <Image
      src={auth ? military : city}
      alt={auth ? "Royer’s 1899 interpretation of Vercingetorix on horseback before Caesar at Alesia." : "Cole’s imagined classical city, with monumental temples, a harbour and a triumphal procession."}
      fill
      sizes={fullBleed ? "(max-width: 767px) 1460px, 100vw" : auth ? "(max-width: 767px) 100vw, 55vw" : "(max-width: 767px) 100vw, (max-width: 1536px) 92vw, 1408px"}
      preload
      className="shell-art object-cover"
      placeholder="blur"
    />
  );
}
