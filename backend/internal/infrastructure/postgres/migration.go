package postgres

import (
	"database/sql"
	"fmt"
	"io/ioutil"
	"log"
	"path/filepath"
	"sort"
	"strings"
)

// RunMigrations runs all migrations in the migrations folder
func RunMigrations(db *sql.DB) error {
	// 1. Create schema_migrations table if not exists
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			id SERIAL PRIMARY KEY,
			migration_name VARCHAR(255) NOT NULL UNIQUE,
			executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);
	`)
	if err != nil {
		return fmt.Errorf("failed to create migrations table: %v", err)
	}

	// 2. Locate migration files
	var files []string
	searchPaths := []string{"migrations/*.sql", "/app/migrations/*.sql", "../migrations/*.sql"}

	for _, pattern := range searchPaths {
		found, err := filepath.Glob(pattern)
		if err == nil && len(found) > 0 {
			files = found
			break
		}
	}

	if len(files) == 0 {
		log.Println("⚠️ Warning: No migration files found in standard paths")
		return nil
	}

	sort.Strings(files)

	for _, file := range files {
		name := filepath.Base(file)
		if name == "000_setup_migrations.sql" {
			continue
		}

		// Check if already executed
		var exists bool
		err := db.QueryRow("SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE migration_name = $1)", name).Scan(&exists)
		if err != nil {
			return fmt.Errorf("failed to check migration state for %s: %v", name, err)
		}

		if exists {
			log.Printf("✓ Migration %s already applied", name)
			continue
		}

		log.Printf("⏳ Applying migration: %s", name)

		content, err := ioutil.ReadFile(file)
		if err != nil {
			return fmt.Errorf("failed to read migration file %s: %v", name, err)
		}

		// Parse and clean SQL
		cleanSQL := cleanSQLContent(string(content))
		if strings.TrimSpace(cleanSQL) == "" {
			continue
		}

		// Execute migration
		_, err = db.Exec(cleanSQL)
		if err != nil {
			return fmt.Errorf("failed to execute migration %s: %v", name, err)
		}

		// Record migration
		_, err = db.Exec("INSERT INTO schema_migrations (migration_name) VALUES ($1)", name)
		if err != nil {
			return fmt.Errorf("failed to record migration %s: %v", name, err)
		}

		log.Printf("✅ Migration %s applied successfully", name)
	}

	return nil
}

func cleanSQLContent(sqlStr string) string {
	lines := strings.Split(sqlStr, "\n")
	var cleanLines []string

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		// Skip comments
		if strings.HasPrefix(trimmed, "--") {
			continue
		}
		// Skip psql slash commands
		if strings.HasPrefix(trimmed, "\\") {
			continue
		}
		// Skip owner changes
		if strings.Contains(strings.ToUpper(trimmed), "OWNER TO") {
			continue
		}
		cleanLines = append(cleanLines, line)
	}

	return strings.Join(cleanLines, "\n")
}
