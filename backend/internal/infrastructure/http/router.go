// Package http implementa o roteamento HTTP e configuração do servidor web.
// Fornece setup de rotas, middleware e handlers para a API REST.
package http

import (
	"net/http"
	"time"

	appResponse "organizational-climate-survey/backend/internal/application/dto/response"
	"organizational-climate-survey/backend/internal/application/handler"
	"organizational-climate-survey/backend/internal/application/middleware"
	"organizational-climate-survey/backend/internal/domain/repository"
	"organizational-climate-survey/backend/internal/domain/usecase"
	"organizational-climate-survey/backend/internal/infrastructure/auth"
	"organizational-climate-survey/backend/pkg/logger"
	"organizational-climate-survey/backend/pkg/validator"

	"github.com/gorilla/mux"
	httpSwagger "github.com/swaggo/http-swagger/v2"
)

// RouterConfig contém todas as dependências necessárias para configurar as rotas
type RouterConfig struct {
	EmpresaUseCase              *usecase.EmpresaUseCase              // Use case de empresa
	UsuarioAdministradorUseCase *usecase.UsuarioAdministradorUseCase // Use case de usuário admin
	SetorUseCase                *usecase.SetorUseCase                // Use case de setor
	PesquisaUseCase             *usecase.PesquisaUseCase             // Use case de pesquisa
	PerguntaUseCase             *usecase.PerguntaUseCase             // Use case de pergunta
	RespostaUseCase             *usecase.RespostaUseCase             // Use case de resposta
	SubmissaoUseCase            *usecase.SubmissaoPesquisaUseCase    // Use case de submissão (NOVO)
	DashboardUseCase            *usecase.DashboardUseCase            // Use case de dashboard
	LogAuditoriaUseCase         *usecase.LogAuditoriaUseCase         // Use case de log
	PesquisaRepo                repository.PesquisaRepository        // Repositório de pesquisa (NOVO - para middleware)
	JWTSecret                   string                               // Chave secreta para JWT
	BootstrapUseCase            *usecase.BootstrapUseCase            // Use case de bootstrap
}

// SetupRouter configura todas as rotas da API com seus respectivos handlers
func SetupRouter(config *RouterConfig) *mux.Router {
	router := mux.NewRouter()

	log := logger.New(nil)
	val := validator.New()

	authHandler := auth.NewAuthHandler(
		config.UsuarioAdministradorUseCase,
		config.LogAuditoriaUseCase,
		config.JWTSecret,
	)

	var empresaHandler *handler.EmpresaHandler
	if config.EmpresaUseCase != nil {
		empresaHandler = handler.NewEmpresaHandler(config.EmpresaUseCase, log, val)
	}

	var usuarioHandler *handler.UsuarioAdministradorHandler
	if config.UsuarioAdministradorUseCase != nil {
		usuarioHandler = handler.NewUsuarioAdministradorHandler(config.UsuarioAdministradorUseCase, log, val)
	}

	var setorHandler *handler.SetorHandler
	if config.SetorUseCase != nil {
		setorHandler = handler.NewSetorHandler(config.SetorUseCase, log)
	}

	var pesquisaHandler *handler.PesquisaHandler
	if config.PesquisaUseCase != nil {
		pesquisaHandler = handler.NewPesquisaHandler(config.PesquisaUseCase, log)
	}

	var perguntaHandler *handler.PerguntaHandler
	if config.PerguntaUseCase != nil {
		perguntaHandler = handler.NewPerguntaHandler(config.PerguntaUseCase, log)
	}

	var respostaHandler *handler.RespostaHandler
	if config.RespostaUseCase != nil {
		respostaHandler = handler.NewRespostaHandler(config.RespostaUseCase, log)
	}

	var submissaoHandler *handler.SubmissaoHandler
	if config.SubmissaoUseCase != nil {
		submissaoHandler = handler.NewSubmissaoHandler(config.SubmissaoUseCase, log)
	}

	var bootstrapHandler *handler.BootstrapHandler
	if config.BootstrapUseCase != nil {
		bootstrapHandler = handler.NewBootstrapHandler(config.BootstrapUseCase, log, val)
	}

	var dashboardHandler *handler.DashboardHandler
	if config.DashboardUseCase != nil {
		dashboardHandler = handler.NewDashboardHandler(config.DashboardUseCase, log)
	}

	var logHandler *handler.LogAuditoriaHandler
	if config.LogAuditoriaUseCase != nil {
		logHandler = handler.NewLogAuditoriaHandler(config.LogAuditoriaUseCase, log)
	}

	api := router.PathPrefix("/api/v1").Subrouter()

	// === ROTAS PÚBLICAS (sem autenticação) ===
	publicRoutes := api.PathPrefix("").Subrouter()
	publicRoutes.Use(middleware.PublicMiddlewares())

	// Auth (login)
	authHandler.RegisterPublicRoutes(publicRoutes)

	// NOVO: Bootstrap (criar primeiro admin)
	if bootstrapHandler != nil {
		bootstrapHandler.RegisterRoutes(publicRoutes)
	}

	// NOVO: Gerar token de acesso à pesquisa
	if submissaoHandler != nil {
		submissaoHandler.RegisterPublicRoutes(publicRoutes)
	}

	// NOVO: Permitir obter pesquisa por link e listar perguntas publicamente para responder
	if pesquisaHandler != nil {
		publicRoutes.HandleFunc("/pesquisas/link/{link}", pesquisaHandler.GetPesquisaByLink).Methods("GET")
	}
	if perguntaHandler != nil {
		publicRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/perguntas", perguntaHandler.ListPerguntasByPesquisa).Methods("GET")
	}

	// === ROTAS DE SUBMISSÃO DE RESPOSTAS (anônimas com token) ===
	if respostaHandler != nil && config.PesquisaRepo != nil {
		surveyRoutes := api.PathPrefix("").Subrouter()
		surveyRoutes.Use(middleware.SurveySubmissionMiddlewares(config.PesquisaRepo)) // Passa repo
		surveyRoutes.HandleFunc("/respostas/submit", respostaHandler.SubmitRespostas).Methods("POST")
	}

	// === ROTAS AUTENTICADAS (requerem JWT) ===
	authRoutes := api.PathPrefix("").Subrouter()
	authRoutes.Use(middleware.AuthenticatedMiddlewares([]byte(config.JWTSecret)))

	if empresaHandler != nil {
		empresaHandler.RegisterRoutes(authRoutes)
	}
	if usuarioHandler != nil {
		usuarioHandler.RegisterRoutes(authRoutes)
	}
	if setorHandler != nil {
		setorHandler.RegisterRoutes(authRoutes)
	}
	if pesquisaHandler != nil {
		pesquisaHandler.RegisterRoutes(authRoutes)
	}
	if perguntaHandler != nil {
		perguntaHandler.RegisterRoutes(authRoutes)
	}
	if dashboardHandler != nil {
		dashboardHandler.RegisterRoutes(authRoutes)
	}
	authHandler.RegisterProtectedRoutes(authRoutes)
	if submissaoHandler != nil {
		submissaoHandler.RegisterProtectedRoutes(authRoutes)
	}

	// === ROTAS ADMINISTRATIVAS (requerem JWT + permissões admin) ===
	adminRoutes := api.PathPrefix("").Subrouter()
	adminRoutes.Use(middleware.AdminMiddlewares([]byte(config.JWTSecret)))

	if logHandler != nil {
		logHandler.RegisterRoutes(adminRoutes)
	}

	// Rotas administrativas de resposta (estatísticas, análises)
	if respostaHandler != nil {
		respostaAdminRoutes := api.PathPrefix("").Subrouter()
		respostaAdminRoutes.Use(middleware.AuthenticatedMiddlewares([]byte(config.JWTSecret)))

		respostaAdminRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/respostas/stats", respostaHandler.GetRespostaStats).Methods("GET")
		respostaAdminRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/respostas/aggregated", respostaHandler.GetRespostasByPesquisa).Methods("GET")
		respostaAdminRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/respostas/by-date", respostaHandler.GetRespostasByDateRange).Methods("GET")
		respostaAdminRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/respostas/count", respostaHandler.CountRespostasByPesquisa).Methods("GET")
		respostaAdminRoutes.HandleFunc("/pesquisas/{pesquisa_id:[0-9]+}/respostas", respostaHandler.DeleteRespostasByPesquisa).Methods("DELETE")
		respostaAdminRoutes.HandleFunc("/submissoes/{submissao_id:[0-9]+}/dados-pessoais", respostaHandler.DeleteDadosPessoaisBySubmissao).Methods("DELETE")
		respostaAdminRoutes.HandleFunc("/perguntas/{pergunta_id:[0-9]+}/respostas/aggregated", respostaHandler.GetRespostasByPergunta).Methods("GET")
		respostaAdminRoutes.HandleFunc("/perguntas/{pergunta_id:[0-9]+}/respostas/count", respostaHandler.CountRespostasByPergunta).Methods("GET")
		respostaAdminRoutes.HandleFunc("/perguntas/{pergunta_id:[0-9]+}/respostas/stats", respostaHandler.GetStatsByPergunta).Methods("GET")
	}

	// Health check e documentação
	router.HandleFunc("/health", HealthCheckHandler).Methods("GET")
	router.PathPrefix("/swagger/").Handler(httpSwagger.WrapHandler)
	router.PathPrefix("/docs/").Handler(http.StripPrefix("/docs/", http.FileServer(http.Dir("./docs/"))))

	return router
}

// HealthCheckHandler responde às requisições de verificação de saúde da API
// @Summary Health check da API
// @Description Retorna status de disponibilidade e metadados básicos da API.
// @Tags system
// @Produce json
// @Success 200 {object} appResponse.APIResponse
// @Router /health [get]
func HealthCheckHandler(w http.ResponseWriter, r *http.Request) {
	timestamp := time.Now().UTC().Format(time.RFC3339)
	appResponse.WriteSuccess(w, http.StatusOK, "API está funcionando", map[string]interface{}{
		"status":    "ok",
		"version":   "1.0.0",
		"timestamp": timestamp,
	})
}

// SetupCORSRouter configura o router com middleware CORS habilitado
func SetupCORSRouter(config *RouterConfig) *mux.Router {
	router := SetupRouter(config)
	router.Use(middleware.CORSMiddleware)
	return router
}

// SetupMinimalRouter configura um router mínimo com apenas rotas essenciais
// Útil para ambientes de teste ou desenvolvimento
func SetupMinimalRouter(config *RouterConfig) *mux.Router {
	router := mux.NewRouter()

	router.Use(middleware.RecoveryMiddleware)
	router.Use(middleware.CORSMiddleware)
	router.Use(middleware.LoggingMiddleware)

	router.HandleFunc("/health", HealthCheckHandler).Methods("GET")

	if config.UsuarioAdministradorUseCase != nil && config.LogAuditoriaUseCase != nil {
		authHandler := auth.NewAuthHandler(
			config.UsuarioAdministradorUseCase,
			config.LogAuditoriaUseCase,
			config.JWTSecret,
		)

		api := router.PathPrefix("/api/v1").Subrouter()
		authHandler.RegisterPublicRoutes(api)
	}

	return router
}
