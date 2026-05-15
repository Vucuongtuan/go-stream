package domain

import (
	"time"

	"gorm.io/gorm"
)

type User struct {
	ID        uint           `gorm:"primaryKey"      json:"id"`
	Name      string         `json:"name"`
	Avatar    string         `json:"avatar,omitempty"`
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

