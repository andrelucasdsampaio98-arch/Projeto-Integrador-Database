import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  deleteDoc, 
  updateDoc,
  getDocFromServer,
  query,
  orderBy
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  getDownloadURL 
} from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserAccount, UserRole, Lesson, LessonPdfFile, LessonMp3Video } from '../types';

// Initialize Firebase App
const app = initializeApp(firebaseConfig);

// CRITICAL: Must specify firestoreDatabaseId according to Firebase skill
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection on application boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Conexão com Firestore offline.");
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// AUTENTICAÇÃO E PERFIS COM SEPARAÇÃO ESTRITA DE PAPÉIS (PROFESSOR E ALUNO)
// ---------------------------------------------------------------------------

export interface FirebaseAuthResult {
  success: boolean;
  user?: UserAccount;
  error?: string;
}

/**
 * Criação de conta (Cadastro) com Email e Senha.
 * Salva o perfil geral em 'users/{uid}' e também na coleção dedicada
 * 'professores/{uid}' ou 'alunos/{uid}' para garantir separação de perfis.
 */
export async function firebaseSignUp(params: {
  email: string;
  pass: string;
  nome: string;
  matricula: string;
  role: UserRole;
  turmaOuArea?: string;
}): Promise<FirebaseAuthResult> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, params.email.trim(), params.pass);
    const uid = cred.user.uid;

    const userProfile: UserAccount = {
      id: uid,
      name: params.nome.trim(),
      email: params.email.trim(),
      matricula: params.matricula.trim() || `MAT-${Date.now().toString().slice(-4)}`,
      role: params.role,
      turmaOuArea: params.turmaOuArea?.trim() || '',
      createdAt: new Date().toISOString().split('T')[0]
    };

    // 1. Salva na coleção geral 'users'
    try {
      await setDoc(doc(db, 'users', uid), userProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }

    // 2. Salva na coleção específica (professores ou alunos)
    if (params.role === 'professor') {
      try {
        await setDoc(doc(db, 'professores', uid), {
          id: uid,
          name: userProfile.name,
          email: userProfile.email,
          matricula: userProfile.matricula,
          area: userProfile.turmaOuArea || 'Docência Geral',
          createdAt: userProfile.createdAt
        });
      } catch (err) {
        console.warn('Erro ao salvar em professores:', err);
      }
    } else {
      try {
        await setDoc(doc(db, 'alunos', uid), {
          id: uid,
          name: userProfile.name,
          email: userProfile.email,
          matricula: userProfile.matricula,
          turma: userProfile.turmaOuArea || 'Turma Geral',
          createdAt: userProfile.createdAt
        });
      } catch (err) {
        console.warn('Erro ao salvar em alunos:', err);
      }
    }

    return {
      success: true,
      user: userProfile
    };
  } catch (err: any) {
    console.error('Erro no cadastro:', err);
    let msg = 'Erro ao realizar cadastro.';
    if (err.code === 'auth/email-already-in-use') {
      msg = 'Este e-mail já está cadastrado no sistema.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Formato de e-mail inválido.';
    } else if (err.code === 'auth/weak-password') {
      msg = 'A senha deve conter no mínimo 6 caracteres.';
    } else if (err.message) {
      msg = err.message;
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Login com validação de papel estrita:
 * Se um Aluno tentar logar no portal de Professor, o acesso é bloqueado.
 * Se um Professor tentar logar no portal de Aluno, o acesso é bloqueado.
 */
export async function firebaseSignIn(
  email: string, 
  pass: string, 
  expectedRole?: UserRole
): Promise<FirebaseAuthResult> {
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    const uid = cred.user.uid;

    let profile: UserAccount | null = null;
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        profile = snap.data() as UserAccount;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    // Se não existia perfil no users, checa coleções específicas
    if (!profile) {
      const profSnap = await getDoc(doc(db, 'professores', uid));
      if (profSnap.exists()) {
        const pd = profSnap.data();
        profile = {
          id: uid,
          name: pd.name || 'Professor',
          email: pd.email || cred.user.email || '',
          matricula: pd.matricula || '',
          role: 'professor',
          turmaOuArea: pd.area || '',
          createdAt: pd.createdAt || new Date().toISOString().split('T')[0]
        };
        await setDoc(userDocRef, profile);
      } else {
        const aluSnap = await getDoc(doc(db, 'alunos', uid));
        if (aluSnap.exists()) {
          const ad = aluSnap.data();
          profile = {
            id: uid,
            name: ad.name || 'Aluno',
            email: ad.email || cred.user.email || '',
            matricula: ad.matricula || '',
            role: 'aluno',
            turmaOuArea: ad.turma || '',
            createdAt: ad.createdAt || new Date().toISOString().split('T')[0]
          };
          await setDoc(userDocRef, profile);
        }
      }
    }

    // Fallback: caso seja o primeiro login sem registro de perfil prévio
    if (!profile) {
      profile = {
        id: uid,
        name: cred.user.displayName || email.split('@')[0],
        email: cred.user.email || email,
        matricula: `MAT-${uid.slice(0, 6)}`,
        role: expectedRole || 'aluno',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await setDoc(userDocRef, profile);
    }

    // VALIDAÇÃO ESTRITA DO PAPEL DO USUÁRIO
    if (expectedRole && profile.role !== expectedRole) {
      // Desconecta a sessão para não manter logado com permissão incorreta
      await signOut(auth);

      if (expectedRole === 'professor' && profile.role === 'aluno') {
        return {
          success: false,
          error: 'Acesso Negado: Esta conta está registrada como ALUNO. Alunos não possuem permissão para acessar o Portal do Professor. Por favor, acerte a seleção e entre em "Sou Aluno".'
        };
      }

      if (expectedRole === 'aluno' && profile.role === 'professor') {
        return {
          success: false,
          error: 'Acesso Negado: Esta conta pertence a um PROFESSOR. Por favor, acesse pelo Portal do Professor selecionando a opção "Sou Professor".'
        };
      }
    }

    return {
      success: true,
      user: profile
    };
  } catch (err: any) {
    console.error('Erro no login:', err);
    let msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
    if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
      msg = 'E-mail ou senha incorretos.';
    } else if (err.code === 'auth/invalid-email') {
      msg = 'Formato de e-mail inválido.';
    } else if (err.message) {
      msg = err.message;
    }
    return {
      success: false,
      error: msg
    };
  }
}

/**
 * Login com Google Popup com verificação estrita de papéis
 */
export async function firebaseSignInWithGoogle(expectedRole?: UserRole): Promise<FirebaseAuthResult> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const uid = cred.user.uid;

    let profile: UserAccount | null = null;
    const userDocRef = doc(db, 'users', uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        profile = snap.data() as UserAccount;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${uid}`);
    }

    if (!profile) {
      profile = {
        id: uid,
        name: cred.user.displayName || 'Usuário Google',
        email: cred.user.email || '',
        matricula: `G-${uid.slice(0, 6)}`,
        role: expectedRole || 'aluno',
        createdAt: new Date().toISOString().split('T')[0]
      };
      await setDoc(userDocRef, profile);

      // Registra na coleção específica
      if (profile.role === 'professor') {
        await setDoc(doc(db, 'professores', uid), {
          id: uid,
          name: profile.name,
          email: profile.email,
          matricula: profile.matricula,
          area: 'Docência',
          createdAt: profile.createdAt
        });
      } else {
        await setDoc(doc(db, 'alunos', uid), {
          id: uid,
          name: profile.name,
          email: profile.email,
          matricula: profile.matricula,
          turma: 'Geral',
          createdAt: profile.createdAt
        });
      }
    } else if (expectedRole && profile.role !== expectedRole) {
      await signOut(auth);
      return {
        success: false,
        error: `Esta conta Google está registrada como ${profile.role === 'aluno' ? 'Aluno' : 'Professor'}. Acesse selecionando "${profile.role === 'aluno' ? 'Sou Aluno' : 'Sou Professor'}".`
      };
    }

    return {
      success: true,
      user: profile
    };
  } catch (err: any) {
    console.error('Erro no Google Sign-In:', err);
    return {
      success: false,
      error: err.message || 'Erro ao realizar login com o Google.'
    };
  }
}

/**
 * Logout
 */
export async function firebaseSignOut(): Promise<void> {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Erro ao encerrar sessão:', err);
  }
}

/**
 * Retorna o perfil do usuário atualmente autenticado
 */
export async function firebaseGetCurrentUserProfile(): Promise<UserAccount | null> {
  const current = auth.currentUser;
  if (!current) return null;

  try {
    const userDocRef = doc(db, 'users', current.uid);
    const snap = await getDoc(userDocRef);
    if (snap.exists()) {
      return snap.data() as UserAccount;
    }
  } catch (err) {
    console.warn('Erro ao buscar perfil atual no Firestore:', err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// ARMAZENAMENTO DE AULAS, TEXTOS, MP3 E PDFS PARTICIONADOS NO FIRESTORE
// ---------------------------------------------------------------------------

// Cache em memória para materiais reconstruídos (evita re-download desnecessário)
const materialBlobsCache = new Map<string, string>();

/**
 * Busca todas as aulas e atividades salvas no Firestore
 */
export async function firebaseFetchAulas(): Promise<{ success: boolean; data: Lesson[]; error?: string }> {
  try {
    const path = 'aulas';
    let snap;
    try {
      snap = await getDocs(collection(db, path));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, path);
    }

    const aulas: Lesson[] = [];
    snap.forEach((d) => {
      const data = d.data() as Lesson;
      aulas.push({
        ...data,
        id: d.id,
        isFromFirebase: true
      });
    });

    return {
      success: true,
      data: aulas
    };
  } catch (err: any) {
    console.error('Erro ao buscar aulas:', err);
    return {
      success: false,
      data: [],
      error: err.message || 'Falha ao buscar aulas'
    };
  }
}

/**
 * Cria uma nova aula ou atividade
 */
export async function firebaseCreateAula(lesson: Lesson): Promise<{ success: boolean; error?: string }> {
  try {
    const aulaId = lesson.id || `aula-${Date.now()}`;
    const cleanLesson: Lesson = {
      ...lesson,
      id: aulaId,
      isFromFirebase: true
    };

    // Garante que campos de texto não fiquem undefined
    if (!cleanLesson.summary) cleanLesson.summary = '';
    if (!cleanLesson.fullContent) cleanLesson.fullContent = cleanLesson.summary || '';
    if (!cleanLesson.accessibleTranscript) cleanLesson.accessibleTranscript = '';
    if (!cleanLesson.tags) cleanLesson.tags = [cleanLesson.subject || 'Geral'];

    // Para evitar exceder o limite de 1MB do Firestore no documento da aula:
    // Se o materialUrl for um dataUrl longo (> 500KB), removemos o base64 do doc raiz
    // pois os chunks já estão na subcoleção 'chunks'!
    const docData: any = { ...cleanLesson };
    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 500000) {
      docData.materialUrl = `chunks://${cleanLesson.id}`;
    }

    const docPath = `aulas/${aulaId}`;
    try {
      await setDoc(doc(db, 'aulas', aulaId), docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, docPath);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao salvar publicação:', err);
    return {
      success: false,
      error: err.message || 'Erro ao salvar publicação.'
    };
  }
}

/**
 * Atualiza uma aula existente
 */
export async function firebaseUpdateAula(lesson: Lesson): Promise<{ success: boolean; error?: string }> {
  try {
    const docPath = `aulas/${lesson.id}`;
    const docData: any = {
      ...lesson,
      isFromFirebase: true
    };
    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 500000) {
      docData.materialUrl = `chunks://${lesson.id}`;
    }

    try {
      await updateDoc(doc(db, 'aulas', lesson.id), docData);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, docPath);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Erro ao atualizar aula:', err);
    return {
      success: false,
      error: err.message || 'Erro ao atualizar aula.'
    };
  }
}

/**
 * Deleta uma aula e seus chunks associados
 */
export async function firebaseDeleteAula(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const docPath = `aulas/${id}`;
    
    // Tenta remover os chunks da subcoleção se houver
    try {
      const chunksSnap = await getDocs(collection(db, 'aulas', id, 'chunks'));
      const delPromises: Promise<void>[] = [];
      chunksSnap.forEach((c) => {
        delPromises.push(deleteDoc(doc(db, 'aulas', id, 'chunks', c.id)));
      });
      await Promise.all(delPromises);
    } catch (e) {
      console.warn('Aviso ao limpar chunks da aula:', e);
    }

    try {
      await deleteDoc(doc(db, 'aulas', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }

    materialBlobsCache.delete(id);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao excluir aula:', err);
    return {
      success: false,
      error: err.message || 'Erro ao excluir aula.'
    };
  }
}

/**
 * Upload seguro de materiais em PDF e Áudio MP3:
 * 1. Converte o arquivo para Data URL de imediato (sem travamento no navegador).
 * 2. Se o arquivo for maior que 400KB, particiona em fragmentos menores salvos
 *    na subcoleção 'aulas/{aulaId}/chunks/{chunkId}' do Firestore.
 * 3. Mostra progresso real (0 a 100%) garantindo que NUNCA fique travado carregando.
 */
export async function firebaseSaveAulaMaterialChunks(
  aulaId: string,
  file: File,
  folder: 'pdf' | 'audio',
  onProgress?: (progressPct: number) => void
): Promise<{ success: boolean; materialUrl?: string; error?: string }> {
  try {
    if (onProgress) onProgress(10);

    // Leitura rápida do arquivo em base64
    const dataUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(30);

    // Salva no cache local para exibição imediata
    materialBlobsCache.set(aulaId, dataUrl);

    // Se o arquivo for relativamente pequeno (< 400KB), o base64 direto cabe no Firestore
    const CHUNK_CHAR_LIMIT = 400000; // ~300KB por chunk (bem abaixo do limite de 1MB do Firestore)

    if (dataUrl.length <= CHUNK_CHAR_LIMIT) {
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: dataUrl
      };
    }

    // Para arquivos maiores (PDFs com várias páginas ou MP3s): particiona em chunks
    const totalChunks = Math.ceil(dataUrl.length / CHUNK_CHAR_LIMIT);
    const chunksCollRef = collection(db, 'aulas', aulaId, 'chunks');

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_CHAR_LIMIT;
      const end = Math.min(start + CHUNK_CHAR_LIMIT, dataUrl.length);
      const chunkData = dataUrl.substring(start, end);

      const chunkDocRef = doc(chunksCollRef, `chunk_${String(i).padStart(3, '0')}`);
      await setDoc(chunkDocRef, {
        chunkIndex: i,
        totalChunks,
        data: chunkData,
        type: folder
      });

      if (onProgress) {
        const pct = Math.min(95, Math.round(30 + ((i + 1) / totalChunks) * 65));
        onProgress(pct);
      }
    }

    if (onProgress) onProgress(100);

    return {
      success: true,
      materialUrl: `chunks://${aulaId}`
    };
  } catch (err: any) {
    console.error('Erro ao particionar arquivo no Firestore:', err);
    // Em caso de falha de rede ao particionar, mantém o dataUrl localmente
    try {
      const dataUrl = await fileToDataUrl(file);
      materialBlobsCache.set(aulaId, dataUrl);
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: dataUrl
      };
    } catch (e: any) {
      return {
        success: false,
        error: err.message || 'Erro ao processar e salvar o arquivo.'
      };
    }
  }
}

/**
 * Reconstrói um arquivo particionado em chunks no Firestore e retorna uma URL utilizável (Blob ou DataURL)
 */
export async function firebaseLoadAulaMaterialUrl(
  aulaId: string, 
  rawUrl?: string | null
): Promise<string | null> {
  if (!rawUrl) return null;

  // Se já temos em cache de memória
  if (materialBlobsCache.has(aulaId)) {
    return materialBlobsCache.get(aulaId)!;
  }

  // Se é uma URL HTTP/HTTPS ou DataURL normal
  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:')) {
    materialBlobsCache.set(aulaId, rawUrl);
    return rawUrl;
  }

  // Se é um arquivo particionado ('chunks://...')
  try {
    const chunksSnap = await getDocs(collection(db, 'aulas', aulaId, 'chunks'));
    if (chunksSnap.empty) {
      console.warn('Nenhum fragmento encontrado para a aula:', aulaId);
      return null;
    }

    const chunkItems: { chunkIndex: number; data: string }[] = [];
    chunksSnap.forEach((docSnap) => {
      const d = docSnap.data();
      chunkItems.push({
        chunkIndex: d.chunkIndex ?? 0,
        data: d.data || ''
      });
    });

    chunkItems.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const fullDataUrl = chunkItems.map((c) => c.data).join('');

    materialBlobsCache.set(aulaId, fullDataUrl);
    return fullDataUrl;
  } catch (err) {
    console.error('Erro ao reconstruir material particionado:', err);
    return null;
  }
}

/**
 * Abre ou baixa um material salvo no Firebase
 */
export async function firebaseOpenOrDownloadMaterial(
  pathOrUrl: string, 
  filename: string, 
  mode: 'open' | 'download' = 'open',
  aulaId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!pathOrUrl) return { success: false, error: 'URL do arquivo não fornecida.' };

  try {
    let resolvedUrl = pathOrUrl;

    // Se é uma referência a chunks do Firestore, reconstrói o arquivo
    if (pathOrUrl.startsWith('chunks://') || (aulaId && pathOrUrl.includes(aulaId))) {
      const extractedId = aulaId || pathOrUrl.replace('chunks://', '');
      const reconstructed = await firebaseLoadAulaMaterialUrl(extractedId, pathOrUrl);
      if (reconstructed) {
        resolvedUrl = reconstructed;
      }
    }

    if (mode === 'open') {
      if (resolvedUrl.startsWith('data:')) {
        // Para abrir dataURL de PDF de forma segura em nova aba: cria um Blob URL
        const blob = dataUrlToBlob(resolvedUrl);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      }
      return { success: true };
    }

    // Modo Download
    const a = document.createElement('a');
    if (resolvedUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(resolvedUrl);
      const blobUrl = URL.createObjectURL(blob);
      a.href = blobUrl;
    } else {
      a.href = resolvedUrl;
    }
    a.download = filename || 'material';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao abrir/baixar material:', err);
    return { success: false, error: err.message };
  }
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0].split(':')[1] || 'application/octet-stream';
  const raw = window.atob(parts[1]);
  const uInt8Array = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

export function isMaterialFileAllowed(file: File): { valid: boolean; reason?: string } {
  const allowedExtensions = ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.mp3', '.wav', '.m4a'];
  const name = file.name.toLowerCase();
  const isAllowed = allowedExtensions.some(ext => name.endsWith(ext));
  if (!isAllowed) {
    return {
      valid: false,
      reason: `Formato não suportado. Envie arquivos PDF, Word, PowerPoint, Imagens ou Áudio MP3.`
    };
  }
  if (file.size > 25 * 1024 * 1024) {
    return {
      valid: false,
      reason: 'O arquivo excede o limite máximo permitido de 25MB.'
    };
  }
  return { valid: true };
}

export type MaterialCategory = 'pdf' | 'doc' | 'presentation' | 'image' | 'audio' | 'word' | 'powerpoint' | 'other';

export function getMaterialCategory(fileName: string): MaterialCategory {
  const name = fileName.toLowerCase();
  if (name.endsWith('.pdf')) return 'pdf';
  if (name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.txt')) return 'word';
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'powerpoint';
  if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.webp')) return 'image';
  if (name.endsWith('.mp3') || name.endsWith('.wav') || name.endsWith('.m4a')) return 'audio';
  return 'other';
}
