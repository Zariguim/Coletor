// ===================================================================================
//  MÓDULO DE GERENCIAMENTO DE CADASTRO DE USUÁRIO
// ===================================================================================

const Register = {
    // --- ELEMENTOS DO DOM ---
    dom: {
        modal: document.getElementById('register-modal'),
        form: document.getElementById('register-form'),
        userInput: document.getElementById('register-user-input'),
        passwordInput: document.getElementById('register-password-input'),
        fazendasList: document.getElementById('register-fazendas-list'),
        closeBtn: document.getElementById('register-modal-close-btn'),
        cancelBtn: document.getElementById('register-cancel-btn'),
        errorMsg: document.getElementById('register-error-msg'),
    },

    /**
     * Inicializa o módulo de cadastro.
     */
    init() {
        this.dom.form.addEventListener('submit', (e) => this.handleRegister(e));
        this.dom.closeBtn.addEventListener('click', () => this.close());
        this.dom.cancelBtn.addEventListener('click', () => this.close());
    },

    /**
     * Abre o modal de cadastro e carrega a lista de fazendas.
     */
    async open() {
        this.resetForm();
        UI.setStatus(true, 'Carregando fazendas...');
        try {
            // Busca todas as fazendas disponíveis para listagem
            let fazendas = [];
            if (navigator.onLine) {
                const { data, error } = await supabaseClient.from('talhoes').select('Fazenda');
                if (error) throw error;
                fazendas = [...new Set(data.map(item => item.Fazenda || 'Sem Fazenda'))];
                // Salva em cache para uso offline
                sessionStorage.setItem('all_fazendas', JSON.stringify(fazendas));
            } else {
                const cachedFazendas = sessionStorage.getItem('all_fazendas');
                if (cachedFazendas) {
                    fazendas = JSON.parse(cachedFazendas);
                } else {
                     this.dom.errorMsg.textContent = "Conecte-se à internet para carregar a lista de fazendas.";
                }
            }
            
            this.populateFazendasList(fazendas);
            this.dom.modal.classList.remove('hidden');
        } catch (error) {
            console.error("Erro ao carregar fazendas para cadastro:", error);
            alert("Não foi possível carregar a lista de fazendas. Verifique sua conexão.");
        } finally {
            UI.setStatus(false);
        }
    },

    /**
     * Fecha o modal de cadastro.
     */
    close() {
        this.dom.modal.classList.add('hidden');
    },

    /**
     * Limpa o formulário de cadastro.
     */
    resetForm() {
        this.dom.form.reset();
        this.dom.fazendasList.innerHTML = '';
        this.dom.errorMsg.textContent = '';
    },

    /**
     * Popula a lista de checkboxes com as fazendas disponíveis.
     * @param {string[]} fazendas - Array com os nomes das fazendas.
     */
    populateFazendasList(fazendas) {
        if (fazendas.length === 0) {
            this.dom.fazendasList.innerHTML = `<p class="text-sm text-gray-500">Nenhuma fazenda encontrada.</p>`;
            return;
        }

        const fazendasHtml = fazendas.sort().map(fazenda => `
            <div class="flex items-center">
                <input id="fazenda-${fazenda}" name="fazendas" type="checkbox" value="${fazenda}" class="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500">
                <label for="fazenda-${fazenda}" class="ml-3 block text-sm font-medium text-gray-700">${fazenda}</label>
            </div>
        `).join('');
        this.dom.fazendasList.innerHTML = fazendasHtml;
    },

    /**
     * Lida com o envio do formulário de cadastro.
     * @param {Event} e - O evento de submit do formulário.
     */
    async handleRegister(e) {
        e.preventDefault();
        this.dom.errorMsg.textContent = '';

        const usuario = this.dom.userInput.value.trim();
        const senha = this.dom.passwordInput.value;
        const selectedFazendas = Array.from(this.dom.form.querySelectorAll('input[name="fazendas"]:checked'))
                                      .map(cb => cb.value);

        if (!usuario || !senha) {
            this.dom.errorMsg.textContent = 'Usuário e senha são obrigatórios.';
            return;
        }

        if (selectedFazendas.length === 0) {
            this.dom.errorMsg.textContent = 'Selecione pelo menos uma fazenda.';
            return;
        }
        
        if (!navigator.onLine) {
            this.dom.errorMsg.textContent = 'É necessário estar online para cadastrar um novo usuário.';
            return;
        }

        UI.setStatus(true, 'Cadastrando usuário...');

        try {
            const { error } = await supabaseClient.from('usuarios').insert({
                usuario,
                senha, // Lembrete: a senha está em texto puro.
                fazendas: selectedFazendas,
            });

            if (error) {
                if (error.code === '23505') { // Código para violação de constraint unique
                    throw new Error('Este nome de usuário já está em uso.');
                }
                throw error;
            }

            alert('Usuário cadastrado com sucesso!');
            await Auth.syncUsers(); // Sincroniza a lista de usuários para incluir o novo
            this.close();

        } catch (error) {
            console.error("Erro ao cadastrar usuário:", error);
            this.dom.errorMsg.textContent = error.message || 'Ocorreu um erro ao cadastrar.';
        } finally {
            UI.setStatus(false);
        }
    },
};

document.addEventListener('DOMContentLoaded', () => {
    Register.init();
});