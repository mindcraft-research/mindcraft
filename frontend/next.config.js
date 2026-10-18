/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // MindCraft n'utilise pas next/image : l'optimiseur d'images est coupé
  // (failles connues de Next 14 dans /_next/image, cf. middleware.js).
  images: { unoptimized: true },
}

module.exports = nextConfig
