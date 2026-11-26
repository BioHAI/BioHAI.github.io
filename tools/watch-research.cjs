'use strict';
const {sync}=require('./sync-research.cjs');
const hours=Number(process.env.SYNC_INTERVAL_HOURS||6);
if(!Number.isFinite(hours)||hours<1||hours>168)throw Error('SYNC_INTERVAL_HOURS must be between 1 and 168.');
async function tick(){
  try{const r=await sync();console.log(`[${r.checkedAt}] Research sync OK: ${r.recentRecords} recent records, ${r.added.length} new, ${r.enriched.length} covers.`);}
  catch(error){console.error('Research sync failed; keeping existing website data. '+error.message);}
  console.log(`Next check in ${hours} hours. Keep this process running for local automatic updates.`);
  setTimeout(tick,hours*3600000);
}
if(process.argv.includes('--skip-initial')){console.log(`Research watcher started. Next check in ${hours} hours.`);setTimeout(tick,hours*3600000);}else tick();
