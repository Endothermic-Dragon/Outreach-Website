const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

(async function(){
let userData = await pool.query(`
select cookie_uuid from cookie_user_map where google_id = '114409764148443206366';
`).then(data => {
  console.log(data)
  return data;
}).catch(err => {
  console.log(err)
  return
})
console.log(userData)
})();