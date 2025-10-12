import { createAccessControlApp } from './access-control-app.js';

const port = Number.parseInt(process.env.PORT ?? '4000', 10);
const app = createAccessControlApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Access control API listening on http://0.0.0.0:${port}`);
});
