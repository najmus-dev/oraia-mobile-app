import { notifyAdminsOfSignup } from './src/services/emailService';

notifyAdminsOfSignup({ email: 'test-signup@example.com', userId: 'test-user-id-123' })
  .then(() => {
    console.log('Done — check inbox');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
