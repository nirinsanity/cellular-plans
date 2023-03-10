import { defineConfig } from 'vite'
import { createVuePlugin as vue } from "vite-plugin-vue2";
import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        svgLoader()
    ]
})