FROM docker:latest
RUN apk --update add bash nodejs && rm -rf /var/cache/apk/*
WORKDIR /playground
