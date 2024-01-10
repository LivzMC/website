import express from 'express';
import renderPage from '../utils/RenderPage';

const app = express.Router();

app.get('/', (req, res) => {
  renderPage(req, res, 'home', {});
});

export default app;
