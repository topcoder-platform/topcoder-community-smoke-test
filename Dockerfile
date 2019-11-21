### STAGE 1: Build ###

# We label our stage as ‘builder’
FROM node:alpine as builder

COPY package.json package-lock.json ./

## Storing node modules on a separate layer will prevent unnecessary npm installs at each build

RUN npm ci && mkdir /ng-app && mv ./node_modules ./ng-app

WORKDIR /ng-app

COPY . .


 
