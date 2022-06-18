const clear_cookie_user_map = true

const { Pool } = require('pg');
const uuid = require("uuid").v4;
const SqlString = require('sqlstring');

(async function(){
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

if (clear_cookie_user_map){
  await pool.query(`
  truncate table cookie_user_map;
  `);

  await pool.query(`
  insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags)
  values (E${
    SqlString.escape(uuid())
  }, E${
    SqlString.escape(JSON.stringify({}))
  }, E${
    SqlString.escape("114409764148443206366")
  }, E${
    SqlString.escape("Programming")
  }, ARRAY[${
    ["student", "mentor", "admin", "super-admin"].map(tag => "E" + SqlString.escape(tag)).join(", ")
  }]);
  `);

  await pool.query(`
  insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags)
  values (E${
    SqlString.escape(uuid())
  }, E${
    SqlString.escape(JSON.stringify({}))
  }, E${
    SqlString.escape("114004268874458123024")
  }, E${
    SqlString.escape("Programming")
  }, ARRAY[${
    ["student", "mentor", "admin", "super-admin"].map(tag => "E" + SqlString.escape(tag)).join(", ")
  }]);
  `);
}
})();