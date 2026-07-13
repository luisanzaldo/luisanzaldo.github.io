import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import tailwind from "@astrojs/tailwind";
import icon from "astro-icon";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
	build: {
		inlineStylesheets: "always",
	},
	vite: {
		server: {
			watch: {
				usePolling: true,
			},
		},
	},
	site: "https://metarrelato.com",
	i18n: {
		defaultLocale: "es",
		locales: ["es"],
	},
	markdown: {
		drafts: true,
		shikiConfig: {
			theme: "css-variables",
		},
	},
	shikiConfig: {
		wrap: true,
		skipInline: false,
		drafts: true,
	},
	integrations: [
		tailwind({
			applyBaseStyles: false,
		}),
		sitemap({
			filter: (page) =>
				!page.includes("/conversor") && !page.includes("/lienzo") && !page.includes("/webapps") && !page.includes("/metatetris"),
		}),
		mdx(),
		icon(),
	],
});
