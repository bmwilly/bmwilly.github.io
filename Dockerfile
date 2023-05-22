FROM ruby:3.2.2

RUN gem update --system 3.4.13
RUN gem install bundler jekyll

COPY ./docs ./docs

WORKDIR ./docs
RUN bundle install

CMD [ "bundle", "exec", "jekyll", "serve" ]
