FROM node:8

# TODO: master branch
RUN git clone https://github.com/aragon/aragonOS.git
# TODO: remove docker-deplpy branch on merge
RUN cd aragonOS && git checkout docker-deploy && npm install && npm run compile

RUN git clone https://github.com/aragon/aragon-id.git
RUN cd aragon-id && npm install && npm run compile

COPY . aragon-apps

WORKDIR aragon-apps
RUN npm install

# TODO: Split here into another template specific image and use above as base

RUN node_modules/.bin/lerna bootstrap --nohoist=@aragon/os --scope @aragon/templates-beta

WORKDIR templates/beta
