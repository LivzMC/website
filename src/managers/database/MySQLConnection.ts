import mysql from 'mysql2';

const HOST: string = process.env.SQL_SERVER || 'localhost';
const USER: string = process.env.SQL_USER || 'user';
const PASSWORD: string = process.env.SQL_PASSWORD || 'default-password';
const PORT: number = process.env.SQL_PORT && !isNaN(parseInt(process.env.SQL_PORT)) ? parseInt(process.env.SQL_PORT) : 3306;

const connection = mysql.createConnection({
  host: HOST,
  user: USER,
  password: PASSWORD,
  port: PORT,
  database: 'livzmc',
  charset: 'utf8mb4',
  stringifyObjects: true
});

/**
 * @param statement The search statement
 * @param values The values that should be used inside the statement
 * @returns a promise of the query
 */
export function querySync(statement: string, values: Array<string> = []): Promise<any> {
  const promise = new Promise((res, rej) => {
    connection.query(
      {
        sql: statement,
        timeout: 1000 * 10,
      },
      values,
      function (err, result) {
        if (err) rej(err);
        else res(result);
      }
    );
  });

  return promise;
}

export function connectToDatabase(): void {
  connection.connect(err => {
    if (err) {
      console.error('!! Could not connect to MySQL !!');
      console.error(err);
    } else {
      console.log(`Connected to database '${HOST}:${PORT}' as '${USER}'`);
    }
  });
}
