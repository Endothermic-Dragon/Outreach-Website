const { Client } = require('pg');

(async function(){
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

await client.connect(); 

function log_output(err, res){
  if (err) throw err;
  for (let row of res.rows) {
    console.log(JSON.stringify(row));
  }
}

console.log(1)

await client.query(`
create table cookie_user_map(
  cookie_uuid char(36),
  subteam varchar(32),
  tags varchar(11)[],
  token varchar(2048),
  google_id varchar(32),
  last_activity serial
);
`, log_output);

console.log(2)

await client.query(`
create table outreach(
  google_id varchar(32),
  initiative_data text
);
`, log_output);

console.log(3)

// hide_log means that it no longer records new volunteering hours
// Add label in front end to show as "done" (as compared to "running")
await client.query(`
create table initiatives(
  unique_id char(36),
  order_id smallserial,
  name varchar(200),
  description varchar(5000),
  participants smallint,
  engagement serial,
  lead boolean,
  regular boolean,
  hide_log boolean,
  hide_public boolean
);
`, log_output);

console.log(4)

// client.end()

console.log(5)
})();