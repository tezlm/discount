export interface Logger {
  warn:  (message: string) => void,
  error: (message: string) => void,
  info:  (message: string) => void,
  debug: (message: string) => void,
}

export const defaultLogger: Logger = {
  warn:  (message: string) => console.warn(`%c[warn]%c ${message}`,   "font-weight: bold; color: yellow",    ""),
  error: (message: string) => console.error(`%c[error]%c ${message}`, "font-weight: bold; color: red",       ""),
  info:  (message: string) => console.info(`%c[info]%c ${message}`,   "font-weight: bold; color: turquoise", ""),
  debug: (message: string) => console.debug(`%c[debug]%c ${message}`, "font-weight: bold; color: magenta",   ""),
};
