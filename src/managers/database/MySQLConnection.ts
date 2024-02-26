import mysql from 'mysql2';
import fs from 'fs';

const HOST: string = process.env.SQL_SERVER || 'localhost';
const USER: string = process.env.SQL_USER || 'user';
const PASSWORD: string = process.env.SQL_PASSWORD || 'default-password';
const PORT: number = process.env.SQL_PORT && !isNaN(parseInt(process.env.SQL_PORT)) ? parseInt(process.env.SQL_PORT) : 3306;
const DATABASE_NAME: string = process.env.SQL_DATABASE || 'staging_livzmc';

const pool = mysql.createPool({
  host: HOST,
  user: USER,
  password: PASSWORD,
  port: PORT,
  database: DATABASE_NAME,
  charset: 'utf8mb4',
  stringifyObjects: true,
});

/**
 * @param statement The search statement
 * @param values The values that should be used inside the statement
 * @returns a promise of the query
 */
export async function querySync(statement: string, values: Array<any> = []): Promise<any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  const data = await pool.promise().query(
    {
      sql: statement,
      timeout: 1000 * 10,
    },
    values,
  );

  return data[0];
}

export function connectToDatabase(): void {
  console.log(`Connected to database '${HOST}:${PORT}' as '${USER}' on table '${DATABASE_NAME}'`);
  fs.readdirSync('schemas').forEach(async function (s) {
    if (s.endsWith('.sql')) {
      const schema = fs.readFileSync(`schemas/${s}`).toString();
      await querySync(schema);
    }
  });
}
