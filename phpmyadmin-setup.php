
<?php
/**
 * phpMyAdmin setup for Discord Bot MySQL database
 * This creates a simple web interface to manage the MySQL database
 */

// Database configuration - using same config as the bot
$db_host = $_ENV['DB_HOST'] ?? 'localhost';
$db_port = $_ENV['DB_PORT'] ?? '3306';
$db_user = $_ENV['DB_USER'] ?? 'root';
$db_password = $_ENV['DB_PASSWORD'] ?? '';
$db_name = $_ENV['DB_NAME'] ?? 'discord_bot';

// Parse connection string if needed
if (strpos($db_host, '@') !== false) {
    $cleanUrl = str_replace(['jdbc:mysql://', 'mysql://'], '', $db_host);
    list($credentials, $hostAndDb) = explode('@', $cleanUrl);
    list($user, $password) = explode(':', $credentials);
    list($hostPort, $database) = explode('/', $hostAndDb);
    list($host, $port) = explode(':', $hostPort);
    
    $db_host = $host ?: 'localhost';
    $db_port = $port ?: '3306';
    $db_user = urldecode($user) ?: 'root';
    $db_password = urldecode($password) ?: '';
    $db_name = $database ?: 'discord_bot';
}

try {
    $pdo = new PDO("mysql:host=$db_host;port=$db_port;dbname=$db_name", $db_user, $db_password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "<h1>Database Connection Successful</h1>";
    echo "<p>Connected to: $db_name on $db_host:$db_port</p>";
    
    // Get table list
    $stmt = $pdo->query("SHOW TABLES");
    $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
    
    echo "<h2>Tables in Database:</h2>";
    echo "<ul>";
    foreach ($tables as $table) {
        echo "<li><a href='?table=$table'>$table</a></li>";
    }
    echo "</ul>";
    
    // Show table data if requested
    if (isset($_GET['table'])) {
        $table = $_GET['table'];
        echo "<h2>Data from table: $table</h2>";
        
        $stmt = $pdo->query("SELECT * FROM `$table` LIMIT 50");
        $data = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (!empty($data)) {
            echo "<table border='1' style='border-collapse: collapse; width: 100%;'>";
            echo "<tr>";
            foreach (array_keys($data[0]) as $column) {
                echo "<th style='padding: 8px; background: #f0f0f0;'>$column</th>";
            }
            echo "</tr>";
            
            foreach ($data as $row) {
                echo "<tr>";
                foreach ($row as $value) {
                    echo "<td style='padding: 8px;'>" . htmlspecialchars($value) . "</td>";
                }
                echo "</tr>";
            }
            echo "</table>";
        } else {
            echo "<p>No data found in table.</p>";
        }
    }
    
} catch (PDOException $e) {
    echo "<h1>Database Connection Failed</h1>";
    echo "<p>Error: " . $e->getMessage() . "</p>";
}
?>

<style>
body {
    font-family: Arial, sans-serif;
    margin: 20px;
    background: #f5f5f5;
}
table {
    background: white;
    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}
th {
    background: #007cba !important;
    color: white !important;
}
a {
    color: #007cba;
    text-decoration: none;
}
a:hover {
    text-decoration: underline;
}
</style>
