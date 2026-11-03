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

export function isQuotaExceededError(error: unknown): boolean {
  if (!error) return false;
  const anyErr = error as any;
  if (anyErr?.code === 'resource-exhausted') return true;
  const str = anyErr?.message ? String(anyErr.message) : String(error);
  return (
    str.includes('resource-exhausted') ||
    str.includes('Quota limit exceeded') ||
    str.includes('Free daily write units per project') ||
    str.includes('quota metric')
  );
}

// Session flag that indicates if Firestore daily write quota is currently reached
export let isWriteQuotaExceeded = false;
export function setWriteQuotaExceeded(val: boolean) {
  isWriteQuotaExceeded = val;
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  if (isQuotaExceededError(error)) {
    isWriteQuotaExceeded = true;
    console.warn(`[Firestore Quota Exceeded]: Limite de cota diária gratuita do Firestore atingido na operação ${operationType} em ${path}. O sistema alternou automaticamente para persistência local.`);
  }

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
    if (isQuotaExceededError(error)) {
      console.warn("Cota gratuita diária do Firestore atingida para hoje.");
      return false;
    }
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn("Conexão com Firestore offline.");
    }
    return false;
  }
}

// ---------------------------------------------------------------------------
// CACHE LOCAL RESILIENTE PARA PERFIS E AULAS
// ---------------------------------------------------------------------------

export function saveLocalUserProfile(profile: UserAccount): void {
  try {
    localStorage.setItem(`ponte_user_${profile.id}`, JSON.stringify(profile));
    localStorage.setItem('ponte_current_user', JSON.stringify(profile));
  } catch (e) {
    console.warn('Erro ao salvar perfil localmente:', e);
  }
}

export function loadLocalUserProfile(uid?: string): UserAccount | null {
  try {
    if (uid) {
      const specific = localStorage.getItem(`ponte_user_${uid}`);
      if (specific) return JSON.parse(specific);
    }
    const current = localStorage.getItem('ponte_current_user');
    if (current) return JSON.parse(current);
  } catch {}
  return null;
}

export function saveLocalLesson(lesson: Lesson): void {
  try {
    const raw = localStorage.getItem('ponte_sistema_estudo_aulas');
    let list: Lesson[] = raw ? JSON.parse(raw) : [];
    const idx = list.findIndex(l => l.id === lesson.id);
    if (idx >= 0) {
      list[idx] = lesson;
    } else {
      list = [lesson, ...list];
    }
    localStorage.setItem('ponte_sistema_estudo_aulas', JSON.stringify(list));
  } catch (e) {
    console.warn('Erro ao salvar aula localmente:', e);
  }
}

export function loadLocalAulas(): Lesson[] {
  try {
    const raw = localStorage.getItem('ponte_sistema_estudo_aulas');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
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

    // Salva perfil no cache local
    saveLocalUserProfile(userProfile);

    // 1. Salva na coleção geral 'users' se a cota não estiver esgotada
    if (!isWriteQuotaExceeded) {
      try {
        await setDoc(doc(db, 'users', uid), userProfile);
      } catch (err) {
        if (isQuotaExceededError(err)) {
          isWriteQuotaExceeded = true;
          console.warn('Cota de gravação do Firestore atingida no cadastro. Usando persistência local.');
        } else {
          handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
        }
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
          if (isQuotaExceededError(err)) isWriteQuotaExceeded = true;
          console.warn('Aviso ao salvar em professores:', err);
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
          if (isQuotaExceededError(err)) isWriteQuotaExceeded = true;
          console.warn('Aviso ao salvar em alunos:', err);
        }
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
      if (isQuotaExceededError(err)) {
        console.warn('Cota de leitura do Firestore atingida, buscando perfil no cache local.');
        profile = loadLocalUserProfile(uid);
      } else {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    }

    // Se não existia perfil no users, checa coleções específicas ou cache local
    if (!profile) {
      profile = loadLocalUserProfile(uid);
    }

    if (!profile) {
      try {
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
          if (!isWriteQuotaExceeded) {
            await setDoc(userDocRef, profile).catch(() => {});
          }
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
            if (!isWriteQuotaExceeded) {
              await setDoc(userDocRef, profile).catch(() => {});
            }
          }
        }
      } catch (e) {
        console.warn('Aviso ao consultar coleções específicas:', e);
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
      if (!isWriteQuotaExceeded) {
        await setDoc(userDocRef, profile).catch(() => {});
      }
    }

    saveLocalUserProfile(profile);

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
      if (isQuotaExceededError(err)) {
        profile = loadLocalUserProfile(uid);
      } else {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }
    }

    if (!profile) {
      profile = loadLocalUserProfile(uid);
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
      if (!isWriteQuotaExceeded) {
        await setDoc(userDocRef, profile).catch(() => {});

        // Registra na coleção específica
        if (profile.role === 'professor') {
          await setDoc(doc(db, 'professores', uid), {
            id: uid,
            name: profile.name,
            email: profile.email,
            matricula: profile.matricula,
            area: 'Docência',
            createdAt: profile.createdAt
          }).catch(() => {});
        } else {
          await setDoc(doc(db, 'alunos', uid), {
            id: uid,
            name: profile.name,
            email: profile.email,
            matricula: profile.matricula,
            turma: 'Geral',
            createdAt: profile.createdAt
          }).catch(() => {});
        }
      }
    }

    saveLocalUserProfile(profile);

    if (expectedRole && profile.role !== expectedRole) {
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

import { signInAnonymously } from 'firebase/auth';

// Cache em memória para materiais reconstruídos (evita re-download desnecessário)
const materialBlobsCache = new Map<string, string>();

// Cache persistente em IndexedDB para grandes arquivos de áudio MP3 e documentos PDF
const IDB_NAME = 'ponte_media_db';
const IDB_STORE = 'files_cache';

function openMediaStoreDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(IDB_STORE)) {
          req.result.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function saveMediaCache(key: string, dataUrl: string): Promise<void> {
  try {
    materialBlobsCache.set(key, dataUrl);
    const idb = await openMediaStoreDB();
    if (!idb) return;
    const tx = idb.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(dataUrl, key);
  } catch (e) {
    console.warn('Cache local erro:', e);
  }
}

export async function loadMediaCache(key: string): Promise<string | null> {
  if (materialBlobsCache.has(key)) {
    return materialBlobsCache.get(key)!;
  }
  try {
    const idb = await openMediaStoreDB();
    if (!idb) return null;
    return new Promise((resolve) => {
      const tx = idb.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => {
        const val = req.result;
        if (val) materialBlobsCache.set(key, val);
        resolve(val || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Garante que a sessão do Firebase Auth esteja ativa (anônima se não autenticada)
 */
export async function ensureFirebaseAuth(): Promise<void> {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('Sessão anônima não inicializada:', e);
    }
  }
}

// Inicia autenticação em segundo plano para que as requisições ao Firestore nunca fiquem anônimas/bloqueadas
if (typeof window !== 'undefined') {
  ensureFirebaseAuth().catch(() => {});
}

/**
 * Busca todas as aulas e atividades salvas no Firestore ou no armazenamento local
 */
export async function firebaseFetchAulas(): Promise<{ success: boolean; data: Lesson[]; error?: string; isQuotaLimited?: boolean }> {
  try {
    const localAulas = loadLocalAulas();
    const path = 'aulas';
    let snap;
    try {
      snap = await getDocs(collection(db, path));
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        console.warn('Cota de leitura do Firestore atingida ou indisponível.');
        return {
          success: true,
          data: localAulas,
          isQuotaLimited: true
        };
      }
      handleFirestoreError(err, OperationType.LIST, path);
    }

    const firestoreAulas: Lesson[] = [];
    if (snap) {
      snap.forEach((d) => {
        const data = d.data() as Lesson;
        firestoreAulas.push({
          ...data,
          id: d.id,
          isFromFirebase: true
        });
      });
    }

    // Merge seguro: preserva aulas salvas localmente caso o Firestore esteja sob limite de cota
    const mergedMap = new Map<string, Lesson>();
    localAulas.forEach((l) => mergedMap.set(l.id, l));
    firestoreAulas.forEach((l) => mergedMap.set(l.id, l));

    const finalAulas = Array.from(mergedMap.values());
    try {
      localStorage.setItem('ponte_sistema_estudo_aulas', JSON.stringify(finalAulas));
    } catch {}

    return {
      success: true,
      data: finalAulas
    };
  } catch (err: any) {
    console.error('Erro ao buscar aulas:', err);
    return {
      success: true,
      data: loadLocalAulas(),
      error: err.message || 'Falha ao buscar aulas'
    };
  }
}

/**
 * Cria uma nova aula ou atividade com fallback automático caso a cota do Firestore esteja esgotada
 */
export async function firebaseCreateAula(lesson: Lesson): Promise<{ success: boolean; isLocalFallback?: boolean; warning?: string; error?: string }> {
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

    // Salva localmente de imediato
    saveLocalLesson(cleanLesson);

    const sanitizedPdfFiles = (cleanLesson.pdfFiles || []).map((pdf, idx) => {
      if (pdf.dataUrl && pdf.dataUrl.startsWith('data:') && pdf.dataUrl.length > 200000) {
        const ref = `chunks://${cleanLesson.id}/pdf_${idx}`;
        saveMediaCache(ref, pdf.dataUrl);
        saveMediaCache(`chunks://${cleanLesson.id}/pdf`, pdf.dataUrl);
        return {
          ...pdf,
          dataUrl: ref,
          pathOrUrl: ref
        };
      }
      return pdf;
    });

    const sanitizedMp3Lessons = (cleanLesson.mp3Lessons || []).map((mp3, idx) => {
      if (mp3.dataUrl && mp3.dataUrl.startsWith('data:')) {
        const ref = `chunks://${cleanLesson.id}/audio_${idx}`;
        saveMediaCache(ref, mp3.dataUrl);
        saveMediaCache(`chunks://${cleanLesson.id}/audio`, mp3.dataUrl);
        if (mp3.fileName) saveMediaCache(mp3.fileName, mp3.dataUrl);
        if (mp3.dataUrl.length > 200000) {
          return {
            ...mp3,
            dataUrl: ref
          };
        }
      }
      return mp3;
    });

    const docData: any = { 
      ...cleanLesson,
      pdfFiles: sanitizedPdfFiles,
      mp3Lessons: sanitizedMp3Lessons
    };

    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 200000) {
      saveMediaCache(`chunks://${cleanLesson.id}/pdf`, docData.materialUrl);
      docData.materialUrl = `chunks://${cleanLesson.id}/pdf`;
    }

    // Se a cota diária de gravação já estiver excedida, evita chamadas ao backend para não gerar backoff delay
    if (isWriteQuotaExceeded) {
      return { 
        success: true, 
        isLocalFallback: true, 
        warning: 'Cota diária gratuita do Firestore atingida. A aula foi salva no dispositivo e sincronizará quando a cota resetar.' 
      };
    }

    const docPath = `aulas/${aulaId}`;
    try {
      await setDoc(doc(db, 'aulas', aulaId), docData);
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        isWriteQuotaExceeded = true;
        console.warn('Firestore write quota exceeded ao criar aula, utilizando persistência local.');
        return { 
          success: true, 
          isLocalFallback: true, 
          warning: 'Cota diária gratuita do Firestore atingida. A aula foi salva no dispositivo e sincronizarará quando a cota resetar.' 
        };
      }
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
export async function firebaseUpdateAula(lesson: Lesson): Promise<{ success: boolean; isLocalFallback?: boolean; warning?: string; error?: string }> {
  try {
    saveLocalLesson(lesson);

    if (isWriteQuotaExceeded) {
      return { 
        success: true, 
        isLocalFallback: true, 
        warning: 'Cota diária gratuita do Firestore atingida. Alterações salvas no dispositivo.' 
      };
    }

    const docPath = `aulas/${lesson.id}`;

    const sanitizedPdfFiles = (lesson.pdfFiles || []).map((pdf, idx) => {
      if (pdf.dataUrl && pdf.dataUrl.startsWith('data:') && pdf.dataUrl.length > 200000) {
        const ref = `chunks://${lesson.id}/pdf_${idx}`;
        saveMediaCache(ref, pdf.dataUrl);
        saveMediaCache(`chunks://${lesson.id}/pdf`, pdf.dataUrl);
        return {
          ...pdf,
          dataUrl: ref,
          pathOrUrl: ref
        };
      }
      return pdf;
    });

    const sanitizedMp3Lessons = (lesson.mp3Lessons || []).map((mp3, idx) => {
      if (mp3.dataUrl && mp3.dataUrl.startsWith('data:')) {
        const ref = `chunks://${lesson.id}/audio_${idx}`;
        saveMediaCache(ref, mp3.dataUrl);
        saveMediaCache(`chunks://${lesson.id}/audio`, mp3.dataUrl);
        if (mp3.fileName) saveMediaCache(mp3.fileName, mp3.dataUrl);
        if (mp3.dataUrl.length > 200000) {
          return {
            ...mp3,
            dataUrl: ref
          };
        }
      }
      return mp3;
    });

    const docData: any = {
      ...lesson,
      pdfFiles: sanitizedPdfFiles,
      mp3Lessons: sanitizedMp3Lessons,
      isFromFirebase: true
    };
    if (docData.materialUrl && docData.materialUrl.startsWith('data:') && docData.materialUrl.length > 200000) {
      saveMediaCache(`chunks://${lesson.id}/pdf`, docData.materialUrl);
      docData.materialUrl = `chunks://${lesson.id}/pdf`;
    }

    try {
      await updateDoc(doc(db, 'aulas', lesson.id), docData);
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        isWriteQuotaExceeded = true;
        console.warn('Firestore write quota exceeded ao atualizar aula, alterações salvas localmente.');
        return { 
          success: true, 
          isLocalFallback: true, 
          warning: 'Cota diária gratuita do Firestore atingida. Alterações salvas no dispositivo.' 
        };
      }
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
    // Remove localmente primeiro
    try {
      const local = loadLocalAulas();
      const filtered = local.filter((l) => l.id !== id);
      localStorage.setItem('ponte_sistema_estudo_aulas', JSON.stringify(filtered));
    } catch {}

    materialBlobsCache.delete(id);

    if (isWriteQuotaExceeded) {
      return { success: true };
    }

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
    } catch (err: any) {
      if (isQuotaExceededError(err)) {
        isWriteQuotaExceeded = true;
        return { success: true };
      }
      handleFirestoreError(err, OperationType.DELETE, docPath);
    }

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
 * 2. Salva imediatamente no IndexedDB e no cache em memória.
 * 3. Se a cota permitir e o arquivo for leve, particiona em fragmentos menores no Firestore.
 */
export async function firebaseSaveAulaMaterialChunks(
  aulaId: string,
  file: File,
  folder: 'pdf' | 'audio',
  onProgress?: (progressPct: number) => void,
  customPrefix?: string
): Promise<{ success: boolean; materialUrl?: string; dataUrl?: string; error?: string }> {
  try {
    if (onProgress) onProgress(15);

    // Leitura rápida do arquivo em base64 DataURL
    const dataUrl = await fileToDataUrl(file);
    if (onProgress) onProgress(45);

    const prefix = customPrefix || (folder === 'audio' ? 'audio' : 'pdf');
    const referenceUrl = `chunks://${aulaId}/${prefix}`;

    // Salva no cache local de memória e no IndexedDB imediatamente para nunca falhar reprodução
    await saveMediaCache(referenceUrl, dataUrl);
    await saveMediaCache(`${aulaId}/${prefix}`, dataUrl);
    await saveMediaCache(aulaId, dataUrl);
    await saveMediaCache(file.name, dataUrl);

    if (onProgress) onProgress(75);

    // Se a cota de gravação estiver excedida ou se o arquivo for volumoso (>600KB),
    // NÃO gera dezenas de escritas no Firestore, evitando esgotar a cota gratuita diária de 20.000 gravações
    if (isWriteQuotaExceeded || dataUrl.length > 600000) {
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: referenceUrl,
        dataUrl
      };
    }

    try {
      const CHUNK_CHAR_LIMIT = 500000;
      const totalChunks = Math.ceil(dataUrl.length / CHUNK_CHAR_LIMIT);
      const chunksCollRef = collection(db, 'aulas', aulaId, 'chunks');

      const BATCH_SIZE = 4;
      for (let b = 0; b < totalChunks; b += BATCH_SIZE) {
        const batchPromises: Promise<any>[] = [];
        const endBatch = Math.min(b + BATCH_SIZE, totalChunks);

        for (let i = b; i < endBatch; i++) {
          const start = i * CHUNK_CHAR_LIMIT;
          const end = Math.min(start + CHUNK_CHAR_LIMIT, dataUrl.length);
          const chunkData = dataUrl.substring(start, end);

          const chunkDocRef = doc(chunksCollRef, `${prefix}_chunk_${String(i).padStart(3, '0')}`);
          batchPromises.push(
            setDoc(chunkDocRef, {
              prefix,
              chunkIndex: i,
              totalChunks,
              data: chunkData,
              type: folder,
              fileName: file.name,
              mimeType: file.type || (folder === 'pdf' ? 'application/pdf' : 'audio/mpeg')
            })
          );
        }

        await Promise.all(batchPromises);

        if (onProgress) {
          const pct = Math.min(98, Math.round(75 + (endBatch / totalChunks) * 23));
          onProgress(pct);
        }
      }
    } catch (writeErr: any) {
      if (isQuotaExceededError(writeErr)) {
        isWriteQuotaExceeded = true;
        console.warn('Firestore write quota exceeded durante upload de chunks, utilizando cache IndexedDB.');
      } else {
        console.warn('Aviso durante particionamento:', writeErr);
      }
    }

    if (onProgress) onProgress(100);

    return {
      success: true,
      materialUrl: referenceUrl,
      dataUrl
    };
  } catch (err: any) {
    console.warn('Aviso ao particionar, preservando cache local:', err);
    try {
      const dataUrl = await fileToDataUrl(file);
      const prefix = customPrefix || (folder === 'audio' ? 'audio' : 'pdf');
      const referenceUrl = `chunks://${aulaId}/${prefix}`;
      await saveMediaCache(referenceUrl, dataUrl);
      await saveMediaCache(file.name, dataUrl);
      if (onProgress) onProgress(100);
      return {
        success: true,
        materialUrl: referenceUrl,
        dataUrl
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
 * Reconstrói um arquivo particionado em chunks no Firestore e retorna uma URL utilizável (DataURL ou Blob URL)
 */
export async function firebaseLoadAulaMaterialUrl(
  aulaId: string, 
  rawUrl?: string | null
): Promise<string | null> {
  const searchKey = rawUrl || aulaId;
  if (!searchKey) return null;

  // 1. Se já temos em cache de memória ou IndexedDB
  const cached = await loadMediaCache(searchKey);
  if (cached) return cached;

  const cachedByAula = await loadMediaCache(aulaId);
  if (cachedByAula) return cachedByAula;

  // 2. Se é uma URL HTTP/HTTPS ou DataURL ou BlobURL normal
  if (
    searchKey.startsWith('http://') || 
    searchKey.startsWith('https://') || 
    searchKey.startsWith('data:') ||
    searchKey.startsWith('blob:')
  ) {
    await saveMediaCache(searchKey, searchKey);
    return searchKey;
  }

  // 3. Extrai o ID limpo da aula e o prefixo (pdf ou audio)
  let cleanId = aulaId.replace('chunks://', '').trim();
  let targetPrefix: string | null = null;

  if (cleanId.includes('/')) {
    const parts = cleanId.split('/');
    cleanId = parts[0];
    targetPrefix = parts[1];
  } else if (rawUrl && rawUrl.includes('/')) {
    const parts = rawUrl.replace('chunks://', '').split('/');
    if (parts.length > 1) {
      cleanId = parts[0];
      targetPrefix = parts[1];
    }
  }

  // Se houver no cache com a chave limpa
  if (targetPrefix) {
    const cachedCombined = await loadMediaCache(`${cleanId}/${targetPrefix}`);
    if (cachedCombined) return cachedCombined;
  }

  // 4. Busca os fragmentos no Firestore
  try {
    const chunksSnap = await getDocs(collection(db, 'aulas', cleanId, 'chunks'));
    if (chunksSnap.empty) {
      console.warn('Nenhum fragmento encontrado para a aula:', cleanId);
      return null;
    }

    const chunkItems: { chunkIndex: number; data: string; mimeType?: string }[] = [];
    chunksSnap.forEach((docSnap) => {
      const d = docSnap.data();
      const docId = docSnap.id;

      if (targetPrefix) {
        if (d.prefix === targetPrefix || docId.startsWith(`${targetPrefix}_`)) {
          chunkItems.push({
            chunkIndex: d.chunkIndex ?? 0,
            data: d.data || '',
            mimeType: d.mimeType
          });
        }
      } else {
        chunkItems.push({
          chunkIndex: d.chunkIndex ?? 0,
          data: d.data || '',
          mimeType: d.mimeType
        });
      }
    });

    // Se filtrou por prefix e não achou, mas há chunks (retrocompatibilidade)
    if (chunkItems.length === 0 && !chunksSnap.empty) {
      chunksSnap.forEach((docSnap) => {
        const d = docSnap.data();
        chunkItems.push({
          chunkIndex: d.chunkIndex ?? 0,
          data: d.data || '',
          mimeType: d.mimeType
        });
      });
    }

    chunkItems.sort((a, b) => a.chunkIndex - b.chunkIndex);
    const fullDataUrl = chunkItems.map((c) => c.data).join('');

    if (!fullDataUrl) {
      return null;
    }

    // Salva no IndexedDB imediatamente para uso futuro instantâneo
    await saveMediaCache(searchKey, fullDataUrl);
    await saveMediaCache(cleanId, fullDataUrl);
    if (targetPrefix) {
      await saveMediaCache(`${cleanId}/${targetPrefix}`, fullDataUrl);
    }

    // Se for áudio, retorna o dataURL diretamente para o elemento <audio> tocar nativamente
    if (targetPrefix?.includes('audio') || fullDataUrl.startsWith('data:audio/')) {
      return fullDataUrl;
    }

    // Para PDFs e outros documentos, cria o Blob URL
    try {
      const blob = dataUrlToBlob(fullDataUrl);
      const blobUrl = URL.createObjectURL(blob);
      materialBlobsCache.set(searchKey, blobUrl);
      materialBlobsCache.set(cleanId, blobUrl);
      return blobUrl;
    } catch {
      return fullDataUrl;
    }
  } catch (err) {
    console.error('Erro ao reconstruir material particionado:', err);
    return null;
  }
}

/**
 * Abre ou baixa um material salvo no Firebase com segurança total contra falhas de atob
 */
export async function firebaseOpenOrDownloadMaterial(
  pathOrUrl: string, 
  filename: string, 
  mode: 'open' | 'download' = 'open',
  aulaId?: string
): Promise<{ success: boolean; error?: string }> {
  if (!pathOrUrl) {
    return { success: false, error: 'URL do arquivo não fornecida.' };
  }

  try {
    let resolvedUrl = pathOrUrl;

    // Se é uma referência a chunks do Firestore, reconstrói o arquivo
    if (pathOrUrl.startsWith('chunks://') || (aulaId && pathOrUrl.includes(aulaId))) {
      const extractedId = aulaId || pathOrUrl.replace('chunks://', '');
      const reconstructed = await firebaseLoadAulaMaterialUrl(extractedId, pathOrUrl);
      if (reconstructed) {
        resolvedUrl = reconstructed;
      } else {
        return { 
          success: false, 
          error: 'Material ainda não sincronizado ou fragmentos não encontrados no banco de dados.' 
        };
      }
    }

    if (mode === 'open') {
      if (resolvedUrl.startsWith('data:')) {
        const blob = dataUrlToBlob(resolvedUrl);
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, '_blank', 'noopener,noreferrer');
      } else {
        window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
      }
      return { success: true };
    }

    // Modo Download
    let downloadHref = resolvedUrl;
    let tempBlobUrl: string | null = null;

    if (resolvedUrl.startsWith('data:')) {
      const blob = dataUrlToBlob(resolvedUrl);
      tempBlobUrl = URL.createObjectURL(blob);
      downloadHref = tempBlobUrl;
    }

    const a = document.createElement('a');
    a.href = downloadHref;
    a.download = filename || 'material';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    if (tempBlobUrl) {
      setTimeout(() => URL.revokeObjectURL(tempBlobUrl!), 10000);
    }
    return { success: true };
  } catch (err: any) {
    console.error('Erro ao abrir/baixar material:', err);
    return { success: false, error: err.message || 'Erro ao processar o download do arquivo.' };
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

/**
 * Converte dataUrl base64 em Blob com tratamento total de erros,
 * limpeza de caracteres de espaço, correção de padding '=' e fallbacks resilientes.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl) {
    return new Blob([], { type: 'application/octet-stream' });
  }

  // Se já for uma URL HTTP ou Blob URL
  if (dataUrl.startsWith('blob:') || dataUrl.startsWith('http:') || dataUrl.startsWith('https:')) {
    return new Blob([], { type: 'application/octet-stream' });
  }

  let mimeType = 'application/octet-stream';
  let base64Part = dataUrl;

  if (dataUrl.includes(',')) {
    const parts = dataUrl.split(',');
    const header = parts[0];
    const mimeMatch = header.match(/:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      mimeType = mimeMatch[1];
    }
    base64Part = parts[1] || '';
  }

  // Remove quebras de linha e espaços em branco que quebram o atob nativo
  base64Part = base64Part.trim().replace(/\s/g, '');

  // Ajusta preenchimento de Base64 se estiver incompleto (múltiplo de 4)
  const remainder = base64Part.length % 4;
  if (remainder === 2) {
    base64Part += '==';
  } else if (remainder === 3) {
    base64Part += '=';
  } else if (remainder === 1) {
    // Trunca caractere solto inválido
    base64Part = base64Part.slice(0, -1);
  }

  try {
    const binary = window.atob(base64Part);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType });
  } catch (err) {
    console.warn('Falha no window.atob, gerando fallback de dados:', err);
    try {
      const decoded = decodeURIComponent(escape(base64Part));
      return new Blob([decoded], { type: mimeType });
    } catch {
      return new Blob([base64Part], { type: mimeType });
    }
  }
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
