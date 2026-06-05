package domain

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey"      json:"id"`
	Name      string         `json:"name"`
	Email     string         `gorm:"size:255;index"  json:"email,omitempty"`
	Slug      string         `gorm:"size:100;uniqueIndex" json:"slug"`
	Avatar    string         `json:"avatar,omitempty"`
	Role      string         `gorm:"size:20;default:'user'" json:"role"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index"           json:"-"`

	Identities []Identity `gorm:"foreignKey:UserID" json:"-"`
}

type UserRepository interface {
	FindAll() ([]User, error)
	FindByID(id uint) (*User, error)
	Create(user *User) error
	Update(user *User) error
	Delete(id uint) error
}

type UserService interface {
	GetAllUsers() ([]User, error)
	GetUserByID(id uint) (*User, error)
}

