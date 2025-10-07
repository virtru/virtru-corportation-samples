import fs from 'fs';
import { defineConfig, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';
import yaml from '@rollup/plugin-yaml';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import path from 'path';

const config: UserConfig = {
  plugins: [
    react(),
    // read in the federal_policy.yaml file at build time and extract the attributes object
    yaml({
      transform(data, filePath) {
        if (filePath.match(/federal_policy\.yaml/)) {
          // @ts-expect-error 2339 - YAML schema is validated by DSP and should not be validated by the frontend
          const { attributes } = data;
          if (!attributes) {
            console.error('Error: federal_policy.yaml is missing attributes');
            process.exit(1);
          }
          return { attributes };
        }
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: 'node_modules/leaflet/dist/images/marker*',
          dest: 'img',
        },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@root': path.resolve(__dirname, './../'),
    },
  },
};

// if dev server
if (process.env.NODE_ENV === 'development') {
  config.server = {
    host: 'local-dsp.virtru.com',
    https: {
      key: fs.readFileSync('../dsp-keys/local-dsp.virtru.com.key.pem'),
      cert: fs.readFileSync('../dsp-keys/local-dsp.virtru.com.pem'),
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(config);
