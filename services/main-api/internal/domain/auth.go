package domain

import (
	"time"

	"gorm.io/gorm"
)

type IdentityProvider string

const (
	ProviderLocal  IdentityProvider = "local"
	ProviderGoogle IdentityProvider = "google"
	ProviderGitHub IdentityProvider = "github"
	ProviderSAML   IdentityProvider = "saml"
	ProviderOIDC   IdentityProvider = "oidc"
)

// Identity represents a single authentication method linked to a User.
// One User can have multiple Identities (e.g. local + google + github).
type Identity struct {
	ID       uint             `gorm:"primaryKey"                json:"id"`
	UserID   uint             `gorm:"not null;index"            json:"user_id"`
	Provider IdentityProvider `gorm:"not null;size:50"          json:"provider"`

	// Used by local auth
	Email        string `gorm:"size:255;index"  json:"email,omitempty"`
	PasswordHash string `gorm:"size:255"        json:"-"`
	IsVerified   bool   `gorm:"default:false"   json:"is_verified"`

	// Used by OAuth2 (Google, GitHub, etc.)
	ProviderUserID  string `gorm:"size:255" json:"-"`
	AccessToken     string `gorm:"size:2048" json:"-"`
	RefreshToken    string `gorm:"size:2048" json:"-"`
	TokenExpiry     *time.Time `json:"-"`

	// Used by SAML / SSO
	IDPID  string `gorm:"column:idp_id;size:255" json:"-"`
	NameID string `gorm:"column:name_id;size:255" json:"-"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`

	User User `gorm:"foreignKey:UserID" json:"-"`
}

type IdentityRepository interface {
	FindByProviderAndEmail(provider IdentityProvider, email string) (*Identity, error)
	FindByProviderUserID(provider IdentityProvider, providerUserID string) (*Identity, error)
	FindBySAML(idpID, nameID string) (*Identity, error)
	Create(identity *Identity) error
	Update(identity *Identity) error
}

type AuthService interface {
	// Local auth
	Register(name, email, password string) (*User, error)
	Login(email, password string) (*User, string, error) // returns user, token, error

	// OAuth2
	LoginWithOAuth(provider IdentityProvider, providerUserID, email, name, avatar, accessToken, refreshToken string, tokenExpiry *time.Time) (*User, string, error)

	// SSO / SAML
	LoginWithSAML(idpID, nameID, name, email string) (*User, string, error)
}