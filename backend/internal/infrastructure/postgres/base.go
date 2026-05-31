// Package postgres implementa a camada de acesso a dados usando PostgreSQL
// Fornece estruturas e métodos para conexão e gerenciamento do banco de dados
package postgres

import (
	"database/sql"
	"fmt"
	"organizational-climate-survey/backend/pkg/logger"
	"time"

	_ "github.com/lib/pq" // Driver PostgreSQL
)

// DB encapsula conexão SQL e logger para operações no banco
type DB struct {
	*sql.DB               // Conexão com banco de dados
	logger  logger.Logger // Logger para operações do banco
}

// Config define os parâmetros necessários para conexão com PostgreSQL
type Config struct {
	Host     string // Endereço do servidor
	Port     string // Porta do servidor
	User     string // Usuário do banco
	Password string // Senha do usuário
	DBName   string // Nome do banco de dados
	SSLMode  string // Modo SSL (disable, require, etc)
}

// NewDB cria uma nova conexão com o banco de dados PostgreSQL
// Retorna erro se a conexão falhar ou o banco estiver inacessível
func NewDB(
	host, port, user, password, dbname, sslMode string,
	maxOpenConns, maxIdleConns, connMaxLifetimeMins int,
) (*DB, error) {
	if sslMode == "" {
		sslMode = "disable"
	}

	if maxOpenConns <= 0 {
		maxOpenConns = 25
	}
	if maxIdleConns < 0 {
		maxIdleConns = 5
	}
	if connMaxLifetimeMins <= 0 {
		connMaxLifetimeMins = 5
	}

	psqlInfo := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslMode)

	db, err := sql.Open("postgres", psqlInfo)
	if err != nil {
		return nil, fmt.Errorf("erro ao conectar com o banco: %v", err)
	}

	if err = db.Ping(); err != nil {
		return nil, fmt.Errorf("erro ao fazer ping no banco: %v", err)
	}

	db.SetMaxOpenConns(maxOpenConns)
	db.SetMaxIdleConns(maxIdleConns)
	db.SetConnMaxLifetime(time.Duration(connMaxLifetimeMins) * time.Minute)

	log := logger.New(nil)
	log.Info("Conectado ao PostgreSQL com pool configurado")

	return &DB{DB: db, logger: log}, nil
}

// Close fecha a conexão com o banco de dados
func (db *DB) Close() error {
	return db.DB.Close()
}

// Repositories agrupa todos os repositórios da aplicação
// Facilita o acesso centralizado aos repositórios
type Repositories struct {
	Empresa              *EmpresaRepository
	UsuarioAdministrador *UsuarioAdministradorRepository
	Setor                *SetorRepository
	Pesquisa             *PesquisaRepository
	Pergunta             *PerguntaRepository
	Resposta             *RespostaRepository
	SubmissaoPesquisa    *SubmissaoPesquisaRepository // NOVO
	Dashboard            *DashboardRepository
	LogAuditoria         *LogAuditoriaRepository
	Ciclo                *CicloRepository
	Analytics            *AnalyticsRepository
}

// NewRepositories inicializa todos os repositórios com a conexão fornecida
// Retorna uma estrutura com todos os repositórios prontos para uso
func NewRepositories(db *DB) *Repositories {
	return &Repositories{
		Empresa:              NewEmpresaRepository(db),
		UsuarioAdministrador: NewUsuarioAdministradorRepository(db),
		Setor:                NewSetorRepository(db),
		Pesquisa:             NewPesquisaRepository(db),
		Pergunta:             NewPerguntaRepository(db),
		Resposta:             NewRespostaRepository(db),
		SubmissaoPesquisa:    NewSubmissaoPesquisaRepository(db), // NOVO
		Dashboard:            NewDashboardRepository(db),
		LogAuditoria:         NewLogAuditoriaRepository(db),
		Ciclo:                NewCicloRepository(db),
		Analytics:            NewAnalyticsRepository(db),
	}
}
