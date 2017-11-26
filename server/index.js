const express = require('express');
const formidable = require('formidable');
const fs = require('fs');
const Promise = require('bluebird');
const request = require('request');
const serveStatic = require('serve-static');

const db = require('./db');
const app = express();
const PORT = 8088;

const utils = require('./utils');

const generatedEmbeddings = '/host/Users/uladzimir/projects/wth/server/generated-embeddings';
const user = require("./models/users");

let saveUser = (options) => {
    return new Promise((resolve, reject) => {
        let newUser = new user(options);

        newUser.save(function (err, result) {
            if (err) throw err;
            resolve(result._doc._id.toString());
        });
    });
};


app.post('/process', function (req, res) {
    console.time('process');
    const dir = `${__dirname}/uploads/${Date.now()}`;
    const form = new formidable.IncomingForm();

    form.parse(req);

    form.on('fileBegin', (name, file) => {
        let ext = '';
        console.time('existsSync');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir);
        }
        console.timeEnd('existsSync');
        if (file.name.includes('.png') || file.name.includes('.jpeg') || file.name.includes('.jpg')) {
            ext = '';
        } else {
            ext = '.jpg'
        }
        file.path = `${dir}/${file.name}${ext}`;

        fs.writeFile(file.path, file, function (err) {
            if (err) {
                console.log(err);
                return res.status(500).send('Something broke!' + err);
            }

            console.log("The file was saved!");

            console.time('generate_align');
            return utils.processImage(dir)
                .then(output => {
                    console.timeEnd('generate_align');
                    // console.log(output);
                    console.time('reps.csv');
                    return Promise.promisify(fs.readFile)(`${generatedEmbeddings}/reps.csv`)
                })
                .then(content => {
                    console.timeEnd('reps.csv');
                    console.time('request');
                    return request.post({
                            url: 'http://10.168.0.123:9090/',
                            form: {content: content}
                        },
                        function (err, httpResponse, body) {
                            console.timeEnd('process');
                            console.timeEnd('request');
                            saveUser({
                                photo: Date.now(),

                            }).then(res => {
                                res.send({content: body, id: res})
                            });
                        });
                })
                .catch((err) => {
                    console.error(err.stack);
                    res.status(500).send('Something broke!');
                });
        });
    });
});

app.post('/user', function (req, res) {
    var newUser = new user({
        phone: Date.now(),
        rating: "2222",
        url: "dsds",
        description: "dsds",
    });

    newUser.update({_id: req.params.id}, {
        phone: Date.now(),
        rating: "2222",
        url: "dsds",
        description: "dsds",
    }, function (err, result) {
        if (err) throw err;
        res.send(result._doc._id.toString());
    });
});

app.put('/user', function (req, res) {
    var newUser = new user({
        phone: Date.now(),
        rating: "2222",
        url: "dsds",
        description: "dsds",
    });

    newUser.save(function (err, result) {
        if (err) throw err;
        res.send(result._doc._id.toString());
    });
});


app.get('/users', function (req, res) {
    user.find({}, function (err, users) {
        if (err) throw err;

        res.send(users);
    });
});

app.use('/static/images', serveStatic('./uploads/'));

app.listen(PORT);
console.log('Running on http://localhost:' + PORT);
