FROM ruby:3.4.2

RUN gem update --system 3.4.13
RUN gem install bundler jekyll

# Set the working directory
WORKDIR /src

# Copy Gemfile and install dependencies globally
COPY Gemfile Gemfile.lock* ./
RUN bundle config set --global path '/usr/local/bundle'
RUN bundle install

EXPOSE 4000

CMD [ "bundle", "exec", "jekyll", "serve", "--force_polling", "-H", "0.0.0.0", "-P", "4000" ]
