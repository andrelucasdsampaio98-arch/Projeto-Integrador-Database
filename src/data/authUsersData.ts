import { UserAccount, UserRole } from '../types';

export const STORAGE_KEY_USERS = 'ponte_usuarios_cadastrados';
export const STORAGE_KEY_CURRENT_USER = 'ponte_current_user';

export const INITIAL_USERS: UserAccount[] = [
  {
    id: 'user-aluno-1',
    name: 'Ana Beatriz Souza',
    matricula: '20240101',
    role: 'aluno',
    email: 'ana.souza@escola.edu.br',
    turmaOuArea: '3º Ano Médio - Turma B',
    createdAt: '2024-02-10'
  },
  {
    id: 'user-aluno-2',
    name: 'Lucas Gabriel Lima',
    matricula: '20240102',
    role: 'aluno',
    email: 'lucas.lima@escola.edu.br',
    turmaOuArea: '2º Ano Médio - Turma A',
    createdAt: '2024-02-12'
  },
  {
    id: 'user-prof-1',
    name: 'Prof. Carlos Eduardo Mendes',
    matricula: 'PROF-1020',
    role: 'professor',
    email: 'carlos.mendes@escola.edu.br',
    turmaOuArea: 'Língua Portuguesa & Libras Inclusiva',
    createdAt: '2023-08-01'
  },
  {
    id: 'user-prof-2',
    name: 'Profa. Mariana Costa',
    matricula: 'PROF-2030',
    role: 'professor',
    email: 'mariana.costa@escola.edu.br',
    turmaOuArea: 'Tecnologias Assistivas e Ciências',
    createdAt: '2023-09-15'
  }
];

export function getStoredUsers(): UserAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error('Erro ao ler usuários armazenados:', err);
  }
  return INITIAL_USERS;
}

export function saveStoredUsers(users: UserAccount[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  } catch (err) {
    console.error('Erro ao salvar usuários:', err);
  }
}

export function getCurrentUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
    if (raw) {
      return JSON.parse(raw) as UserAccount;
    }
  } catch (err) {
    console.error('Erro ao ler usuário ativo:', err);
  }
  return null;
}

export function setCurrentUser(user: UserAccount | null): void {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      localStorage.setItem('ponte_sistema_estudo_role', user.role);
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  } catch (err) {
    console.error('Erro ao definir usuário ativo:', err);
  }
}

export interface AuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
}

/**
 * Autentica o usuário pelo número de matrícula e senha.
 * Regra do sistema:
 * - A senha do Aluno é o seu número de matrícula.
 * - A senha do Professor é a sua matrícula de professor.
 */
export function authenticateUser(matricula: string, senha: string, role: UserRole): AuthResult {
  const cleanMatricula = matricula.trim();
  const cleanSenha = senha.trim();

  if (!cleanMatricula) {
    return { success: false, error: 'Por favor, informe o número da sua matrícula.' };
  }
  if (!cleanSenha) {
    return { success: false, error: 'Por favor, informe a senha de acesso.' };
  }

  const users = getStoredUsers();
  const found = users.find(
    (u) => u.matricula.toLowerCase() === cleanMatricula.toLowerCase() && u.role === role
  );

  if (!found) {
    return {
      success: false,
      error: `Matrícula "${cleanMatricula}" não cadastrada no perfil ${
        role === 'professor' ? 'do Professor' : 'do Aluno'
      }. Caso seja seu primeiro acesso, clique em "Primeiro Acesso / Fazer Cadastro".`
    };
  }

  // Regra fundamental: A senha é a matrícula do próprio usuário
  if (cleanSenha.toLowerCase() !== found.matricula.toLowerCase()) {
    return {
      success: false,
      error: `Senha incorreta. Lembre-se: no sistema, a sua senha é o próprio número da sua matrícula (${
        role === 'professor' ? 'matrícula de professor' : 'matrícula de aluno'
      }).`
    };
  }

  // Atualiza a sessão
  setCurrentUser(found);
  return { success: true, user: found };
}

/**
 * Cadastra um novo aluno ou professor no primeiro acesso.
 */
export function registerNewUser(data: {
  name: string;
  matricula: string;
  role: UserRole;
  turmaOuArea?: string;
  email?: string;
}): AuthResult {
  const cleanName = data.name.trim();
  const cleanMatricula = data.matricula.trim();

  if (!cleanName) {
    return { success: false, error: 'Por favor, informe o seu nome completo.' };
  }
  if (!cleanMatricula) {
    return { success: false, error: 'Por favor, informe o número da matrícula para cadastro.' };
  }

  const users = getStoredUsers();
  const exists = users.some(
    (u) => u.matricula.toLowerCase() === cleanMatricula.toLowerCase() && u.role === data.role
  );

  if (exists) {
    return {
      success: false,
      error: `Já existe um ${
        data.role === 'professor' ? 'professor' : 'aluno'
      } cadastrado com a matrícula "${cleanMatricula}". Use a aba "Entrar" para acessar.`
    };
  }

  const newUser: UserAccount = {
    id: `user-${data.role}-${Date.now()}`,
    name: cleanName,
    matricula: cleanMatricula,
    role: data.role,
    email: data.email?.trim(),
    turmaOuArea: data.turmaOuArea?.trim(),
    createdAt: new Date().toISOString()
  };

  const updatedUsers = [newUser, ...users];
  saveStoredUsers(updatedUsers);
  setCurrentUser(newUser);

  return { success: true, user: newUser };
}
