const { AuthenticationService, JWTStrategy } = require('@feathersjs/authentication');
const {
  expressOauth,
  OAuthStrategy,
} = require("@feathersjs/authentication-oauth");
const axios = require('axios');
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const redis = require('redis');
const redisClient = redis.createClient();

class TwitchStrategy extends OAuthStrategy {
  constructor(app) {
    super(app);
  }

  async getProfile(authResult) {
    const accessToken = authResult.access_token;

    let { data } = await axios
      .get("https://api.twitch.tv/helix/users", {
        headers: {
          authorization: `Bearer ${accessToken}`,
          "Client-ID": this.app.get("authentication").oauth.twitch.key,
        },
      })
      .catch((e) => {
        console.error(e);
      });
    data = data.data[0];

    data.access_token = authResult.access_token;
    data.refresh_token = authResult.refresh_token;

    return data;
  }

  async getEntityData(profile) {
    return {
      id: profile.id,
      username: profile.login,
      display_name: profile.display_name
    };
  }

  getEntityQuery(profile) {
    return {
      id: profile.id,
    };
  }
}

module.exports = app => {
  const authentication = new AuthenticationService(app);

  authentication.register('jwt', new JWTStrategy());
  authentication.register("twitch", new TwitchStrategy(app));


  app.use('/authentication', authentication);
  app.configure(
    expressOauth({
      expressSession: session({
        store: new RedisStore({ client: redisClient }),
        secret: app.get("sessionSecret"),
        resave: false,
        saveUninitialized: true,
      }),
    })
  );
};
