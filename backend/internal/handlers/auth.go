package handlers

import (
	"database/sql"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"

	"github.com/yourorg/erp-crm-backend/internal/middleware"
	"github.com/yourorg/erp-crm-backend/internal/models"
)

type AuthHandler struct{ db *sql.DB }

func NewAuthHandler(db *sql.DB) *AuthHandler { return &AuthHandler{db: db} }

// func (h *AuthHandler) Login(c *gin.Context) {
// 	var req models.LoginRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
// 		return
// 	}

// 	var user models.User
// 	err := h.db.QueryRow(`
// 		SELECT u.id, u.name, u.email, u.password_hash, u.role_id, r.name
// 		FROM users u JOIN roles r ON u.role_id = r.id
// 		WHERE u.email = $1 AND u.is_active = true`,
// 		req.Email,
// 	).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.RoleID, &user.RoleName)
// 	if err != nil {
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
// 		return
// 	}

// 	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
// 		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
// 		return
// 	}

// 	access, err := generateToken(user.ID, user.RoleName, os.Getenv("JWT_SECRET"), 24*time.Hour)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
// 		return
// 	}

// 	refresh, err := generateToken(user.ID, user.RoleName, os.Getenv("JWT_REFRESH_SECRET"), 7*24*time.Hour)
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate refresh token"})
// 		return
// 	}

// 	c.JSON(http.StatusOK, models.AuthResponse{
// 		AccessToken:  access,
// 		RefreshToken: refresh,
// 		User:         user,
// 	})
// }


func (h *AuthHandler) Login(c *gin.Context) {
	var req models.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("LOGIN: bind error: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request body"})
		return
	}

	log.Printf("LOGIN: attempting login for email=%q", req.Email)

	var user models.User
	err := h.db.QueryRow(`
		SELECT u.id, u.name, u.email, u.password_hash, u.role_id, r.name
		FROM users u JOIN roles r ON u.role_id = r.id
		WHERE u.email = $1 AND u.is_active = true`,
		req.Email,
	).Scan(&user.ID, &user.Name, &user.Email, &user.PasswordHash, &user.RoleID, &user.RoleName)
	if err != nil {
		log.Printf("LOGIN: db query error: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	log.Printf("LOGIN: found user id=%s email=%s hash_prefix=%s", user.ID, user.Email, user.PasswordHash[:10])

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		log.Printf("LOGIN: bcrypt mismatch: %v", err)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	access, err := generateToken(user.ID, user.RoleName, os.Getenv("JWT_SECRET"), 24*time.Hour)
	if err != nil {
		log.Printf("LOGIN: token error: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}

	refresh, err := generateToken(user.ID, user.RoleName, os.Getenv("JWT_REFRESH_SECRET"), 7*24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate refresh token"})
		return
	}

	log.Printf("LOGIN: success for %s", user.Email)
	c.JSON(http.StatusOK, models.AuthResponse{
		AccessToken:  access,
		RefreshToken: refresh,
		User:         user,
	})
}

func (h *AuthHandler) Refresh(c *gin.Context) {
	var req struct{ RefreshToken string `json:"refresh_token"` }
	if err := c.ShouldBindJSON(&req); err != nil || req.RefreshToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "refresh_token required"})
		return
	}

	claims := &middleware.Claims{}
	token, err := jwt.ParseWithClaims(req.RefreshToken, claims, func(t *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_REFRESH_SECRET")), nil
	})
	if err != nil || !token.Valid {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	access, err := generateToken(claims.UserID, claims.Role, os.Getenv("JWT_SECRET"), 24*time.Hour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not generate token"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"access_token": access})
}

func generateToken(userID, role, secret string, ttl time.Duration) (string, error) {
	claims := middleware.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
}
