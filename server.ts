import express, { Request, Response } from "express";
import SpotifyWebApi from 'spotify-web-api-node';
import cors from 'cors';
import bodyParser from 'body-parser';
import pg from 'pg';
import fs from "fs";


require("dotenv").config();

const pool = new pg.Pool({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DATABASE,
    password: process.env.POSTGRES_PASSWORD,
    //@ts-ignore
    port: parseInt(process.env.POSTGRES_PORT),
    ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync('rds-combined-ca-bundle.pem').toString(),
        // key: fs.readFileSync('rds-combined-ca-bundle.pem').toString(),
        // cert: fs.readFileSync('rds-combined-ca-bundle.pem').toString(),
    },

})


const app = express();
app.use(cors());
app.use(bodyParser.json());

app.get("/hello", (req: Request, res: Response) => {
    console.log('request recieved');
    res.send("hello");
})

app.post('/refresh', (req: Request, res: Response) => {
    console.log("received refresh req")
    const refreshToken = req.body.refreshToken;
    const spotifyApi = new SpotifyWebApi({
        redirectUri: req.body.redirectUri,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: refreshToken,
    });

    spotifyApi.refreshAccessToken().then((data) => {
        console.log(data.body);

        // console.log("refreshed access token");
        // spotifyApi.setAccessToken(data.body["access_token"]);
        res.json({
            accessToken: data.body.access_token,
            expiresIn: data.body.expires_in
        });
        spotifyApi.setAccessToken(data.body.access_token);
        insertLogin(spotifyApi);
    }).catch((err) => {
        console.log("Could not refresh access token", err);
        res.sendStatus(400);
    });
});

app.post('/login', (req: Request, res: Response) => {
    console.log("received login req");
    const code = req.body.code;
    const spotifyApi = new SpotifyWebApi({
        redirectUri: req.body.redirectUri,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
    });

    spotifyApi.authorizationCodeGrant(code).then(data => {
        console.log("got authorization code");
        res.json({
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in
        });
        spotifyApi.setAccessToken(data.body.access_token);
        writeUserToDb(spotifyApi);
        insertLogin(spotifyApi);

    }).catch((err) => {
        console.log(err);
        res.sendStatus(400);
    });



});

app.listen(process.env.PORT, () => {
    console.log("server started")
});

function writeUserToDb(spotifyApi: SpotifyWebApi) {
    console.log("writing user");

    spotifyApi.getMe().then((resp) => {
        let username = resp.body.id;
        let email = resp.body.email;
        let loginTime = new Date();
        let displayName = resp.body.display_name;
        pool.query("INSERT INTO users(spotify_id, email_address, first_login, display_name) VALUES ($1, $2, $3, $4)", [username, email, loginTime, displayName]).then((result) => {
            console.log(result);
        }).catch(error => console.log(error)); // will throw error if you try to insert a user that already exists. TODO maybe come up with a better way
    }

    );

}

function insertLogin(spotifyApi: SpotifyWebApi) {
    console.log("inserting login");

    spotifyApi.getMe().then((resp) => {
        let username = resp.body.id;
        let loginTime = new Date();
        pool.query("INSERT INTO logins(spotify_id, time) VALUES ($1, $2)", [username, loginTime]).then((result) => {
        }).catch(error => console.log(error));
    });

}
