/*app.ts*/
import express, { Express } from 'express';
import enableTrackedTests from 'tracked-tests-nodejs';

const PORT: number = parseInt(process.env.PORT || '9090');
const app: Express = express();

app.use(enableTrackedTests());

function getRandomNumber(min: number, max: number) {
  return Math.floor(Math.random() * (max - min) + min);
}

app.post('/rolldicepost', (req, res) => {
  res.send(getRandomNumber(1, 6).toString());
});

app.listen(PORT, () => {
  console.log(`Listening for requests on http://localhost:${PORT}`);
});
