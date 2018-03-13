FROM node:8

RUN git clone https://github.com/aragon/aragonOS.git
RUN cd aragonOS && npm install && npm run compile

RUN git clone https://github.com/aragon/aragon-id.git
RUN cd aragon-id && npm install && npm run compile

COPY . aragon-apps

WORKDIR aragon-apps
RUN npm install

# TODO: Split here into another template specific image and use above as base

RUN node_modules/.bin/lerna bootstrap --nohoist=@aragon/os --scope @aragon/templates-beta --scope @aragon/apps-*

WORKDIR templates/beta
