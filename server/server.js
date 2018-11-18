require('dotenv').config();

const express = require('express');
const cors = require('cors');
const glob = require('glob');
const fs = require('fs');

const PORT = process.env.PORT;

const app = express();

app.use(cors());
app.options('*', cors());

const router = express.Router();

router.get('/data/pose', (req, res) => {

    const poseFrames = [];

    try {

        glob('data/pose/*.json', (err, files) => {

            if ( err ) {

                console.log(`glob error: ${err}`);
                return;

            }

            if ( !files || files.length === 0 ) {

                res.json({err: 'no files found'});
                return;

            }

            for (const file of files) {

                const poseFrame = new Promise((resolve, reject) => {

                    fs.readFile(file, (err, data) => {

                       if ( err ) {

                           console.log(`file error: ${err}`);
                           reject(err);
                           return;

                       }

                       const poseData = JSON.parse(data);
                       resolve(poseData);

                   });
               });

               poseFrames.push(poseFrame);

            }

            Promise.all(poseFrames).then(poseFrames => {
                res.json({ poseFrames }).status(200);
            })
            .catch(err => {

                console.log(err);

            });
        });

    } catch (e) {

        res.json({ e }).status(500);

    }
});

app.use('/', router);

app.listen(PORT, () => {

    console.log(`running on port ${PORT}`);

});
