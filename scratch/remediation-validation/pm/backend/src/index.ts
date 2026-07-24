import { app } from './app.js';
import { ENV } from './config/env.js';

app.listen(ENV.PORT, () => {
  console.log(`Server running on http://localhost:${ENV.PORT} in ${ENV.NODE_ENV} mode`);
});
