import express from 'express';
import renderPage from '../utils/RenderPage';
import ErrorManager from '../managers/ErrorManager';

const app = express.Router();

app.get('/', (req, res) => {
  renderPage(req, res, 'home', {});
});

app.get('/contact', (req, res) => {
  res.write('You can contact me at these places:\n');
  res.write('Discord: https://discord.gg/ytrKev7xZD\n');
  res.write('Email: support@livzmc.net\n');
  res.send();
});

app.get('/test-error', async function (req, res) {
  try {
    throw new Error('This is a test error message.');
  } catch (e) {
    new ErrorManager(req, res, e as Error, false).write();
  }
});

export default app;
