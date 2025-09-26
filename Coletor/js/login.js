// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DE LOGIN E SESSÃO
// ===================================================================================

const Auth = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        loginScreen: document.getElementById('login-screen'),
        appScreen: document.getElementById('app-screen'),
        loginForm: document.getElementById('login-form'),
        userInput: document.getElementById('user-input'),
        passwordInput: document.getElementById('password-input'),
        loginError: document.getElementById('login-error'),
        logoutBtn: document.getElementById('logout-btn'),
        openRegisterBtn: document.getElementById('open-register-modal-btn'),
    },

    // --- ESTADO ---
    state: {
        currentUser: null,
    },

    /**
     * Inicializa o módulo de autenticação.
     */
    init() {
        this.dom.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.dom.openRegisterBtn.addEventListener('click', () => Register.open());
        this.checkSession();
    },

    /**
     * CORRIGIDO: Verifica a sessão sem bloquear a UI no modo offline.
     */
    async checkSession() {
        const session = localStorage.getItem('user_session');
        if (session) {
            this.state.currentUser = JSON.parse(session);
            // Mostra o aplicativo IMEDIATAMENTE com os dados da sessão local.
            this.showApp();

            // Tenta sincronizar a lista de usuários em segundo plano, sem bloquear a interface.
            if (navigator.onLine) {
                this.syncUsers().catch(err => console.warn("Falha na sincronização de usuários em segundo plano:", err));
            }
        } else {
            this.showLogin();
        }
    },

    /**
     * Lida com a tentativa de login.
     */
    async handleLogin(e) {
        e.preventDefault();
        const user = this.dom.userInput.value.trim();
        const password = this.dom.passwordInput.value;
        this.dom.loginError.textContent = '';
        UI.setStatus(true, 'Autenticando...');

        try {
            let userData = null;
            if (navigator.onLine) {
                // Garante que a lista local de usuários está atualizada antes de tentar o login online.
                await this.syncUsers();
                userData = await this.authenticateOnline(user, password);
            }

            // Se estiver offline ou a autenticação online falhar por algum motivo, tenta offline.
            if (!userData) {
                userData = await this.authenticateOffline(user, password);
            }

            if (userData) {
                this.state.currentUser = { usuario: userData.usuario, fazendas: userData.fazendas };
                localStorage.setItem('user_session', JSON.stringify(this.state.currentUser));
                this.showApp();
            } else {
                this.dom.loginError.textContent = 'Usuário ou senha inválidos.';
            }
        } catch (error) {
            console.error("Erro no login:", error);
            this.dom.loginError.textContent = 'Erro ao tentar fazer login. Tente novamente.';
        } finally {
            UI.setStatus(false);
        }
    },
    
    /**
     * Lida com o logout do usuário.
     */
    handleLogout() {
        if (confirm("Tem certeza que deseja sair?")) {
            localStorage.removeItem('user_session');
            this.state.currentUser = null;
            window.location.reload();
        }
    },

    /**
     * Sincroniza a lista de usuários do Supabase para o IndexedDB.
     */
    async syncUsers() {
        if (!navigator.onLine) return;

        try {
            const { data, error } = await supabaseClient.from('usuarios').select('usuario, senha, fazendas');
            if (error) throw error;

            await saveUsers(data);
            console.log('Lista de usuários sincronizada com sucesso.');
        } catch (error) {
            console.error('Falha ao sincronizar usuários:', error);
        }
    },

    /**
     * Autentica o usuário contra os dados no Supabase.
     */
    async authenticateOnline(user, password) {
        try {
            const { data, error } = await supabaseClient
                .from('usuarios')
                .select('usuario, senha, fazendas')
                .eq('usuario', user)
                .single();

            if (error || !data) return null;

            if (data.senha === password) {
                return data;
            }
            return null;
        } catch (error) {
            console.error("Erro na autenticação online:", error);
            return null;
        }
    },

    /**
     * Autentica o usuário contra os dados cacheados no IndexedDB.
     */
    async authenticateOffline(user, password) {
        try {
            const users = await getUsers();
            const userData = users.find(u => u.usuario === user);

            if (userData && userData.senha === password) {
                return userData;
            }
            return null;
        } catch (error) {
            console.error("Erro na autenticação offline:", error);
            return null;
        }
    },
    
    /**
     * Retorna o usuário atualmente logado.
     */
    getCurrentUser() {
        return this.state.currentUser;
    },

    /**
     * Exibe a tela de login e esconde a aplicação principal.
     */
    showLogin() {
        this.dom.loginScreen.classList.remove('hidden');
        this.dom.appScreen.classList.add('hidden');
    },

    /**
     * Exibe a aplicação principal e esconde a tela de login.
     */
    showApp() {
        this.dom.loginScreen.classList.add('hidden');
        this.dom.appScreen.classList.remove('hidden');
        
        if (typeof initializeApp === 'function' && !window.appInitialized) {
            initializeApp();
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
});