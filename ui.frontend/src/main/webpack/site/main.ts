
// Stylesheets
import "./main.scss";

// Javascript or Typescript - use Vite's import.meta.glob instead of webpack glob-import-loader
const siteModules = import.meta.glob(['./**/*.ts', './**/*.js', '../components/**/*.ts', '../components/**/*.js'], { eager: true });
