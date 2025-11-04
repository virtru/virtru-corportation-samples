# COP SPA

React application built using: 
  - [Vite](https://vitejs.dev/guide/) for development environment and build tooling
  - TypeScript
  - Node v22 

> [!IMPORTANT]
> We strongly recommend using [nvm](https://github.com/nvm-sh/nvm) to easily manage installed Node versions. To install `nvm`, follow the [instructions](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) from the official the documentation.  Note that installing with Homebrew is **NOT** officially supported.

## Set Node version

```bash
nvm use
```

## Install

```bash
npm ci
```

## Vite environment setup

Environment variables for the frontend can be found in `.env.example` and specified in the root COP `docker-compose.yaml`.

To create your local `.env` file, copy the `.env.example` file to a new file named `.env`:

```bash
cp .env.example .env 
# for local-only variables:
# cp .env.example .env.local
```

For more information on Vite environment config, see the [official documentation](https://vitejs.dev/guide/env-and-mode.html).


## Build

> [!IMPORTANT]
> A build is required when running the COP Go server with the production static assets. See the [README](/README.md#run-the-cop-server) for more information.

```bash
# output built files to /dist folder
npm run build
```

## Local development using Vite + Hot Module Replacement (HMR)

```bash
npm start
```

## Folder structure

```plaintext
ui
└── public
      - static assets (images, fonts, etc.) copied to /dist folder, maintaining folder structure
└── src
    ├── @types
          - custom TypeScript types
    ├── components
          - layout components
          - reusable components
          - AuthProvider component consuming the authentication context
    ├── contexts
          - authentication context interface and implementations
    ├── hooks
          - custom hook implementations
    ├── pages
          - components implementing an application route
          - Login component used by the AuthProvider
    ├── proto
          - generated TypeScript client from the COP protobuf definitions
          - !! DO NOT modify these files !!
    ├── theme
          - @mui/material component library theme configuration and modifications
    ├── utils
          - utility functions
    ├── App.tsx
          - application entry point
    ├── config.ts
          - TS module to transform Vite environment variables into typed object
    ├── constants.ts
          - application constants
    ├── main.tsx
          - React DOM render
    └── vite-env.d.ts
          - Type definition for Vite environment variables
```
