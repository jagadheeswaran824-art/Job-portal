<?php
/**
 * Database Configuration & Connection
 *
 * PHP equivalent of Node's mysql2 + dotenv combo.
 * Uses PDO (built-in) for MySQL and reads credentials from .env via phpdotenv.
 * Install with: composer install  (runs from backend/ folder)
 */

// Load .env if phpdotenv is available (after composer install)
if (file_exists(dirname(__DIR__) . '/vendor/autoload.php')) {
    require_once dirname(__DIR__) . '/vendor/autoload.php';

    $dotenv = Dotenv\Dotenv::createImmutable(dirname(__DIR__));
    $dotenv->safeLoad();
}

// ─── Config array (read from .env) ───────────────────────────────────────────
$dbConfig = [
    'driver'    => $_ENV['DB_CONNECTION'] ?? 'mysql',
    'host'      => $_ENV['DB_HOST']       ?? 'localhost',
    'port'      => $_ENV['DB_PORT']       ?? '3306',
    'database'  => $_ENV['DB_DATABASE']   ?? 'job_portal',
    'username'  => $_ENV['DB_USERNAME']   ?? 'root',
    'password'  => $_ENV['DB_PASSWORD']   ?? '',
    'charset'   => 'utf8mb4',
    'ssl'       => (($_ENV['DB_SSL_MODE'] ?? '') === 'REQUIRED'),
];

// ─── Database singleton ───────────────────────────────────────────────────────
class Database {
    private static ?Database $instance = null;
    private PDO $connection;

    private function __construct() {
        global $dbConfig;

        $dsn = sprintf(
            '%s:host=%s;port=%s;dbname=%s;charset=%s',
            $dbConfig['driver'],
            $dbConfig['host'],
            $dbConfig['port'],
            $dbConfig['database'],
            $dbConfig['charset']
        );

        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
            PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci",
        ];

        // Enable SSL for cloud databases (e.g. Layerbase, PlanetScale, Railway)
        if ($dbConfig['ssl']) {
            $options[PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT] = false;
        }

        try {
            $this->connection = new PDO(
                $dsn,
                $dbConfig['username'],
                $dbConfig['password'],
                $options
            );
        } catch (PDOException $e) {
            error_log('DB Connection Error: ' . $e->getMessage());
            http_response_code(500);
            echo json_encode([
                'status'  => 'error',
                'message' => 'Database connection failed.',
            ]);
            exit;
        }
    }

    // ── Get singleton instance ────────────────────────────────────────────────
    public static function getInstance(): Database {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // ── Raw PDO connection (if needed) ────────────────────────────────────────
    public function getConnection(): PDO {
        return $this->connection;
    }

    // ── Run any query with bound params ──────────────────────────────────────
    public function query(string $sql, array $params = []): PDOStatement {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch (PDOException $e) {
            error_log('Query Error: ' . $e->getMessage());
            throw new RuntimeException('Database query failed: ' . $e->getMessage(), 500);
        }
    }

    // ── Fetch all rows ────────────────────────────────────────────────────────
    public function fetchAll(string $sql, array $params = []): array {
        return $this->query($sql, $params)->fetchAll();
    }

    // ── Fetch single row ──────────────────────────────────────────────────────
    public function fetchOne(string $sql, array $params = []): array|false {
        return $this->query($sql, $params)->fetch();
    }

    // ── INSERT — returns new row ID ───────────────────────────────────────────
    public function insert(string $sql, array $params = []): string {
        $this->query($sql, $params);
        return $this->connection->lastInsertId();
    }

    // ── UPDATE — returns affected rows ────────────────────────────────────────
    public function update(string $sql, array $params = []): int {
        return $this->query($sql, $params)->rowCount();
    }

    // ── DELETE — returns affected rows ────────────────────────────────────────
    public function delete(string $sql, array $params = []): int {
        return $this->query($sql, $params)->rowCount();
    }

    // ── Transactions ──────────────────────────────────────────────────────────
    public function beginTransaction(): bool  { return $this->connection->beginTransaction(); }
    public function commit(): bool            { return $this->connection->commit(); }
    public function rollBack(): bool          { return $this->connection->rollBack(); }

    // Prevent cloning / unserializing the singleton
    private function __clone() {}
    public function __wakeup(): void { throw new RuntimeException('Cannot unserialize singleton.'); }
}
