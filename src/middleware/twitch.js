const axios = require('axios');
const twitchConfig = require('../../config/twitch.json');
const moment = require('moment');
const fs = require('fs');
const path = require('path');

process.on('unhandledRejection', function(reason, p){
    console.log("Possibly Unhandled Rejection at: Promise ", p, " reason: ", reason);
    // application specific logging here
});

module.exports.getClips = function (app) {
    return async function (req, res, next) {
        const user = req.user;

        await checkToken();

        let clips;
        await axios
        .get(`https://api.twitch.tv/helix/clips?broadcaster_id=${user.id}&first=100`, {
            headers: {
                Authorization: `Bearer ${twitchConfig.access_token}`,
                "Client-Id": twitchConfig.client_id
            },
        })
        .then(response => {
            clips = response.data.data;
        })
        .catch(async e => {
            console.error(e.response.data);
        });
        if(!clips) res.status(500).json({error: true, message: "server encountered an error trying to get clips"});

        for(let clip of clips) {
            clip.downloadLink = clip.thumbnail_url.substring(0, clip.thumbnail_url.indexOf("-preview")) + ".mp4";
        }
        
        res.json(clips);
    };
};

module.exports.getClipsFromTimeStamp = function (app) {
    return async function (req, res, next) {
        if(!req.body.start) return res.status(400).json({error: true, message: "missing start timestamp"});
        if(!req.body.end) return res.status(400).json({error: true, message: "missing end timestamp"});
        if(!req.body.view_count) return res.status(400).json({error: true, message: "missing view count param"});

        const start = moment(req.body.start, moment.ISO_8601);
        if (!start.isValid())
            return res
            .status(400)
            .json({ error: true, message: "Invalid Start Time Format: MUST be in ISO 8601 FORMAT" });
        const end = moment(req.body.end, moment.ISO_8601)
        if (!end.isValid())
            return res
            .status(400)
            .json({ error: true, message: "Invalid End Time Format: MUST be in ISO 8601 FORMAT" });

        const user = req.user;

        await checkToken();

        let clips;
        let data = await getClips(user.id, req.body.start, req.body.end);
        if(!data) res.status(500).json({error: true, message: "server encountered an error trying to get clips"});

        clips = data.data;

        let cursor = data.pagination.cursor
        while(cursor) {
            data = await getNextClips(user.id, req.body.start, req.body.end, cursor);
            clips = clips.concat(data.data)
            cursor = data.pagination.cursor;
        }

        let parsedClips = [];
        for(let clip of clips) {
            if(clip.view_count >= req.body.view_count) {
                clip.downloadLink = clip.thumbnail_url.substring(0, clip.thumbnail_url.indexOf("-preview")) + ".mp4";
                parsedClips.push(clip);
            }
        }

        res.json(parsedClips);
    };
};

const getClips = async(twitchId, start, end) => {
    let data
    await axios
    .get(`https://api.twitch.tv/helix/clips?broadcaster_id=${twitchId}&first=100&started_at=${start}&ended_at=${end}`, {
        headers: {
            Authorization: `Bearer ${twitchConfig.access_token}`,
            "Client-Id": twitchConfig.client_id
        },
    })
    .then(response => {
        data = response.data;
    })
    .catch(async e => {
        console.error(e.response.data);
    });
    return data;
}

const getNextClips = async(twitchId, start, end, cursor) => {
    let data
    await axios
    .get(`https://api.twitch.tv/helix/clips?broadcaster_id=${twitchId}&first=100&started_at=${start}&ended_at=${end}&after=${cursor}`, {
        headers: {
            Authorization: `Bearer ${twitchConfig.access_token}`,
            "Client-Id": twitchConfig.client_id
        },
    })
    .then(response => {
        data = response.data;
    })
    .catch(async e => {
        console.error(e.response.data);
    });
    return data;
}

const checkToken = async () => {
    let isValid = false;
    await axios(`https://id.twitch.tv/oauth2/validate`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${twitchConfig.access_token}`
        }
    })
    .then(response => {
        if(response.status < 400) {
            isValid = true;
        }
    })
    .catch(async e => {
        if(e.response.status === 401) {
            console.info('Twitch App Token Expired')
            return await refreshToken();
        }
        console.error(e.response.data);
    });
    return isValid;
}

const refreshToken = async () => {
    await axios
    .post(
        `https://id.twitch.tv/oauth2/token?client_id=${twitchConfig.client_id}&client_secret=${twitchConfig.client_secret}&grant_type=client_credentials`
    )
    .then(response => {
        const data = response.data;
        twitchConfig.access_token = data.access_token;
        fs.writeFile(path.resolve(__dirname, "../../config/twitch.json"), JSON.stringify(twitchConfig, null, 4), (err) => {
            if(err) return console.error(err);
            console.info('Refreshed Twitch App Token');
        })
    })
    .catch(e => {
        if(!e.response) return console.error(e);
        console.error(e.response.data);
    });
}