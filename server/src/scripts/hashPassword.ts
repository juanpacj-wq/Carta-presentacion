/**
 * Genera un hash scrypt para colocar en AUTH_PASSWORD_HASH.
 * Uso: npm run hash-password --workspace=server -- '<password>'
 */
import { hashPassword } from '../services/authService.js';

const pwd = process.argv[2];
if (!pwd) {
  console.error('Uso: npm run hash-password --workspace=server -- \'<password>\'');
  process.exit(1);
}

hashPassword(pwd)
  .then((hash) => {
    process.stdout.write(hash + '\n');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
