const clear_cookie_user_map = true;
const clear_initiatives = true;

const { Pool } = require("pg");
const uuid = require("uuid").v4;
const SqlString = require("sqlstring");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

async function run() {
  if (clear_cookie_user_map) {
    console.log(1)

    await pool.query(`
      truncate table cookie_user_map;
    `);

    console.log(2)

    await pool.query(`
      insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags, last_activity)
      values (E${SqlString.escape(uuid())}, E${SqlString.escape(
      JSON.stringify({})
    )}, E${SqlString.escape("114409764148443206366")}, E${SqlString.escape(
      "Programming"
    )}, ARRAY[${["student", "manager", "admin", "super-admin"]
      .map((tag) => "E" + SqlString.escape(tag))
      .join(", ")}], ${Math.floor(new Date().getTime() / 60000)});
    `);

    console.log(3)

    await pool.query(`
      insert into cookie_user_map(cookie_uuid, token, google_id, subteam, tags, last_activity)
      values (E${SqlString.escape(uuid())}, E${SqlString.escape(
      JSON.stringify({})
    )}, E${SqlString.escape("114004268874458123024")}, E${SqlString.escape(
      "Programming"
    )}, ARRAY[${["student", "manager", "admin", "super-admin"]
      .map((tag) => "E" + SqlString.escape(tag))
      .join(", ")}], ${Math.floor(new Date().getTime() / 60000)});
    `);

    console.log(4)
  }
  if (clear_initiatives) {
    console.log(5)

    await pool.query(`
      truncate table initiatives;
    `);

    console.log(6)
  }
}

run()