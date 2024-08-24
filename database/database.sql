-- Drop Tables
DROP TABLE IF EXISTS user_prediction;
DROP TABLE IF EXISTS pending_prediction;
DROP TABLE IF EXISTS routine;


-- Create routine
CREATE TABLE IF NOT EXISTS routine (
    routine_id         INT         NOT NULL AUTO_INCREMENT COMMENT "id of routine",
    routine_guild_id   VARCHAR(30) NOT NULL                COMMENT "guild id where the routine is running",
    routine_channel_id VARCHAR(30) NOT NULL                COMMENT "channel of the guild where the routine is running",
    league             VARCHAR(20) NOT NULL                COMMENT "league to follow",
    PRIMARY KEY (routine_id)
) ENGINE=INNODB COMMENT="discord routines";

-- Create pending_prediction
CREATE TABLE IF NOT EXISTS pending_prediction (
    match_id       VARCHAR(100) NOT NULL COMMENT "API match id",
    routine_id     INT          NOT NULL COMMENT "discord routine id",
    limit_datetime DATETIME     NOT NULL COMMENT "limit date / time for predictions",
    FOREIGN KEY (routine_id) REFERENCES routine(routine_id) ON DELETE CASCADE
) ENGINE=INNODB COMMENT="current predictions sent into discord servers";

-- Create user_prediction
CREATE TABLE IF NOT EXISTS user_prediction (
    match_id        VARCHAR(100) NOT NULL COMMENT "predicted match",
    discord_user_id VARCHAR(30)  NOT NULL COMMENT "user who predicted",
    team1score      DECIMAL(1,0) NOT NULL COMMENT "predicted team 1 score",
    team2score      DECIMAL(1,0) NOT NULL COMMENT "predicted team 2 score"
) ENGINE=INNODB COMMENT="discord users predictions";