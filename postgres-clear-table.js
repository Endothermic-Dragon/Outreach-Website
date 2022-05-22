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
truncate table cookie_user_map;
`, log_output);

console.log(2)
})();