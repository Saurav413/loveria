<?php

/**
 * @return mysqli
 */
function db_connect(array $config): mysqli
{
    mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

    $bootstrap = new mysqli($config['db_host'], $config['db_user'], $config['db_password']);
    $dbName = $bootstrap->real_escape_string($config['db_name']);
    $bootstrap->query("CREATE DATABASE IF NOT EXISTS `{$dbName}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
    $bootstrap->close();

    $db = new mysqli(
        $config['db_host'],
        $config['db_user'],
        $config['db_password'],
        $config['db_name']
    );
    $db->set_charset('utf8mb4');
    ensure_schema($db);
    return $db;
}

function ensure_column(mysqli $db, string $table, string $column, string $definition): void
{
    $stmt = $db->prepare(
        'SELECT COUNT(*) AS c FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?'
    );
    $stmt->bind_param('ss', $table, $column);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();
    if ((int) ($row['c'] ?? 0) === 0) {
        $db->query("ALTER TABLE `{$table}` ADD COLUMN {$definition}");
    }
}

function ensure_schema(mysqli $db): void
{
    $db->query("CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        gender VARCHAR(20),
        nickname VARCHAR(255),
        partner_nickname VARCHAR(255),
        relationship_date DATE,
        partner_user_id INT NULL,
        latitude DECIMAL(10,7) NULL,
        longitude DECIMAL(10,7) NULL,
        location_updated_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )");

    ensure_column($db, 'users', 'gender', 'gender VARCHAR(20) AFTER password');
    ensure_column($db, 'users', 'partner_user_id', 'partner_user_id INT NULL AFTER relationship_date');
    ensure_column($db, 'users', 'latitude', 'latitude DECIMAL(10,7) NULL AFTER partner_user_id');
    ensure_column($db, 'users', 'longitude', 'longitude DECIMAL(10,7) NULL AFTER latitude');
    ensure_column($db, 'users', 'location_updated_at', 'location_updated_at DATETIME NULL AFTER longitude');

    $db->query("CREATE TABLE IF NOT EXISTS reminders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        reminder_date DATE NOT NULL,
        note TEXT NOT NULL,
        is_notified TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $db->query("CREATE TABLE IF NOT EXISTS couple_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $db->query("CREATE TABLE IF NOT EXISTS user_profile_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $db->query("CREATE TABLE IF NOT EXISTS pairing_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(6) NOT NULL UNIQUE,
        owner_user_id INT NOT NULL,
        connected_user_id INT NULL,
        status ENUM('active','connected') DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        connected_at TIMESTAMP NULL,
        FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (connected_user_id) REFERENCES users(id) ON DELETE SET NULL
    )");

    $db->query("CREATE TABLE IF NOT EXISTS shared_drawings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL UNIQUE,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )");

    $db->query("CREATE TABLE IF NOT EXISTS shared_slideshow_photos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pair_user_a INT NOT NULL,
        pair_user_b INT NOT NULL,
        uploaded_by INT NOT NULL,
        caption VARCHAR(255) NULL,
        image_data LONGTEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pair_user_a) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (pair_user_b) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_pair_users (pair_user_a, pair_user_b, created_at)
    )");
    ensure_column($db, 'shared_slideshow_photos', 'caption', 'caption VARCHAR(255) NULL AFTER uploaded_by');

    $db->query("CREATE TABLE IF NOT EXISTS email_verifications (
        id VARCHAR(64) PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        google_sub VARCHAR(255) NOT NULL,
        code_hash VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL,
        used_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )");

    $db->query("CREATE TABLE IF NOT EXISTS drawing_events (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        pair_user_a INT NOT NULL,
        pair_user_b INT NOT NULL,
        from_user_id INT NOT NULL,
        event_type ENUM('stroke','clear') NOT NULL,
        payload LONGTEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_pair_since (pair_user_a, pair_user_b, id),
        FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE
    )");
}
