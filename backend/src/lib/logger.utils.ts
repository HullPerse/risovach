import { createLogger } from "hp_logger";

import { LOGGER_SETTINGS } from "@/config/logger.config";

const root = createLogger({ settings: LOGGER_SETTINGS });

export const createAppLogger = () => root;
