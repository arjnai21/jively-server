import express, { Request, Response } from "express";
import SpotifyWebApi from 'spotify-web-api-node';
import cors from 'cors';
import bodyParser from 'body-parser';
import nodemailer from 'nodemailer';

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
        sendUserToMe(spotifyApi);
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
        sendUserToMe(spotifyApi);

    }).catch((err) => {
        console.log(err);
        res.sendStatus(400);
    });



});

app.listen(process.env.PORT, () => {
    console.log("server started")
});

function sendUserToMe(spotifyApi: SpotifyWebApi) {
    spotifyApi.getMe().then((userResp) => {
        let text = emailTemplate("somebody just logged into jively", "Their username is: " + userResp.body.display_name + " and their email is: " + userResp.body.email);
        sendEmail("arjnair03@gmail.com", "new jively user", text);
    });
}

const emailTemplate = (title: string, body: string) => `<!DOCTYPE html>
<html lang="en">
  <head>
  hello
  </head>
  <body>
    <h1>${title}</h1>
    <p>${body}</p>
  </body>
</html>`;

function sendEmail(to: string, subject: string, message: string) {
    let transporter = nodemailer.createTransport({
        service: 'gmail', //change if not using gmail
        host: 'smtp.gmail.com', // also change if not using gmail
        port: 465,
        secure: true,
        auth: {
            user: "asnair499@gmail.com",
            pass: process.env.GMAIL_PASSWORD
        }
    });

    let mailDetails = {
        from: "asnair499@gmail.com",
        to: to,
        subject: subject,
        html: message,
    };

    transporter.sendMail(mailDetails, function (err, data) {
        if (err) console.error(err)
    });
}