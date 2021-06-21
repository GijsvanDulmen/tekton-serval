const { createLogger, format, transports } = require('winston');
 
const logger = createLogger({
  level: 'info',
  format: format.combine(
    format.splat(),
    format.simple()
  ),
  defaultMeta: { service: 'serval' },
  transports: [
  ],
});

logger.add(new transports.Console({ format: format.json() }));

module.exports = logger;