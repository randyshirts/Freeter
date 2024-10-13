FROM docker.io/node:20

# Create a non-root user
RUN useradd -ms /bin/bash randys

COPY --chown=1000:1000 . .

RUN apt-get update && apt-get install -y curl gnupg2 git
RUN curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - \
    && echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list \
    && apt-get update && apt-get install -y yarn

USER randys
