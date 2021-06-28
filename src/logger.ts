// tslint:disable: no-var-requires
// tslint:disable: no-console
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf } = format;

// Set up winston logging.
// tslint:disable-next-line: no-shadowed-variable
const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    format: combine(
        label({ label: 'googleTopTen' }),
        format.colorize(),
        format.simple(),
        format.timestamp(),
        logFormat
    ),
    transports: [
        new transports.Console({timestamp: true}),
        new transports.File({ filename: 'goolgeTopTen.log', timestamp: true })
    ]
});

logger.level = 'info';
logger.setLevel = (level) => {logger.level = level};

logger.exitOnError = false;

module.exports=logger;