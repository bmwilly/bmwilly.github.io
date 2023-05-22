FROM ruby:3.2.2

RUN gem update --system 3.4.13
RUN gem install bundler jekyll

COPY ./site/Gemfile ./src/site/Gemfile
RUN cd ./src/site && bundle install

COPY ./ ./src

WORKDIR ./src/site
EXPOSE 4000

CMD [ "bundle", "exec", "jekyll", "serve", "--force_polling", "-H", "0.0.0.0", "-P", "4000" ]
