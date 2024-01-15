import express from 'express';
import renderPage from '../utils/RenderPage';

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

export default app;
