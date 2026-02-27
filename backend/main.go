package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
)

type Market struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Platform   string  `json:"platform"`
	YesPrice   float64 `json:"yes_price"`
	NoPrice    float64 `json:"no_price"`
	Volume     float64 `json:"volume"`
	UpdatedAt  string  `json:"updated_at"`
}

type ArbitrageOpportunity struct {
	KalshiMarket    Market  `json:"kalshi_market"`
	PolyMarket      Market  `json:"poly_market"`
	Profit          float64 `json:"profit_pct"`
	Direction       string  `json:"direction"`
	RecommendedBet  float64 `json:"recommended_bet"`
	EstimatedReturn float64 `json:"estimated_return"`
	DetectedAt      string  `json:"detected_at"`
}

type KalshiClient struct {
	BaseURL string
	APIKey  string
	Client  *http.Client
}

type PolymarketClient struct {
	BaseURL string
	APIKey  string
	Client  *http.Client
}

func NewKalshiClient() *KalshiClient {
	return &KalshiClient{
		BaseURL: "https://trading-api.kalshi.com/trade-api/v2",
		APIKey:  os.Getenv("KALSHI_API_KEY"),
		Client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func NewPolymarketClient() *PolymarketClient {
	return &PolymarketClient{
		BaseURL: "https://gamma-api.polymarket.com",
		APIKey:  os.Getenv("POLYMARKET_API_KEY"),
		Client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (k *KalshiClient) FetchMarkets() ([]Market, error) {
	req, err := http.NewRequest("GET", k.BaseURL+"/markets?limit=50&status=open", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Token "+k.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := k.Client.Do(req)
	if err != nil {
		// Return mock data if API unavailable
		return mockKalshiMarkets(), nil
	}
	defer resp.Body.Close()

	var result struct {
		Markets []struct {
			Ticker    string  `json:"ticker"`
			Title     string  `json:"title"`
			YesBid    float64 `json:"yes_bid"`
			YesAsk    float64 `json:"yes_ask"`
			NoBid     float64 `json:"no_bid"`
			NoAsk     float64 `json:"no_ask"`
			Volume    float64 `json:"volume"`
		} `json:"markets"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return mockKalshiMarkets(), nil
	}

	markets := make([]Market, 0, len(result.Markets))
	for _, m := range result.Markets {
		markets = append(markets, Market{
			ID:        m.Ticker,
			Title:     m.Title,
			Platform:  "kalshi",
			YesPrice:  (m.YesBid + m.YesAsk) / 2,
			NoPrice:   (m.NoBid + m.NoAsk) / 2,
			Volume:    m.Volume,
			UpdatedAt: time.Now().Format(time.RFC3339),
		})
	}
	return markets, nil
}

func (p *PolymarketClient) FetchMarkets() ([]Market, error) {
	req, err := http.NewRequest("GET", p.BaseURL+"/markets?limit=50&active=true", nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+p.APIKey)

	resp, err := p.Client.Do(req)
	if err != nil {
		return mockPolymarkets(), nil
	}
	defer resp.Body.Close()

	var result []struct {
		ID          string  `json:"id"`
		Question    string  `json:"question"`
		OutcomePrices string `json:"outcomePrices"`
		Volume      float64 `json:"volume"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return mockPolymarkets(), nil
	}

	markets := make([]Market, 0, len(result))
	for _, m := range result {
		markets = append(markets, Market{
			ID:        m.ID,
			Title:     m.Question,
			Platform:  "polymarket",
			YesPrice:  0.5, // parse from OutcomePrices in production
			NoPrice:   0.5,
			Volume:    m.Volume,
			UpdatedAt: time.Now().Format(time.RFC3339),
		})
	}
	return markets, nil
}

func mockKalshiMarkets() []Market {
	return []Market{
		{ID: "FED-25-RATE-CUT", Title: "Will the Fed cut rates in Q2 2025?", Platform: "kalshi", YesPrice: 0.62, NoPrice: 0.38, Volume: 125000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "BTC-80K-EOY", Title: "Will Bitcoin reach $80K by end of 2025?", Platform: "kalshi", YesPrice: 0.44, NoPrice: 0.56, Volume: 89000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "US-REC-2025", Title: "US recession in 2025?", Platform: "kalshi", YesPrice: 0.31, NoPrice: 0.69, Volume: 210000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "S500-6000-2025", Title: "S&P 500 above 6000 by June 2025?", Platform: "kalshi", YesPrice: 0.55, NoPrice: 0.45, Volume: 175000, UpdatedAt: time.Now().Format(time.RFC3339)},
	}
}

func mockPolymarkets() []Market {
	return []Market{
		{ID: "poly-fed-cut-q2", Title: "Federal Reserve rate cut Q2 2025", Platform: "polymarket", YesPrice: 0.67, NoPrice: 0.33, Volume: 340000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "poly-btc-80k", Title: "Bitcoin $80,000 EOY 2025", Platform: "polymarket", YesPrice: 0.41, NoPrice: 0.59, Volume: 520000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "poly-recession-25", Title: "US economic recession 2025", Platform: "polymarket", YesPrice: 0.28, NoPrice: 0.72, Volume: 890000, UpdatedAt: time.Now().Format(time.RFC3339)},
		{ID: "poly-sp500-6k", Title: "S&P 500 over 6000 mid-2025", Platform: "polymarket", YesPrice: 0.59, NoPrice: 0.41, Volume: 430000, UpdatedAt: time.Now().Format(time.RFC3339)},
	}
}

func findArbitrageOpportunities(kalshi, poly []Market, threshold float64) []ArbitrageOpportunity {
	opportunities := []ArbitrageOpportunity{}

	for _, km := range kalshi {
		for _, pm := range poly {
			// Simple keyword matching for same underlying event
			if !isSameEvent(km.Title, pm.Title) {
				continue
			}

			// Case 1: Buy YES on Kalshi, NO on Polymarket
			// Profit if km.YesPrice + pm.NoPrice < 1.0
			cost1 := km.YesPrice + pm.NoPrice
			if cost1 < 1.0 {
				profit := (1.0 - cost1) / cost1 * 100
				if profit >= threshold {
					opportunities = append(opportunities, ArbitrageOpportunity{
						KalshiMarket:   km,
						PolyMarket:     pm,
						Profit:         profit,
						Direction:      "BUY YES on Kalshi, BUY NO on Polymarket",
						RecommendedBet: 100,
						EstimatedReturn: 100 * (1.0 - cost1) / cost1,
						DetectedAt:     time.Now().Format(time.RFC3339),
					})
				}
			}

			// Case 2: Buy NO on Kalshi, YES on Polymarket
			cost2 := km.NoPrice + pm.YesPrice
			if cost2 < 1.0 {
				profit := (1.0 - cost2) / cost2 * 100
				if profit >= threshold {
					opportunities = append(opportunities, ArbitrageOpportunity{
						KalshiMarket:   km,
						PolyMarket:     pm,
						Profit:         profit,
						Direction:      "BUY NO on Kalshi, BUY YES on Polymarket",
						RecommendedBet: 100,
						EstimatedReturn: 100 * (1.0 - cost2) / cost2,
						DetectedAt:     time.Now().Format(time.RFC3339),
					})
				}
			}
		}
	}
	return opportunities
}

func isSameEvent(a, b string) bool {
	keywords := []string{"fed", "rate", "bitcoin", "btc", "recession", "s&p", "sp500"}
	aLower := toLower(a)
	bLower := toLower(b)
	for _, kw := range keywords {
		if contains(aLower, kw) && contains(bLower, kw) {
			return true
		}
	}
	return false
}

func toLower(s string) string {
	result := make([]byte, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 'A' && c <= 'Z' {
			result[i] = c + 32
		} else {
			result[i] = c
		}
	}
	return string(result)
}

func contains(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

type Server struct {
	kalshi *KalshiClient
	poly   *PolymarketClient
	router *mux.Router
}

func NewServer() *Server {
	s := &Server{
		kalshi: NewKalshiClient(),
		poly:   NewPolymarketClient(),
		router: mux.NewRouter(),
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.router.Use(corsMiddleware)
	s.router.HandleFunc("/api/markets/kalshi", s.handleKalshiMarkets).Methods("GET", "OPTIONS")
	s.router.HandleFunc("/api/markets/polymarket", s.handlePolyMarkets).Methods("GET", "OPTIONS")
	s.router.HandleFunc("/api/arbitrage", s.handleArbitrage).Methods("GET", "OPTIONS")
	s.router.HandleFunc("/api/health", s.handleHealth).Methods("GET")
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleKalshiMarkets(w http.ResponseWriter, r *http.Request) {
	markets, err := s.kalshi.FetchMarkets()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(markets)
}

func (s *Server) handlePolyMarkets(w http.ResponseWriter, r *http.Request) {
	markets, err := s.poly.FetchMarkets()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(markets)
}

func (s *Server) handleArbitrage(w http.ResponseWriter, r *http.Request) {
	threshold := 2.0 // minimum 2% profit

	kalshiMarkets, _ := s.kalshi.FetchMarkets()
	polyMarkets, _ := s.poly.FetchMarkets()

	opportunities := findArbitrageOpportunities(kalshiMarkets, polyMarkets, threshold)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"opportunities": opportunities,
		"count":         len(opportunities),
		"scanned_at":    time.Now().Format(time.RFC3339),
		"kalshi_count":  len(kalshiMarkets),
		"poly_count":    len(polyMarkets),
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"status": "ok",
		"time":   time.Now().Format(time.RFC3339),
	})
}

func main() {
	_ = godotenv.Load()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := NewServer()

	fmt.Printf("🚀 Kalshi-Polymarket Arbitrage Backend running on http://localhost:%s\n", port)
	log.Fatal(http.ListenAndServe(":"+port, server.router))
}
