import env from "./env.js";


const normalizePort = (val: string) => {
  const port = parseInt(val, 10);
  if (isNaN(port)) {
    return val;
  }
  if (port >= 0) {
    return port;
  }
  return false;
};

const PORT = normalizePort(env.port ? env.port.toString() : "3000");

export default PORT;