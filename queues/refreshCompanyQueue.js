import Queue from 'bull';
import runJobs from '../jobs/runJobs';
import { Quickbook } from '../db';

const queue = new Queue('refresh company', process.env.REDIS_URL);

queue.process(async (job, done) => {
  const { realmId } = job.data;
  console.log('refresh company', realmId);
  const company = await Quickbook.findOne({
    where: { realmID: realmId },
  });

  company.status = 'Loading';
  company.statusInfo = JSON.stringify({ workerId: job.id });
  await company.save();

  await runJobs(true, realmId, false);

  company.status = null;
  company.statusInfo = null;
  await company.save();

  done();
});

export default (data) => {
  const job = new Queue('refresh company', process.env.REDIS_URL);

  return job.add(data);
};
