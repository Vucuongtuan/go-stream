
package handler


type AuthHandler struct {
	asv domain.AuthService
}

func NewAuthHandler(asv domain.AuthService) *AuthHandler {
	return &AuthHandler{asv: asv}
}


func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Name     string `json:"name"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, err := h.asv.Register(req.Name, req.Email, req.Password)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, err.Error())
		return
	}
	response.Success(w, http.StatusCreated, user)
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	user, token, err := h.asv.Login(req.Email, req.Password)
	if err != nil {
		response.Error(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}
	response.Success(w, http.StatusOK, map[string]any{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) LoginWithOAuth(w http.ResponseWriter, r *http.Request) {
	provider := r.PathValue("provider")
	if provider == "" {
		response.Error(w, http.StatusBadRequest, "Invalid provider")
		return
	}
	
	if provider == "google" {
		
	}

}