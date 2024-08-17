-- Drop Tables
DROP TABLE IF EXISTS discord_routine;
DROP TABLE IF EXISTS match_tmp;
DROP TABLE IF EXISTS pending_prediction;
DROP TABLE IF EXISTS user_prediction;


-- Create routine
CREATE TABLE IF NOT EXISTS routine (
    routine_id         INT         NOT NULL AUTO_INCREMENT COMMENT "id of routine",
    routine_guild_id   VARCHAR(30) NOT NULL                COMMENT "guild id where the routine is running",
    routine_channel_id VARCHAR(30) NOT NULL                COMMENT "channel of the guild where the routine is running",
    league             VARCHAR(50) NOT NULL                COMMENT "league to follow",
    PRIMARY KEY (routine_id)
) ENGINE=INNODB COMMENT="discord routines";

-- Create match_tmp
CREATE TABLE IF NOT EXISTS match_tmp (
    match_id         VARCHAR(100) NOT NULL COMMENT "API match id",
    team1            VARCHAR(50)  NOT NULL COMMENT "playing team 1",
    team2            VARCHAR(50)  NOT NULL COMMENT "playing team 2",
    team1short       VARCHAR(5)   NOT NULL COMMENT "playing team 1 short name",
    team2short       VARCHAR(5)   NOT NULL COMMENT "playing team 2 short name",
    bestOf           DECIMAL(1,0) NOT NULL COMMENT "number of games to end the match",
    league           VARCHAR(50)  NOT NULL COMMENT "league of the match",
    match_datetime   VARCHAR(50)  NOT NULL COMMENT "when the match will be played",
    PRIMARY KEY(match_id)
) ENGINE=INNODB COMMENT="upcoming matches";

-- Create pending_prediction
CREATE TABLE IF NOT EXISTS pending_prediction (
    match_id       VARCHAR(100) NOT NULL COMMENT "API match id",
    routine_id     INT          NOT NULL COMMENT "discord routine id",
    message_id     VARCHAR(30)  NOT NULL COMMENT "message sent in discord",
    limit_datetime DATETIME     NOT NULL COMMENT "limit date / time for predictions",
    FOREIGN KEY (match_id)   REFERENCES match_tmp(match_id) ON DELETE CASCADE,
    FOREIGN KEY (routine_id) REFERENCES routine(routine_id) ON DELETE CASCADE
) ENGINE=INNODB COMMENT="current predictions sent into discord servers";

-- Create user_prediction
CREATE TABLE IF NOT EXISTS user_prediction (
    match_id        VARCHAR(100) NOT NULL COMMENT "predicted match",
    discord_user_id VARCHAR(30)  NOT NULL COMMENT "user who predicted",
    team1score      DECIMAL(1,0) NOT NULL COMMENT "predicted team 1 score",
    team2score      DECIMAL(1,0) NOT NULL COMMENT "predicted team 2 score"
) ENGINE=INNODB COMMENT="discord users predictions";