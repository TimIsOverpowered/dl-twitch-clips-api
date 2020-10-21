const twitch = require('./twitch');
const { authenticate } = require("@feathersjs/express");

module.exports = function (app) {

  app.get(
    "/v1/clips",
    authenticate("jwt"),
    twitch.getClips(app)
  );

  app.post("/v1/clips", authenticate("jwt"), twitch.getClipsFromTimeStamp(app));

};
