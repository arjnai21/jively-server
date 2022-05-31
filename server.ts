import express, { Request, Response } from "express";
import SpotifyWebApi from 'spotify-web-api-node';
import cors from 'cors';
import bodyParser from 'body-parser';

require("dotenv").config();



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
        redirectUri: process.env.REDIRECT_URI,
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
    }).catch((err) => {
        console.log("Could not refresh access token", err);
        res.sendStatus(400);
    });
});

app.post('/login', (req: Request, res: Response) => {
    console.log("received login req");
    const code = req.body.code;
    const spotifyApi = new SpotifyWebApi({
        redirectUri: process.env.REDIRECT_URI,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
    });

    spotifyApi.authorizationCodeGrant(code).then(data => {
        console.log("got authorization code")
        res.json({
            accessToken: data.body.access_token,
            refreshToken: data.body.refresh_token,
            expiresIn: data.body.expires_in
        });
    }).catch((err) => {
        console.log(err);
        res.sendStatus(400);
    })

});

app.listen(process.env.PORT, () => {
    console.log("server started")
});