#!/bin/bash

# We create symlinks of the already installed node_modules and package-lock.json

# Start the app, have fun
npm run prisma-init
npx prisma db seed
