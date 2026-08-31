import { build } from "esbuild";

await build({
  entryPoints: ["site-src/hero-product.js"],
  bundle: true,
  minify: true,
  format: "esm",
  target: ["es2022"],
  outfile: "public/drinkstill/hero-product.js",
  logLevel: "warning",
});
